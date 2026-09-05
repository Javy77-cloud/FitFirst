"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { archiveDeal, convertLeadToDeal } from "@/app/actions/crm";
import { deleteDeskActivity } from "@/app/actions/activities-desk";
import { deleteTask } from "@/app/actions/alerts";
import { isProtectedAnaRecord } from "@/lib/developer-hub/protected";
import { DEFAULT_TENANT_ID, isShopLine, type ShopLine } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  contacts,
  deals,
  emailCampaigns,
  leads,
  mergeCandidates,
  quoteSheets,
  reviewTasks,
} from "@/lib/db/schema";
import {
  isCrmListModule,
  moduleListHref,
  recordDetailHref,
  type CrmListModule,
} from "@/lib/lists/selection-actions";
import { matchReasons, pairKey } from "@/lib/merge/normalize";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function idsFrom(form: FormData): string[] {
  return form
    .getAll("recordId")
    .map((value) => String(value).trim())
    .filter(isUuid);
}

function moduleFrom(form: FormData): CrmListModule | null {
  const value = str(form, "module");
  return isCrmListModule(value) ? value : null;
}

function revalidateModule(module: CrmListModule, ids: string[] = []) {
  revalidatePath(moduleListHref(module));
  revalidatePath("/");
  for (const id of ids) revalidatePath(recordDetailHref(module, id));
}

function anaBlocked(ids: string[]): string | null {
  if (ids.some(isProtectedAnaRecord)) return "Ana Dib is locked on this live book.";
  return null;
}

