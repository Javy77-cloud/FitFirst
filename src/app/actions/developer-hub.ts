"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { executeFunctionByApiName } from "@/lib/developer-hub/function-execute";
import {
  macroTargetsModule,
  parseMacroActions,
  parseMacroKind,
  validateMacroActions,
} from "@/lib/developer-hub/macros";
import { mergeTokens, type MergeRecord } from "@/lib/developer-hub/merge";
import { parseJsonInput } from "@/lib/developer-hub/runner";
import { applyMacroToRecords } from "@/lib/developer-hub/run-macro";
import { flashAction } from "@/lib/flash-action";
import {
  createDeveloperConnection,
  createDeveloperFunction,
  createDeveloperWebhook,
  createInboundHook,
  createOrgApiKey,
  deleteDeveloperConnection,
  deleteDeveloperFunction,
  deleteDeveloperWebhook,
  deleteInboundHook,
  executeDeveloperFunction,
  getDeveloperFunction,
  getDeveloperWebhook,
  regenerateOrgApiKey,
  revokeOrgApiKey,
  sendWebhookTest,
  updateDeveloperConnection,
  updateDeveloperFunction,
  updateDeveloperWebhook,
} from "@/lib/developer-hub/store";
import {
  isButtonActionKind,
  isButtonPlacement,
  isDevHubModule,
  isMacroStage,
  isScriptEvent,
  isScriptPage,
  isWidgetHosting,
  isWidgetType,
  type ButtonPlacement,
  type DevHubModule,
  type MacroActions,
  type MacroCreateTask,
  type MacroFieldUpdate,
  type VisibilityProfile,
} from "@/lib/developer-hub/types";
import { db } from "@/lib/db";
import {
  getDeskButton,
  getDeskMacro,
  getDeskWidget,
  listDeskWidgets,
} from "@/lib/db/developer-hub-queries";
import {
  accounts,
  contacts,
  deals,
  deskClientScripts,
  deskCustomButtons,
  deskMacroRuns,
  deskMacros,
  deskWidgets,
  leads,
  policies,
  reviewTasks,
} from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function bool(form: FormData, key: string) {
  const raw = form.get(key);
  return raw === "on" || raw === "1" || raw === "true";
}

function refreshHub(extra: string[] = []) {
  for (const path of [
    "/automations",
    "/automations/macros",
    "/automations/functions",
    "/automations/webhooks",
    "/automations/api-keys",
    "/automations/buttons",
    "/automations/custom-buttons",
    "/automations/client-scripts",
    "/automations/connections",
    "/automations/playbooks",
    "/settings",
    "/settings/developer",
    "/settings/developer-hub",
    "/settings/developer-hub/macros",
    "/settings/developer-hub/custom-buttons",
    "/settings/developer-hub/client-scripts",
    "/settings/developer-hub/widgets",
    "/leads",
    "/contacts",
    "/deals",
    "/policies",
    "/tasks",
    ...extra,
  ]) {
    revalidatePath(path);
  }
}

function parseFieldUpdates(form: FormData): MacroFieldUpdate[] {
  const updates: MacroFieldUpdate[] = [];
  for (let i = 0; i < 3; i += 1) {
    const field = str(form, `updateField${i}`);
    const value = str(form, `updateValue${i}`);
    if (field) updates.push({ field, value });
  }
  return updates;
}

function parseCreateTasks(form: FormData): MacroCreateTask[] {
  const tasks: MacroCreateTask[] = [];
  for (let i = 0; i < 3; i += 1) {
    const title = str(form, `taskTitle${i}`);
    if (!title) continue;
    const dueRaw = str(form, `taskDue${i}`);
    const dueInDays = dueRaw ? Number(dueRaw) : 3;
    tasks.push({
      title,
      kind: str(form, `taskKind${i}`) || "macro",
      dueInDays: Number.isFinite(dueInDays) ? dueInDays : 3,
    });
  }
  return tasks;
}

function parseActionsFromForm(form: FormData): MacroActions {
  const templateId = str(form, "emailTemplateId") || null;
  const subject = str(form, "emailSubject");
  const body = str(form, "emailBody");
  const stage = str(form, "stageMove");
  return parseMacroActions({
    email: templateId || subject || body ? { templateId, subject, body } : null,
    fieldUpdates: parseFieldUpdates(form),
    createTasks: parseCreateTasks(form),
    stageMove: stage && isMacroStage(stage) ? { stage } : null,
  });
}

function parseModulesFromForm(form: FormData): DevHubModule[] {
  const selected = form
    .getAll("modules")
    .map((value) => String(value))
    .filter(isDevHubModule);
  const legacy = str(form, "module");
  if (selected.length) return [...new Set(selected)];
  return isDevHubModule(legacy) ? [legacy] : [];
}

