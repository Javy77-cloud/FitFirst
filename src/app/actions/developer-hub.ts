"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { executeFunctionByApiName } from "@/lib/developer-hub/function-execute";
import { parseMacroActions, validateMacroActions } from "@/lib/developer-hub/macros";
import { mergeTokens, type MergeRecord } from "@/lib/developer-hub/merge";
import { applyMacroToRecords } from "@/lib/developer-hub/run-macro";
import {
  isButtonActionKind,
  isButtonPlacement,
  isDevHubModule,
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
  const value = str(form, key);
  return value === "on" || value === "true" || value === "1";
}

function refreshHub(extra: string[] = []) {
  for (const path of [
    "/settings",
    "/settings/developer-hub",
    "/settings/developer-hub/macros",
    "/settings/developer-hub/custom-buttons",
    "/settings/developer-hub/client-scripts",
    "/settings/developer-hub/widgets",
    "/automations",
    "/automations/macros",
    "/automations/custom-buttons",
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
  return parseMacroActions({
    email: templateId || subject || body ? { templateId, subject, body } : null,
    fieldUpdates: parseFieldUpdates(form),
    createTasks: parseCreateTasks(form),
  });
}

export async function saveDeskMacro(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const module = str(formData, "module");
  if (!isDevHubModule(module)) throw new Error("Unknown module.");
  const actions = parseActionsFromForm(formData);
  const checked = validateMacroActions(module, actions);
  if (!checked.ok) throw new Error(checked.error);
  const values = {
    module,
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
    refreshHub([`/settings/developer-hub/macros/${id}`]);
    redirect(`/settings/developer-hub/macros/${id}?notice=saved`);
  }
  const [created] = await db
    .insert(deskMacros)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskMacros.id });
  refreshHub([`/settings/developer-hub/macros/${created.id}`]);
  redirect(`/settings/developer-hub/macros/${created.id}?notice=saved`);
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
  if (macro.module !== moduleRaw) return { ok: false, summary: "Macro module does not match the list." };
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
    refreshHub([`/settings/developer-hub/custom-buttons/${id}`]);
    redirect(`/settings/developer-hub/custom-buttons/${id}?notice=saved`);
  }
  const [created] = await db
    .insert(deskCustomButtons)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskCustomButtons.id });
  refreshHub();
  redirect(`/settings/developer-hub/custom-buttons/${created.id}?notice=saved`);
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
      message: chosen ? `Opened ${chosen.name}.` : "No widget is linked to this button.",
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
    refreshHub([`/settings/developer-hub/client-scripts/${id}`]);
    redirect(`/settings/developer-hub/client-scripts/${id}?notice=saved`);
  }
  const [created] = await db
    .insert(deskClientScripts)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskClientScripts.id });
  refreshHub();
  redirect(`/settings/developer-hub/client-scripts/${created.id}?notice=saved`);
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
    redirect(`/settings/developer-hub/widgets/${id}?notice=saved`);
  }
  const [created] = await db
    .insert(deskWidgets)
    .values({ tenantId: DEFAULT_TENANT_ID, ...values })
    .returning({ id: deskWidgets.id });
  refreshHub();
  redirect(`/settings/developer-hub/widgets/${created.id}?notice=saved`);
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
  if (module === "leads") return [`/leads/${id}`];
  if (module === "contacts") return [`/contacts/${id}`];
  if (module === "deals") return [`/deals/${id}`];
  if (module === "policies") return [`/policies/${id}`];
  return [`/tasks/${id}`];
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