export async function duplicateSelectedRecord(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  href?: string;
}> {
  const module = moduleFrom(formData);
  const ids = idsFrom(formData);
  if (!module || ids.length !== 1) {
    return { ok: false, message: "Pick one row to duplicate." };
  }
  const locked = anaBlocked(ids);
  if (locked) return { ok: false, message: locked };

  const id = ids[0];
  const now = new Date();

  if (module === "leads") {
    const [row] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, id)));
    if (!row) return { ok: false, message: "Lead not found." };
    const [copy] = await db
      .insert(leads)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        source: row.source,
        status: "new",
        notes: [row.notes, "Duplicated from the list."].filter(Boolean).join("\n"),
        mailingAddress: row.mailingAddress,
        city: row.city,
        state: row.state,
        zip: row.zip,
        dateOfBirth: row.dateOfBirth,
        insuranceTypeDesired: row.insuranceTypeDesired,
        preferredLanguage: row.preferredLanguage,
        ownerId: row.ownerId,
      })
      .returning();
    revalidateModule("leads", [copy.id]);
    return { ok: true, message: `Duplicated ${row.lastName}, ${row.firstName}.`, href: `/leads/${copy.id}` };
  }

  if (module === "contacts") {
    const [row] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, id)));
    if (!row) return { ok: false, message: "Contact not found." };
    const [copy] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        mailingAddress: row.mailingAddress,
        city: row.city,
        state: row.state,
        zip: row.zip,
        notes: [row.notes, "Duplicated from the list."].filter(Boolean).join("\n"),
        lifeNotes: row.lifeNotes,
        healthNotes: row.healthNotes,
        dateOfBirth: row.dateOfBirth,
        language: row.language,
        preferredLanguage: row.preferredLanguage,
        maritalStatus: row.maritalStatus,
        source: row.source,
        ownerId: row.ownerId,
        accountId: row.accountId,
        status: "active",
        policyCount: 0,
        activePolicyCount: 0,
        lifetimePolicyCount: 0,
      })
      .returning();
    revalidateModule("contacts", [copy.id]);
    return { ok: true, message: `Duplicated ${row.lastName}, ${row.firstName}.`, href: `/contacts/${copy.id}` };
  }

  if (module === "deals") {
    const [row] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, id)));
    if (!row) return { ok: false, message: "Deal not found." };
    const shopLines = (row.shopLines ?? []).filter(isShopLine);
    const [copy] = await db
      .insert(deals)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        leadId: row.leadId,
        contactId: row.contactId,
        accountId: row.accountId,
        title: row.title.endsWith("(copy)") ? row.title : `${row.title} (copy)`,
        pipelineStage: "shopping",
        pipelineStageSlug: "gather",
        pipelineId: row.pipelineId,
        lineOfBusiness: row.lineOfBusiness,
        bindTarget: row.bindTarget,
        state: row.state,
        notes: [row.notes, "Duplicated from the list."].filter(Boolean).join("\n"),
        primaryNamedInsured: row.primaryNamedInsured,
        secondaryNamedInsured: row.secondaryNamedInsured,
        shopLines: shopLines.length ? shopLines : ["home"],
        policySubType: row.policySubType,
        propertyOneliner: row.propertyOneliner,
        currentCarrier: row.currentCarrier,
        accountKind: row.accountKind,
        ownerId: row.ownerId,
        source: row.source,
      })
      .returning();
    if (shopLines.length) {
      await db.insert(quoteSheets).values(
        shopLines.map((line: ShopLine) => ({
          tenantId: DEFAULT_TENANT_ID,
          dealId: copy.id,
          line,
          values: emptySheetValues(line),
        })),
      );
    }
    revalidateModule("deals", [copy.id]);
    return { ok: true, message: `Duplicated ${row.title}.`, href: `/deals/${copy.id}` };
  }

  if (module === "businesses") {
    const [row] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, id)));
    if (!row) return { ok: false, message: "Business not found." };
    const [copy] = await db
      .insert(accounts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name: row.name.endsWith("(copy)") ? row.name : `${row.name} (copy)`,
        email: row.email,
        phone: row.phone,
        mailingAddress: row.mailingAddress,
        city: row.city,
        state: row.state,
        zip: row.zip,
        notes: [row.notes, "Duplicated from the list."].filter(Boolean).join("\n"),
        dba: row.dba,
        entityType: row.entityType,
        website: row.website,
        policyCount: 0,
        activePolicyCount: 0,
        boundPolicyCount: 0,
        pendingPolicyCount: 0,
        lifetimePolicyCount: 0,
      })
      .returning();
    revalidateModule("businesses", [copy.id]);
    return { ok: true, message: `Duplicated ${row.name}.`, href: `/accounts/${copy.id}` };
  }

  if (module === "tasks") {
    const [review] = await db
      .select()
      .from(reviewTasks)
      .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
    if (review) {
      const [copy] = await db
        .insert(reviewTasks)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          contactId: review.contactId,
          accountId: review.accountId,
          policyId: review.policyId,
          dealId: review.dealId,
          kind: review.kind,
          title: review.title.endsWith("(copy)") ? review.title : `${review.title} (copy)`,
          dueDate: review.dueDate,
          status: "open",
        })
        .returning();
      revalidateModule("tasks", [copy.id]);
      return { ok: true, message: `Duplicated ${review.title}.`, href: `/tasks/${copy.id}` };
    }
    const [activity] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
    if (!activity) return { ok: false, message: "Task not found." };
    const [copy] = await db
      .insert(activities)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        kind: activity.kind,
        title: activity.title.endsWith("(copy)") ? activity.title : `${activity.title} (copy)`,
        notes: [activity.notes, "Duplicated from the list."].filter(Boolean).join("\n"),
        status: "open",
        dueAt: activity.dueAt ?? now,
        contactId: activity.contactId,
        accountId: activity.accountId,
        dealId: activity.dealId,
        policyId: activity.policyId,
        leadId: activity.leadId,
        createdByUserId: activity.createdByUserId,
      })
      .returning();
    revalidateModule("tasks", [copy.id]);
    return { ok: true, message: `Duplicated ${activity.title}.`, href: `/tasks/${copy.id}` };
  }

  if (module === "campaigns") {
    const [row] = await db
      .select()
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.tenantId, DEFAULT_TENANT_ID), eq(emailCampaigns.id, id)));
    if (!row) return { ok: false, message: "Campaign not found." };
    const [copy] = await db
      .insert(emailCampaigns)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name: row.name.endsWith("(copy)") ? row.name : `${row.name} (copy)`,
        subject: row.subject,
        body: row.body,
        audienceType: row.audienceType,
        audienceValue: row.audienceValue,
        status: "draft",
      })
      .returning();
    revalidateModule("campaigns", [copy.id]);
    return { ok: true, message: `Duplicated ${row.name}.`, href: `/campaigns/${copy.id}` };
  }

  return { ok: false, message: "This module does not copy from the list." };
}

export async function archiveSelectedRecords(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  const module = moduleFrom(formData);
  const ids = idsFrom(formData);
  if (!module || ids.length === 0) return { ok: false, message: "Select rows to archive." };
  const locked = anaBlocked(ids);
  if (locked) return { ok: false, message: locked };
  const now = new Date();

  if (module === "leads") {
    await db
      .update(leads)
      .set({ status: "archived", archivedAt: now, updatedAt: now })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
    revalidateModule("leads", ids);
    return { ok: true, message: `Archived ${ids.length} lead${ids.length === 1 ? "" : "s"}.` };
  }

  if (module === "contacts") {
    await db
      .update(contacts)
      .set({ status: "archived", archivedAt: now, updatedAt: now })
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
    revalidateModule("contacts", ids);
    return { ok: true, message: `Archived ${ids.length} contact${ids.length === 1 ? "" : "s"}.` };
  }

  if (module === "deals") {
    for (const id of ids) {
      const form = new FormData();
      form.set("dealId", id);
      await archiveDeal(form);
    }
    return { ok: true, message: `Archived ${ids.length} deal${ids.length === 1 ? "" : "s"}.` };
  }

  return { ok: false, message: "Archive is not wired on this list." };
}