export async function saveDeveloperFunction(formData: FormData) {
  const session = await requireAdminAction();
  const id = str(formData, "id");
  const payload = {
    name: str(formData, "name"),
    apiName: str(formData, "apiName"),
    description: str(formData, "description"),
    language: str(formData, "language"),
    category: str(formData, "category"),
    body: String(formData.get("body") ?? ""),
    exposeAsRest: bool(formData, "exposeAsRest"),
    exposeAsOauth: bool(formData, "exposeAsOauth"),
    connectionLinkName: str(formData, "connectionLinkName") || null,
  };
  try {
    if (id) {
      const row = await updateDeveloperFunction(id, payload);
      if (!row) redirect("/automations/functions?error=missing");
      refreshHub([`/automations/functions/${id}`]);
      flashAction(`/automations/functions/${id}`, "function-saved");
    }
    const row = await createDeveloperFunction({ ...payload, createdBy: session.userId });
    refreshHub();
    redirect(`/automations/functions/${row.id}?notice=created`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/automations/functions?error=save");
  }
}

export async function removeDeveloperFunction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteDeveloperFunction(id);
  refreshHub();
  redirect("/automations/functions?notice=deleted");
}

export async function runDeveloperFunctionTest(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const fn = id ? await getDeveloperFunction(id) : null;
  if (!fn) redirect("/automations/functions?error=missing");
  const input = parseJsonInput(String(formData.get("input") ?? ""));
  await executeDeveloperFunction({ fn, input, source: "test" });
  refreshHub([`/automations/functions/${id}`]);
  redirect(`/automations/functions/${id}?notice=ran`);
}

export async function issueOrgApiKey(formData: FormData) {
  const session = await requireAdminAction();
  const { key, secret } = await createOrgApiKey(str(formData, "name"), session.userId);
  refreshHub();
  redirect(
    `/automations/api-keys?notice=created&keyId=${encodeURIComponent(key.id)}&secret=${encodeURIComponent(secret)}`,
  );
}

export async function rotateOrgApiKey(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const rotated = id ? await regenerateOrgApiKey(id) : null;
  if (!rotated) redirect("/automations/api-keys?error=missing");
  refreshHub();
  redirect(
    `/automations/api-keys?notice=regenerated&keyId=${encodeURIComponent(rotated.key.id)}&secret=${encodeURIComponent(rotated.secret)}`,
  );
}

export async function retireOrgApiKey(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await revokeOrgApiKey(id);
  refreshHub();
  redirect("/automations/api-keys?notice=revoked");
}

export async function saveDeveloperWebhook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const payload = {
    name: str(formData, "name"),
    event: str(formData, "event"),
    targetUrl: str(formData, "targetUrl"),
    secret: str(formData, "secret"),
    enabled: bool(formData, "enabled"),
  };
  try {
    if (id) {
      const row = await updateDeveloperWebhook(id, payload);
      if (!row) redirect("/automations/webhooks?error=missing");
      refreshHub([`/automations/webhooks/${id}`]);
      flashAction(`/automations/webhooks/${id}`, "webhook-saved");
    }
    const row = await createDeveloperWebhook(payload);
    refreshHub();
    redirect(`/automations/webhooks/${row.id}?notice=created`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/automations/webhooks?error=save");
  }
}

export async function removeDeveloperWebhook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteDeveloperWebhook(id);
  refreshHub();
  redirect("/automations/webhooks?notice=deleted");
}

export async function testDeveloperWebhook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const hook = id ? await getDeveloperWebhook(id) : null;
  if (!hook) redirect("/automations/webhooks?error=missing");
  const delivery = await sendWebhookTest(hook);
  const status = delivery?.status ?? "pending";
  refreshHub([`/automations/webhooks/${id}`]);
  redirect(`/automations/webhooks/${id}?notice=test&status=${encodeURIComponent(status)}`);
}

export async function saveInboundHook(formData: FormData) {
  await requireAdminAction();
  try {
    await createInboundHook(str(formData, "name"), str(formData, "slug"));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/automations/webhooks?error=inbound");
  }
  refreshHub();
  redirect("/automations/webhooks?notice=inbound");
}

export async function removeInboundHook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteInboundHook(id);
  refreshHub();
  redirect("/automations/webhooks?notice=inbound-deleted");
}

