import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  activities,
  activityLogs,
  accounts,
  clientHistory,
  contactAccounts,
  contacts,
  deals,
  documents,
  issuedCertificates,
  leads,
  locations,
  mergeCandidates,
  mergeEvents,
  policies,
  reviewTasks,
  risks,
  type Account,
  type Contact,
  type Lead,
} from "@/lib/db/schema";
import { assertMergeAllowed, MergeLockError } from "./lock";
import {
  ACCOUNT_COPY_FIELDS,
  CONTACT_COPY_FIELDS,
  copyMissingFields,
  LEAD_COPY_FIELDS,
} from "./copy-fields";
import { blank, isRetired } from "./normalize";

export type MergeInput = {
  entityType: "contact" | "lead" | "account";
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

async function loadAccount(id: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenant()), eq(accounts.id, id)));
  return row ?? null;
}

function isAccountRetired(row: Account): boolean {
  return !blank(row.archivedAt) || !blank(row.mergedIntoId);
}

export async function executeMerge(input: MergeInput): Promise<MergeResult> {
  if (input.entityType === "contact") {
    return mergeContacts(input.keeperId, input.duplicateId, input.candidateId);
  }
  if (input.entityType === "account") {
    return mergeAccounts(input.keeperId, input.duplicateId, input.candidateId);
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

async function mergeAccounts(
  keeperId: string,
  duplicateId: string,
  candidateId?: string,
): Promise<MergeResult> {
  const keeper = await loadAccount(keeperId);
  const duplicate = await loadAccount(duplicateId);
  if (!keeper || !duplicate) throw new MergeLockError("Both businesses must exist.");
  if (keeper.tenantId !== tenant() || duplicate.tenantId !== tenant()) {
    throw new MergeLockError("Accounts must belong to this desk.");
  }
  if (keeperId === duplicateId) {
    throw new MergeLockError("Keeper and duplicate must be different records.");
  }
  if (isAccountRetired(duplicate)) {
    throw new MergeLockError("Duplicate is already retired.");
  }
  if (isAccountRetired(keeper)) {
    throw new MergeLockError("Survivor is already retired.");
  }

  const { copiedFields, patch } = copyMissingFields(
    keeper as unknown as Record<string, unknown>,
    duplicate as unknown as Record<string, unknown>,
    ACCOUNT_COPY_FIELDS,
  );

  // Union tags without wiping survivor values.
  const keeperTags = Array.isArray(keeper.tags) ? keeper.tags : [];
  const dupTags = Array.isArray(duplicate.tags) ? duplicate.tags : [];
  const tagSet = new Set([...keeperTags, ...dupTags].map((t) => String(t).trim()).filter(Boolean));
  const mergedTags = [...tagSet];
  if (mergedTags.length !== keeperTags.length || mergedTags.some((t) => !keeperTags.includes(t))) {
    patch.tags = mergedTags;
    if (!copiedFields.includes("tags")) copiedFields.push("tags");
  }

  const now = new Date();
  const relinked: Record<string, number> = {};

  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx
        .update(accounts)
        .set({ ...(patch as Partial<Account>), updatedAt: now })
        .where(and(eq(accounts.tenantId, tenant()), eq(accounts.id, keeperId)));
    }

    // Linked contacts via contact_accounts — respect unique (tenant, contact, account).
    const dupLinks = await tx
      .select()
      .from(contactAccounts)
      .where(and(eq(contactAccounts.tenantId, tenant()), eq(contactAccounts.accountId, duplicateId)));
    const keeperLinks = await tx
      .select()
      .from(contactAccounts)
      .where(and(eq(contactAccounts.tenantId, tenant()), eq(contactAccounts.accountId, keeperId)));
    const keeperContactIds = new Set(keeperLinks.map((row) => row.contactId));
    let movedLinks = 0;
    let droppedDupLinks = 0;
    for (const link of dupLinks) {
      if (keeperContactIds.has(link.contactId)) {
        await tx.delete(contactAccounts).where(eq(contactAccounts.id, link.id));
        droppedDupLinks += 1;
      } else {
        await tx
          .update(contactAccounts)
          .set({ accountId: keeperId })
          .where(eq(contactAccounts.id, link.id));
        movedLinks += 1;
      }
    }
    relinked.contactAccounts = movedLinks;
    relinked.contactAccountsDropped = droppedDupLinks;

    const contactRows = await tx
      .update(contacts)
      .set({ accountId: keeperId, updatedAt: now })
      .where(and(eq(contacts.tenantId, tenant()), eq(contacts.accountId, duplicateId)))
      .returning({ id: contacts.id });
    relinked.contacts = contactRows.length;

    const dealRows = await tx
      .update(deals)
      .set({ accountId: keeperId, updatedAt: now })
      .where(and(eq(deals.tenantId, tenant()), eq(deals.accountId, duplicateId)))
      .returning({ id: deals.id });
    relinked.deals = dealRows.length;

    const policyRows = await tx
      .update(policies)
      .set({ accountId: keeperId, updatedAt: now })
      .where(and(eq(policies.tenantId, tenant()), eq(policies.accountId, duplicateId)))
      .returning({ id: policies.id });
    relinked.policies = policyRows.length;

    const locationRows = await tx
      .update(locations)
      .set({ accountId: keeperId, updatedAt: now })
      .where(and(eq(locations.tenantId, tenant()), eq(locations.accountId, duplicateId)))
      .returning({ id: locations.id });
    relinked.locations = locationRows.length;

    const activityRows = await tx
      .update(activities)
      .set({ accountId: keeperId, updatedAt: now })
      .where(and(eq(activities.tenantId, tenant()), eq(activities.accountId, duplicateId)))
      .returning({ id: activities.id });
    relinked.activities = activityRows.length;

    const logRows = await tx
      .update(activityLogs)
      .set({ accountId: keeperId })
      .where(and(eq(activityLogs.tenantId, tenant()), eq(activityLogs.accountId, duplicateId)))
      .returning({ id: activityLogs.id });
    relinked.activityLogs = logRows.length;

    const historyRows = await tx
      .update(clientHistory)
      .set({ accountId: keeperId })
      .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.accountId, duplicateId)))
      .returning({ id: clientHistory.id });
    relinked.history = historyRows.length;

    const taskRows = await tx
      .update(reviewTasks)
      .set({ accountId: keeperId })
      .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.accountId, duplicateId)))
      .returning({ id: reviewTasks.id });
    relinked.reviewTasks = taskRows.length;

    const docRows = await tx
      .update(documents)
      .set({ accountId: keeperId })
      .where(and(eq(documents.tenantId, tenant()), eq(documents.accountId, duplicateId)))
      .returning({ id: documents.id });
    relinked.documents = docRows.length;

    const certRows = await tx
      .update(issuedCertificates)
      .set({ accountId: keeperId })
      .where(
        and(eq(issuedCertificates.tenantId, tenant()), eq(issuedCertificates.accountId, duplicateId)),
      )
      .returning({ id: issuedCertificates.id });
    relinked.certificates = certRows.length;

    await tx.insert(clientHistory).values({
      tenantId: tenant(),
      accountId: keeperId,
      eventType: "merge",
      body: `Merged duplicate business into this record. Copied ${copiedFields.join(", ") || "no blank fields"}. Linked contacts, policies, deals, locations, and timeline now point here. Duplicate archived, not deleted.`,
    });

    await tx
      .update(accounts)
      .set({
        mergedIntoId: keeperId,
        archivedAt: now,
        updatedAt: now,
      })
      .where(and(eq(accounts.tenantId, tenant()), eq(accounts.id, duplicateId)));

    await tx.insert(mergeEvents).values({
      tenantId: tenant(),
      entityType: "account",
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