export async function deleteSelectedTasks(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  const module = moduleFrom(formData);
  const ids = idsFrom(formData);
  if (module !== "tasks" || ids.length === 0) {
    return { ok: false, message: "Select tasks to delete." };
  }

  let removed = 0;
  for (const id of ids) {
    const form = new FormData();
    const [review] = await db
      .select({ id: reviewTasks.id })
      .from(reviewTasks)
      .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
    if (review) {
      form.set("taskId", id);
      await deleteTask(form);
      removed += 1;
      continue;
    }
    form.set("activityId", id);
    const result = await deleteDeskActivity(form);
    if (result && "ok" in result && result.ok) removed += 1;
  }
  revalidateModule("tasks");
  return { ok: true, message: `Deleted ${removed} task${removed === 1 ? "" : "s"}.` };
}

export async function openMergeForSelection(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  href?: string;
}> {
  const module = moduleFrom(formData);
  const ids = idsFrom(formData);
  if ((module !== "leads" && module !== "contacts") || ids.length < 2) {
    return { ok: false, message: "Select 2 or more Leads or Contacts to merge." };
  }
  const locked = anaBlocked(ids);
  if (locked) return { ok: false, message: locked };

  const [leftId, rightId] = pairKey(ids[0], ids[1]);
  const entityType = module === "leads" ? "lead" : "contact";

  let reasons: string[] = [];
  if (entityType === "lead") {
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, [leftId, rightId])));
    const left = rows.find((row) => row.id === leftId);
    const right = rows.find((row) => row.id === rightId);
    if (left && right) reasons = matchReasons(left, right);
  } else {
    const rows = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, [leftId, rightId])));
    const left = rows.find((row) => row.id === leftId);
    const right = rows.find((row) => row.id === rightId);
    if (left && right) reasons = matchReasons(left, right);
  }

  const existing = await db
    .select()
    .from(mergeCandidates)
    .where(
      and(
        eq(mergeCandidates.tenantId, DEFAULT_TENANT_ID),
        eq(mergeCandidates.entityType, entityType),
        eq(mergeCandidates.leftId, leftId),
        eq(mergeCandidates.rightId, rightId),
      ),
    );
  const open = existing.find((row) => row.status === "open") ?? existing[0];
  if (open) {
    if (open.status !== "open") {
      await db
        .update(mergeCandidates)
        .set({ status: "open", matchReasons: reasons.length ? reasons : open.matchReasons, updatedAt: new Date() })
        .where(eq(mergeCandidates.id, open.id));
    }
    revalidatePath("/merge");
    return {
      ok: true,
      message: ids.length > 2 ? "Opened merge for the first two selected." : "Opened merge review.",
      href: `/merge/${open.id}`,
    };
  }

  const [row] = await db
    .insert(mergeCandidates)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      entityType,
      leftId,
      rightId,
      matchReasons: reasons,
      status: "open",
    })
    .returning();
  revalidatePath("/merge");
  return {
    ok: true,
    message: ids.length > 2 ? "Opened merge for the first two selected." : "Opened merge review.",
    href: `/merge/${row.id}`,
  };
}

export async function convertSelectedLeads(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  href?: string;
}> {
  const module = moduleFrom(formData);
  const ids = idsFrom(formData);
  if (module !== "leads" || ids.length === 0) {
    return { ok: false, message: "Select a lead to convert." };
  }
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
  const dealIds: string[] = [];
  for (const lead of rows) {
    const dealId = await convertLeadToDeal(lead.id, lead.insuranceTypeDesired || "HO", lead.state || "FL");
    dealIds.push(dealId);
  }
  revalidateModule("leads", ids);
  revalidatePath("/deals");
  const last = dealIds[dealIds.length - 1];
  return {
    ok: true,
    message:
      dealIds.length === 1
        ? "Shop opened from the lead."
        : `Converted ${dealIds.length} leads to shops.`,
    href: last ? `/deals/${last}` : undefined,
  };
}