export async function saveDeveloperConnection(formData: FormData) {
  const session = await requireAdminAction();
  const id = str(formData, "id");
  const payload = {
    name: str(formData, "name"),
    linkName: str(formData, "linkName"),
    kind: str(formData, "kind"),
    status: str(formData, "status"),
    clientId: str(formData, "clientId"),
    clientSecret: str(formData, "clientSecret"),
    notes: str(formData, "notes"),
  };
  try {
    if (id) {
      const row = await updateDeveloperConnection(id, payload);
      if (!row) redirect("/automations/connections?error=missing");
      refreshHub([`/automations/connections/${id}`]);
      flashAction(`/automations/connections/${id}`, "connector-saved");
    }
    const row = await createDeveloperConnection({ ...payload, createdBy: session.userId });
    refreshHub();
    redirect(`/automations/connections/${row.id}?notice=created`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/automations/connections?error=save");
  }
}

export async function removeDeveloperConnection(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteDeveloperConnection(id);
  refreshHub();
  redirect("/automations/connections?notice=deleted");
}

export async function saveDeskMacro(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const modules = parseModulesFromForm(formData);
  const module = modules[0];
  if (!module) throw new Error("Pick at least one target module.");
  const actions = parseActionsFromForm(formData);
  const checked = validateMacroActions(modules, actions);
  if (!checked.ok) throw new Error(checked.error);
  const values = {
    module,
    modules,
    kind: parseMacroKind(str(formData, "kind")),
    name: str(formData, "name") || "Untitled macro",
    description: str(formData, "description") || null,
    enabled: bool(formData, "enabled"),
    actions: checked.actions,
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db
      .update(deskMacros)
      .set(values)
      .where(and(eq(deskMacros.tenantId, DEFAULT_TENANT_ID), eq(deskMacros.id, id)));
    refreshHub([`/automations/macros/${id}`, `/settings/developer-hub/macros/${id}`]);
    flashAction(`/settings/developer-hub/macros/${id}`, "macro-saved");
  }
  const [created] = await db
    .insert(deskMacros)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskMacros.id });
  refreshHub([`/automations/macros/${created.id}`, `/settings/developer-hub/macros/${created.id}`]);
  flashAction(`/settings/developer-hub/macros/${created.id}`, "macro-saved");
}

export async function deleteDeskMacro(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) throw new Error("Missing macro.");
  await db.delete(deskMacroRuns).where(and(eq(deskMacroRuns.tenantId, DEFAULT_TENANT_ID), eq(deskMacroRuns.macroId, id)));
  await db.delete(deskMacros).where(and(eq(deskMacros.tenantId, DEFAULT_TENANT_ID), eq(deskMacros.id, id)));
  refreshHub();
  redirect("/settings/developer-hub/macros?notice=deleted");
}

export async function runDeskMacro(formData: FormData): Promise<{ ok: boolean; summary: string }> {
  const session = await requireSignedInAction();
  const macroId = str(formData, "macroId");
  const moduleRaw = str(formData, "module");
  const recordIds = formData
    .getAll("recordId")
    .map((value) => String(value))
    .filter(Boolean);
  if (!isUuid(macroId) || !isDevHubModule(moduleRaw)) {
    return { ok: false, summary: "Pick a macro and at least one record." };
  }
  const macro = await getDeskMacro(macroId);
  if (!macro || !macro.enabled) return { ok: false, summary: "That macro is off or missing." };
  if (!macroTargetsModule(macro.module, macro.modules, moduleRaw)) {
    return { ok: false, summary: "Macro module does not match the list." };
  }
  const result = await applyMacroToRecords({
    module: moduleRaw,
    actions: parseMacroActions(macro.actions),
    recordIds,
    ranBy: session.userId,
  });
  await db.insert(deskMacroRuns).values({
    tenantId: DEFAULT_TENANT_ID,
    macroId: macro.id,
    module: moduleRaw,
    recordIds,
    summary: result.summary,
    ranBy: session.userId,
  });
  refreshHub(recordIds.flatMap((id) => modulePaths(moduleRaw, id)));
  return { ok: result.ran > 0 || result.skippedAna > 0, summary: result.summary };
}

