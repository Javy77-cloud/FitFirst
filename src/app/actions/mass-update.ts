"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { isProtectedAnaRecord } from "@/lib/developer-hub/protected";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { alerts, contacts, deals, leadFollowUpTemplates, leads, policies, users } from "@/lib/db/schema";
import { fireLeadFollowUpForStatus } from "@/lib/leads/apply-follow-up";
import { isDefaultFollowUpTemplate } from "@/lib/leads/follow-up-templates";
import {
  dealStagePatch,
  isManualBindStage,
  massUpdateAppliesTo,
  massUpdateStatusOptions,
  type MassUpdateCustomKey,
  type MassUpdateField,
} from "@/lib/lists/mass-update";
import {
  isCrmListModule,
  moduleListHref,
  recordDetailHref,
  type CrmListModule,
} from "@/lib/lists/selection-actions";
import { dealTransferNotification } from "@/lib/deals/transfer";
import { normalizeRecordSource } from "@/lib/crm/sources";

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

function fieldFrom(form: FormData): MassUpdateField | null {
  const value = str(form, "field");
  return value === "status" ||
    value === "source" ||
    value === "follow_up_template" ||
    value === "owner" ||
    value === "custom"
    ? value
    : null;
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

export async function applyMassUpdate(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, message: "Sign in to mass-update." };
  const module = moduleFrom(formData);
  const field = fieldFrom(formData);
  const ids = idsFrom(formData);
  const value = str(formData, "value");
  const customKey = str(formData, "customKey") as MassUpdateCustomKey | "";
  if (!module || !field) return { ok: false, message: "Pick a mass-update field." };
  if (!massUpdateAppliesTo(module, field)) {
    return { ok: false, message: "That field is not on this list." };
  }
  if (ids.length === 0) return { ok: false, message: "Select rows first. Ana stays locked." };
  if (field !== "custom" && !value) return { ok: false, message: "Pick a value." };
  if (field === "custom" && (!customKey || !value)) return { ok: false, message: "Enter a custom field value." };

  if (field === "status") {
    const allowed = new Set(massUpdateStatusOptions(module).map((row) => row.value));
    if (!allowed.has(value) || (module === "deals" && isManualBindStage(value))) {
      return { ok: false, message: "Bound is signature-only — pick another status." };
    }
    if (module === "deals") {
      const patch = dealStagePatch(value);
      await db
        .update(deals)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    } else if (module === "leads") {
      await db
        .update(leads)
        .set({ status: value, updatedAt: new Date() })
        .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
      for (const id of ids) await fireLeadFollowUpForStatus(id, value).catch(() => null);
    } else if (module === "contacts") {
      await db
        .update(contacts)
        .set({ clientStatus: value, updatedAt: new Date() })
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    } else if (module === "policies") {
      await db
        .update(policies)
        .set({ status: value, updatedAt: new Date() })
        .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, ids)));
    }
  } else if (field === "source") {
    const source = normalizeRecordSource(value, value);
    if (module === "deals") {
      await db
        .update(deals)
        .set({ source, updatedAt: new Date() })
        .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    } else if (module === "leads") {
      await db
        .update(leads)
        .set({ source, updatedAt: new Date() })
        .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    } else if (module === "contacts") {
      await db
        .update(contacts)
        .set({ source, updatedAt: new Date() })
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    }
  } else if (field === "owner") {
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
    } else if (module === "leads") {
      await db
        .update(leads)
        .set(patch)
        .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    } else if (module === "contacts") {
      await db
        .update(contacts)
        .set(patch)
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    } else if (module === "policies") {
      await db
        .update(policies)
        .set(patch)
        .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, ids)));
    }
  } else if (field === "follow_up_template") {
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
    } else if (module === "deals") {
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
    }
  } else if (field === "custom") {
    if (customKey !== "notes") return { ok: false, message: "Only Notes is wired as a custom field." };
    if (module === "policies") return { ok: false, message: "Policies have no notes field on the list." };
    if (module === "deals") {
      await db
        .update(deals)
        .set({ notes: value, updatedAt: new Date() })
        .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    } else if (module === "leads") {
      await db
        .update(leads)
        .set({ notes: value, updatedAt: new Date() })
        .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    } else if (module === "contacts") {
      await db
        .update(contacts)
        .set({ notes: value, updatedAt: new Date() })
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    }
  }

  revalidateModule(module, ids);
  return {
    ok: true,
    message: `Updated ${ids.length} ${ids.length === 1 ? "record" : "records"}. Ana was skipped if selected.`,
  };
}
