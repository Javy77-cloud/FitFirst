"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { saveDealPipelineCell } from "@/app/actions/pipeline-sheet";
import { currentDeskSession } from "@/lib/auth/session";
import { normalizeRecordSource } from "@/lib/crm/sources";
import { listFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { isFieldLayoutModule, type FieldLayoutModule } from "@/lib/custom-fields/modules";
import { isProtectedAnaRecord } from "@/lib/developer-hub/protected";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { alerts, contacts, deals, leadFollowUpTemplates, leads, policies, users } from "@/lib/db/schema";
import { fireLeadFollowUpForStatus } from "@/lib/leads/apply-follow-up";
import { isDefaultFollowUpTemplate } from "@/lib/leads/follow-up-templates";
import {
  isFollowUpTemplateColumn,
  isManualBindStage,
  isOwnerLikeColumn,
  isStatusLikeColumn,
  massUpdateStatusOptions,
  normalizeMassUpdateColumnId,
} from "@/lib/lists/mass-update";
import {
  isCrmListModule,
  moduleListHref,
  recordDetailHref,
  type CrmListModule,
} from "@/lib/lists/selection-actions";
import { dealTransferNotification } from "@/lib/deals/transfer";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function idsFrom(form: FormData): string[] {
  return form
    .getAll("recordId")
    .map((value) => String(value).trim())
    .filter(isUuid)
    .filter((id) => !isProtectedAnaRecord(id));
}

function moduleFrom(form: FormData): CrmListModule | null {
  const value = str(form, "module");
  return isCrmListModule(value) ? value : null;
}

function columnFrom(form: FormData): string | null {
  const columnId = str(form, "columnId") || str(form, "field");
  return columnId || null;
}

function revalidateModule(module: CrmListModule, ids: string[]) {
  revalidatePath(moduleListHref(module));
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/leads");
  revalidatePath("/contacts");
  revalidatePath("/policies");
  for (const id of ids) revalidatePath(recordDetailHref(module, id));
}

async function applyFollowUpTemplate(
  module: CrmListModule,
  ids: string[],
  value: string,
): Promise<{ ok: boolean; message: string } | null> {
  let templateId: string | null = value || null;
  if (templateId) {
    const [picked] = await db
      .select()
      .from(leadFollowUpTemplates)
      .where(
        and(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpTemplates.id, templateId)),
      );
    if (!picked) return { ok: false, message: "Template not found." };
    if (isDefaultFollowUpTemplate(picked)) templateId = null;
  }
  if (module === "leads") {
    const rows = await db
      .select({ id: leads.id, status: leads.status })
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    await db
      .update(leads)
      .set({ followUpTemplateId: templateId, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    for (const row of rows) await fireLeadFollowUpForStatus(row.id, row.status).catch(() => null);
    return null;
  }
  if (module === "deals") {
    const [template] = templateId
      ? await db
          .select({ name: leadFollowUpTemplates.name })
          .from(leadFollowUpTemplates)
          .where(
            and(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID), eq(leadFollowUpTemplates.id, templateId)),
          )
      : [];
    const note = template ? `Follow-up template · ${template.name}` : "Follow-up template cleared.";
    const rows = await db
      .select({ id: deals.id, notes: deals.notes })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    for (const row of rows) {
      const current = (row.notes ?? "").trim();
      const next = current.includes(note) ? current : [current, note].filter(Boolean).join("\n");
      await db
        .update(deals)
        .set({ notes: next, updatedAt: new Date() })
        .where(eq(deals.id, row.id));
    }
    return null;
  }
  return { ok: false, message: "Follow-up template is not on this list." };
}

async function applyOwner(
  module: CrmListModule,
  ids: string[],
  value: string,
  session: { userId: string; name: string },
): Promise<{ ok: boolean; message: string } | null> {
  if (!isUuid(value)) return { ok: false, message: "Pick an owner." };
  const [owner] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, value)));
  if (!owner) return { ok: false, message: "Owner not found." };
  const patch = { ownerId: owner.id, updatedAt: new Date() };
  if (module === "deals") {
    const rows = await db
      .select({ id: deals.id, title: deals.title })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    await db
      .update(deals)
      .set(patch)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    if (owner.id !== session.userId) {
      for (const row of rows) {
        const ping = dealTransferNotification({
          dealTitle: row.title,
          fromName: session.name,
        });
        await db.insert(alerts).values({
          tenantId: DEFAULT_TENANT_ID,
          kind: "deal_transfer",
          title: ping.title,
          body: ping.body,
          severity: "info",
          entityType: "deal",
          entityId: row.id,
          userId: owner.id,
          recipientUserId: owner.id,
        });
      }
    }
    return null;
  }
  if (module === "leads") {
    await db
      .update(leads)
      .set(patch)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (module === "contacts") {
    await db
      .update(contacts)
      .set(patch)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    return null;
  }
  if (module === "policies") {
    await db
      .update(policies)
      .set(patch)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, ids)));
    return null;
  }
  return { ok: false, message: "Owner is not on this list." };
}