export async function saveDeskButton(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const module = str(formData, "module");
  const placement = str(formData, "placement");
  const actionKind = str(formData, "actionKind");
  if (!isDevHubModule(module) || !isButtonPlacement(placement) || !isButtonActionKind(actionKind)) {
    throw new Error("Button module, placement, or action is invalid.");
  }
  const profiles = formData
    .getAll("visibility")
    .map((value) => String(value))
    .filter((value): value is VisibilityProfile => value === "admin" || value === "agent");
  const widgetIdRaw = str(formData, "widgetId");
  const values = {
    module,
    placement,
    label: str(formData, "label") || "Untitled button",
    visibilityProfiles: profiles.length ? profiles : (["admin", "agent"] as VisibilityProfile[]),
    actionKind,
    functionApiName: str(formData, "functionApiName") || null,
    urlTemplate: str(formData, "urlTemplate") || null,
    widgetId: widgetIdRaw && isUuid(widgetIdRaw) ? widgetIdRaw : null,
    enabled: bool(formData, "enabled"),
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db
      .update(deskCustomButtons)
      .set(values)
      .where(and(eq(deskCustomButtons.tenantId, DEFAULT_TENANT_ID), eq(deskCustomButtons.id, id)));
    refreshHub([`/automations/buttons/${id}`, `/settings/developer-hub/custom-buttons/${id}`]);
    flashAction(`/settings/developer-hub/custom-buttons/${id}`, "button-saved");
  }
  const [created] = await db
    .insert(deskCustomButtons)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskCustomButtons.id });
  refreshHub();
  flashAction(`/settings/developer-hub/custom-buttons/${created.id}`, "button-saved");
}

export async function deleteDeskButton(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) throw new Error("Missing button.");
  await db
    .delete(deskCustomButtons)
    .where(and(eq(deskCustomButtons.tenantId, DEFAULT_TENANT_ID), eq(deskCustomButtons.id, id)));
  refreshHub();
  redirect("/settings/developer-hub/custom-buttons?notice=deleted");
}

export async function clickDeskButton(formData: FormData): Promise<{
  ok: boolean;
  kind: "function" | "url" | "widget" | "error";
  message: string;
  url?: string;
  widgetId?: string;
  widgetName?: string;
  widgetUrl?: string | null;
}> {
  await requireSignedInAction();
  const buttonId = str(formData, "buttonId");
  const recordId = str(formData, "recordId");
  if (!isUuid(buttonId)) return { ok: false, kind: "error", message: "Missing button." };
  const button = await getDeskButton(buttonId);
  if (!button || !button.enabled) return { ok: false, kind: "error", message: "That button is off." };
  const record = recordId ? await loadMergeRecord(button.module as DevHubModule, recordId) : null;

  if (button.actionKind === "url") {
    const template = button.urlTemplate || "";
    const url = record ? mergeTokens(template, record) : template;
    return { ok: true, kind: "url", message: "Opening URL.", url };
  }

  if (button.actionKind === "widget") {
    const widget = button.widgetId ? await getDeskWidget(button.widgetId) : null;
    const fallback = (await listDeskWidgets()).find((row) => row.type === "custom_button" || row.type === "related_list");
    const chosen = widget ?? fallback ?? null;
    return {
      ok: Boolean(chosen),
      kind: "widget",
      message: chosen ? `Opened ${chosen.name} (widget stub).` : "No widget is linked to this button.",
      widgetId: chosen?.id,
      widgetName: chosen?.name,
      widgetUrl: chosen?.externalUrl ?? null,
    };
  }

  const executed = await executeFunctionByApiName(button.functionApiName, {
    module: button.module,
    recordId,
    buttonId: button.id,
  });
  return {
    ok: executed.ok,
    kind: "function",
    message: executed.detail,
  };
}

export async function saveDeskScript(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const module = str(formData, "module");
  const page = str(formData, "page");
  const event = str(formData, "event");
  if (!isDevHubModule(module) || !isScriptPage(page) || !isScriptEvent(event)) {
    throw new Error("Script module, page, or event is invalid.");
  }
  const values = {
    module,
    page,
    event,
    fieldName: str(formData, "fieldName") || null,
    name: str(formData, "name") || "Untitled script",
    body: str(formData, "body") || "",
    enabled: bool(formData, "enabled"),
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db
      .update(deskClientScripts)
      .set(values)
      .where(and(eq(deskClientScripts.tenantId, DEFAULT_TENANT_ID), eq(deskClientScripts.id, id)));
    refreshHub([`/automations/client-scripts/${id}`, `/settings/developer-hub/client-scripts/${id}`]);
    flashAction(`/settings/developer-hub/client-scripts/${id}`, "script-saved");
  }
  const [created] = await db
    .insert(deskClientScripts)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskClientScripts.id });
  refreshHub();
  flashAction(`/settings/developer-hub/client-scripts/${created.id}`, "script-saved");
}

export async function deleteDeskScript(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) throw new Error("Missing script.");
  await db
    .delete(deskClientScripts)
    .where(and(eq(deskClientScripts.tenantId, DEFAULT_TENANT_ID), eq(deskClientScripts.id, id)));
  refreshHub();
  redirect("/settings/developer-hub/client-scripts?notice=deleted");
}

