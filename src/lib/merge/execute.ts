import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  activities,
  clientHistory,
  contacts,
  deals,
  leads,
  locations,
  mergeCandidates,
  mergeEvents,
  policies,
  reviewTasks,
  risks,
  type Contact,
  type Lead,
} from "@/lib/db/schema";
import { assertMergeAllowed, MergeLockError } from "./lock";
import { CONTACT_COPY_FIELDS, copyMissingFields, LEAD_COPY_FIELDS } from "./copy-fields";
import { isRetired } from "./normalize";

export type MergeInput = {
  entityType: "contact" | "lead";
  keeperId: string;
  duplicateId: string;
  candidateId?: string;
};

export type MergeResult = {
  keeperId: string;
  duplicateId: string;
  copiedFields: string[];
  relinked: Record<string, number>;
};

function tenant() {
  return DEFAULT_TENANT_ID;
}

async function loadContact(id: string) {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, id)));
  return row ?? null;
}

async function loadLead(id: string) {
  const [row] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, tenant()), eq(leads.id, id)));
  return row ?? null;
}

export async function executeMerge(input: MergeInput): Promise<MergeResult> {
  if (input.entityType === "contact") {
    return mergeContacts(input.keeperId, input.duplicateId, input.candidateId);
  }
  return mergeLeads(input.keeperId, input.duplicateId, input.candidateId);
}

async function mergeContacts(
  keeperId: string,
  duplicateId: string,
  candidateId?: string,
): Promise<MergeResult> {
  const keeper = await loadContact(keeperId);
  const duplicate = await loadContact(duplicateId);
  if (!keeper || !duplicate) throw new MergeLockError("Both contacts must exist.");
  if (keeper.tenantId !== tenant() || duplicate.tenantId !== tenant()) {
    throw new MergeLockError("Contacts must belong to this desk.");
  }
  assertMergeAllowed(keeper, duplicate);
  if (isRetired(duplicate)) {
    throw new MergeLockError("Duplicate is already retired.");
  }

  const { copiedFields, patch } = copyMissingFields(
    keeper as unknown as Record<string, unknown>,
    duplicate as unknown as Record<string, unknown>,
    CONTACT_COPY_FIELDS,
  );

  const now = new Date();
  const relinked: Record<string, number> = {};

  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx
        .update(contacts)
        .set({ ...(patch as Partial<Contact>), updatedAt: now })
        .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, keeperId)));
    }

    const dealRows = await tx
      .update(deals)
      .set({ contactId: keeperId, updatedAt: now })
      .where(and(eq(deals.tenantId, tenant()), eq(deals.contactId, duplicateId)))
      .returning({ id: deals.id });
    relinked.deals = dealRows.length;

    const policyRows = await tx
      .update(policies)
      .set({ contactId: keeperId, updatedAt: now })
      .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, duplicateId)))
      .returning({ id: policies.id });
    relinked.policies = policyRows.length;

    const riskRows = await tx
      .update(risks)
      .set({ contactId: keeperId, updatedAt: now })
      .where(and(eq(risks.tenantId, tenant()), eq(risks.contactId, duplicateId)))
      .returning({ id: risks.id });
    relinked.risks = riskRows.length;

    const locationRows = await tx
      .update(locations)
      .set({ contactId: keeperId, updatedAt: now })
      .where(and(eq(locations.tenantId, tenant()), eq(locations.contactId, duplicateId)))
      .returning({ id: locations.id });
    relinked.locations = locationRows.length;

    const activityRows = await tx
      .update(activities)
      .set({ contactId: keeperId, updatedAt: now })
      .where(and(eq(activities.tenantId, tenant()), eq(activities.contactId, duplicateId)))
      .returning({ id: activities.id });
    relinked.activities = activityRows.length;

    const taskRows = await tx
      .update(reviewTasks)
      .set({ contactId: keeperId })
      .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.contactId, duplicateId)))
      .returning({ id: reviewTasks.id });
    relinked.reviewTasks = taskRows.length;

    const historyRows = await tx
      .update(clientHistory)
      .set({ contactId: keeperId })
      .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, duplicateId)))
      .returning({ id: clientHistory.id });
    relinked.history = historyRows.length;

    await tx.insert(clientHistory).values({
      tenantId: tenant(),
      contactId: keeperId,
      eventType: "merge",
      body: `Merged duplicate contact into this record. Copied ${copiedFields.join(", ") || "no blank fields"}. Related deals, policies, locations, and activities now point here. Duplicate retired, not deleted.`,
    });

    await tx
      .update(contacts)
      .set({
        status: "archived",
        mergedIntoId: keeperId,
        archivedAt: now,
        updatedAt: now,
      })
      .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, duplicateId)));

    await tx.insert(mergeEvents).values({
      tenantId: tenant(),
      entityType: "contact",
      keeperId,
      duplicateId,
      copiedFields,
      relinked,
    });

    if (candidateId) {
      await tx
        .update(mergeCandidates)
        .set({
          status: "merged",
          keeperId,
          duplicateId,
          mergedAt: now,
          updatedAt: now,
        })
        .where(and(eq(mergeCandidates.tenantId, tenant()), eq(mergeCandidates.id, candidateId)));
    }
  });

  return { keeperId, duplicateId, copiedFields, relinked };
}