async function applyLeadColumn(columnId: string, ids: string[], value: string): Promise<{ ok: boolean; message: string } | null> {
  if (columnId === "status") {
    const allowed = new Set(massUpdateStatusOptions("leads").map((row) => row.value));
    if (!allowed.has(value)) return { ok: false, message: "Pick a valid status." };
    await db
      .update(leads)
      .set({ status: value, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    for (const id of ids) await fireLeadFollowUpForStatus(id, value).catch(() => null);
    return null;
  }
  if (columnId === "source") {
    const source = normalizeRecordSource(value, value);
    await db
      .update(leads)
      .set({ source, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "notes") {
    await db
      .update(leads)
      .set({ notes: value, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "email") {
    await db
      .update(leads)
      .set({ email: value, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "phone") {
    await db
      .update(leads)
      .set({ phone: value, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "city") {
    await db
      .update(leads)
      .set({ city: value || null, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "state") {
    await db
      .update(leads)
      .set({ state: value || null, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "zip") {
    await db
      .update(leads)
      .set({ zip: value || null, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }
  if (columnId === "mailing_address") {
    await db
      .update(leads)
      .set({ mailingAddress: value || null, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    return null;
  }

  const fields = await listFieldDefs("leads").catch(() => []);
  const field = fields.find((item) => item.key === columnId);
  if (!field) return { ok: false, message: "That column is not updatable." };
  for (const id of ids) {
    await writeRecordValues(id, { [field.key]: value }, "leads");
  }
  return null;
}

async function applyContactColumn(columnId: string, ids: string[], value: string): Promise<{ ok: boolean; message: string } | null> {
  if (columnId === "status") {
    const allowed = new Set(massUpdateStatusOptions("contacts").map((row) => row.value));
    if (!allowed.has(value)) return { ok: false, message: "Pick a valid status." };
    await db
      .update(contacts)
      .set({ clientStatus: value, updatedAt: new Date() })
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    return null;
  }
  if (columnId === "source") {
    const source = normalizeRecordSource(value, value);
    await db
      .update(contacts)
      .set({ source, updatedAt: new Date() })
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    return null;
  }
  if (columnId === "notes") {
    await db
      .update(contacts)
      .set({ notes: value, updatedAt: new Date() })
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    return null;
  }
  if (isFieldLayoutModule("contacts")) {
    const fields = await listFieldDefs("contacts").catch(() => []);
    const field = fields.find((item) => item.key === columnId);
    if (field) {
      for (const id of ids) await writeRecordValues(id, { [field.key]: value }, "contacts");
      return null;
    }
  }
  return { ok: false, message: "That column is not updatable." };
}

async function applyPolicyColumn(columnId: string, ids: string[], value: string): Promise<{ ok: boolean; message: string } | null> {
  if (columnId === "status") {
    const allowed = new Set(massUpdateStatusOptions("policies").map((row) => row.value));
    if (!allowed.has(value)) return { ok: false, message: "Pick a valid status." };
    await db
      .update(policies)
      .set({ status: value, updatedAt: new Date() })
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, ids)));
    return null;
  }
  return { ok: false, message: "That column is not updatable on Policies." };
}

export async function applyMassUpdate(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return { ok: false, message: "Sign in to mass-update." };
  const module = moduleFrom(formData);
  const rawColumn = columnFrom(formData);
  const ids = idsFrom(formData);
  const value = str(formData, "value");
  if (!module || !rawColumn) return { ok: false, message: "Pick a mass-update field." };
  if (ids.length === 0) return { ok: false, message: "Select rows first. Ana stays locked." };

  const columnId = normalizeMassUpdateColumnId(rawColumn, module);

  if (isFollowUpTemplateColumn(columnId) || rawColumn === "follow_up_template") {
    const err = await applyFollowUpTemplate(module, ids, value);
    if (err) return err;
    revalidateModule(module, ids);
    return {
      ok: true,
      message: `Updated ${ids.length} ${ids.length === 1 ? "record" : "records"}. Ana was skipped if selected.`,
    };
  }

  if (isOwnerLikeColumn(columnId) || rawColumn === "owner") {
    const err = await applyOwner(module, ids, value, { userId: session.userId, name: session.name });
    if (err) return err;
    revalidateModule(module, ids);
    return {
      ok: true,
      message: `Updated ${ids.length} ${ids.length === 1 ? "record" : "records"}. Ana was skipped if selected.`,
    };
  }

  if (isStatusLikeColumn(columnId) && module === "deals" && isManualBindStage(value)) {
    return { ok: false, message: "Bound is signature-only — pick another status." };
  }

  if (!value && !(isFollowUpTemplateColumn(columnId))) {
    return { ok: false, message: "Pick a value." };
  }

  if (module === "deals") {
    // Reuse the same write path as Grid / List inline edits (incl. Selling Agency custom fields).
    for (const id of ids) {
      const result = await saveDealPipelineCell({
        dealId: id,
        columnId,
        value,
      });
      if (!result.ok) {
        return { ok: false, message: result.error || "Could not mass-update that column." };
      }
    }
  } else if (module === "leads") {
    const err = await applyLeadColumn(columnId, ids, value);
    if (err) return err;
  } else if (module === "contacts") {
    const err = await applyContactColumn(columnId, ids, value);
    if (err) return err;
  } else if (module === "policies") {
    const err = await applyPolicyColumn(columnId, ids, value);
    if (err) return err;
  } else if (isFieldLayoutModule(module)) {
    const fields = await listFieldDefs(module as FieldLayoutModule).catch(() => []);
    const field = fields.find((item) => item.key === columnId);
    if (!field) return { ok: false, message: "That column is not updatable." };
    for (const id of ids) {
      await writeRecordValues(id, { [field.key]: value }, module as FieldLayoutModule);
    }
  } else {
    return { ok: false, message: "That field is not on this list." };
  }

  revalidateModule(module, ids);
  return {
    ok: true,
    message: `Updated ${ids.length} ${ids.length === 1 ? "record" : "records"}. Ana was skipped if selected.`,
  };
}