export async function saveDeskWidget(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const type = str(formData, "type");
  const hosting = str(formData, "hosting");
  if (!isWidgetType(type) || !isWidgetHosting(hosting)) {
    throw new Error("Widget type or hosting is invalid.");
  }
  const zipName = str(formData, "zipFileName");
  const values = {
    name: str(formData, "name") || "Untitled widget",
    type,
    hosting,
    externalUrl: str(formData, "externalUrl") || null,
    zipMeta:
      hosting === "internal"
        ? {
            fileName: zipName || "widget.zip",
            byteSize: 0,
            uploadedAt: new Date().toISOString(),
          }
        : null,
    enabled: bool(formData, "enabled"),
    updatedAt: new Date(),
  };
  if (id && isUuid(id)) {
    await db
      .update(deskWidgets)
      .set(values)
      .where(and(eq(deskWidgets.tenantId, DEFAULT_TENANT_ID), eq(deskWidgets.id, id)));
    refreshHub([`/settings/developer-hub/widgets/${id}`]);
    flashAction(`/settings/developer-hub/widgets/${id}`, "widget-saved");
  }
  const [created] = await db
    .insert(deskWidgets)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskWidgets.id });
  refreshHub();
  flashAction(`/settings/developer-hub/widgets/${created.id}`, "widget-saved");
}

export async function deleteDeskWidget(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (!isUuid(id)) throw new Error("Missing widget.");
  await db.delete(deskWidgets).where(and(eq(deskWidgets.tenantId, DEFAULT_TENANT_ID), eq(deskWidgets.id, id)));
  refreshHub();
  redirect("/settings/developer-hub/widgets?notice=deleted");
}

function modulePaths(module: DevHubModule, id: string): string[] {
  if (module === "leads") return [`/leads/${id}`, "/leads"];
  if (module === "contacts") return [`/contacts/${id}`, "/contacts"];
  if (module === "deals") return [`/deals/${id}`, "/deals"];
  if (module === "policies") return [`/policies/${id}`, "/policies"];
  if (module === "businesses") return [`/accounts/${id}`, "/accounts"];
  if (module === "campaigns") return [`/campaigns/${id}`, "/campaigns"];
  if (module === "quotes") return ["/quotes", `/deals/${id}`];
  return [`/tasks/${id}`, "/tasks"];
}

async function loadMergeRecord(module: DevHubModule, id: string): Promise<MergeRecord | null> {
  if (!isUuid(id)) return null;
  if (module === "leads") {
    const [row] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, id)));
    if (!row) return null;
    return {
      id: row.id,
      module,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      address: row.mailingAddress,
      city: row.city,
      state: row.state,
      zip: row.zip,
      status: row.status,
    };
  }
  if (module === "contacts") {
    const [row] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, id)));
    if (!row) return null;
    return {
      id: row.id,
      module,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      address: row.mailingAddress,
      city: row.city,
      state: row.state,
      zip: row.zip,
      status: row.status,
    };
  }
  if (module === "deals") {
    const [row] = await db
      .select({ deal: deals, contact: contacts, account: accounts })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(accounts, eq(deals.accountId, accounts.id))
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, id)));
    if (!row) return null;
    return {
      id: row.deal.id,
      module,
      firstName: row.contact?.firstName ?? null,
      lastName: row.contact?.lastName ?? null,
      title: row.deal.title,
      email: row.contact?.email ?? row.account?.email ?? null,
      phone: row.contact?.phone ?? row.account?.phone ?? null,
      address: row.deal.propertyOneliner ?? row.contact?.mailingAddress ?? row.account?.mailingAddress ?? null,
      city: row.contact?.city ?? row.account?.city ?? null,
      state: row.deal.state,
      zip: row.contact?.zip ?? row.account?.zip ?? null,
      coverageA: row.deal.coverageAmount,
      status: row.deal.pipelineStage,
    };
  }
  if (module === "policies") {
    const [row] = await db
      .select({ policy: policies, contact: contacts })
      .from(policies)
      .leftJoin(contacts, eq(policies.contactId, contacts.id))
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
    if (!row) return null;
    return {
      id: row.policy.id,
      module,
      firstName: row.contact?.firstName ?? null,
      lastName: row.contact?.lastName ?? null,
      title: row.policy.policyNumber,
      email: row.contact?.email ?? null,
      phone: row.contact?.phone ?? null,
      status: row.policy.status,
      coverageA: row.policy.coverageA,
    };
  }
  const [row] = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
  if (!row) return null;
  return { id: row.id, module, title: row.title, status: row.status };
}

export type { ButtonPlacement, DevHubModule };