async function mergeLeads(
  keeperId: string,
  duplicateId: string,
  candidateId?: string,
): Promise<MergeResult> {
  const keeper = await loadLead(keeperId);
  const duplicate = await loadLead(duplicateId);
  if (!keeper || !duplicate) throw new MergeLockError("Both leads must exist.");
  if (keeper.tenantId !== tenant() || duplicate.tenantId !== tenant()) {
    throw new MergeLockError("Leads must belong to this desk.");
  }
  assertMergeAllowed(keeper, duplicate);
  if (isRetired(duplicate)) {
    throw new MergeLockError("Duplicate is already retired.");
  }

  const { copiedFields, patch } = copyMissingFields(
    keeper as unknown as Record<string, unknown>,
    duplicate as unknown as Record<string, unknown>,
    LEAD_COPY_FIELDS,
  );

  const now = new Date();
  const relinked: Record<string, number> = {};

  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx
        .update(leads)
        .set({ ...(patch as Partial<Lead>), updatedAt: now })
        .where(and(eq(leads.tenantId, tenant()), eq(leads.id, keeperId)));
    }

    const dealRows = await tx
      .update(deals)
      .set({ leadId: keeperId, updatedAt: now })
      .where(and(eq(deals.tenantId, tenant()), eq(deals.leadId, duplicateId)))
      .returning({ id: deals.id });
    relinked.deals = dealRows.length;

    const locationRows = await tx
      .update(locations)
      .set({ leadId: keeperId, updatedAt: now })
      .where(and(eq(locations.tenantId, tenant()), eq(locations.leadId, duplicateId)))
      .returning({ id: locations.id });
    relinked.locations = locationRows.length;

    const activityRows = await tx
      .update(activities)
      .set({ leadId: keeperId, updatedAt: now })
      .where(and(eq(activities.tenantId, tenant()), eq(activities.leadId, duplicateId)))
      .returning({ id: activities.id });
    relinked.activities = activityRows.length;

    await tx
      .update(leads)
      .set({
        status: "archived",
        mergedIntoId: keeperId,
        archivedAt: now,
        updatedAt: now,
      })
      .where(and(eq(leads.tenantId, tenant()), eq(leads.id, duplicateId)));

    await tx.insert(mergeEvents).values({
      tenantId: tenant(),
      entityType: "lead",
      keeperId,
      duplicateId,
      copiedFields,
      relinked,
    });

    if (candidateId) {
      await tx
        .update(mergeCandidates)
        .set({
          status: "merged",
          keeperId,
          duplicateId,
          mergedAt: now,
          updatedAt: now,
        })
        .where(and(eq(mergeCandidates.tenantId, tenant()), eq(mergeCandidates.id, candidateId)));
    }
  });

  return { keeperId, duplicateId, copiedFields, relinked };
}
