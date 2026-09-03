import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import {
  activities,
  activityLogs,
  calendarConnections,
  campaignSendLogs,
  contacts,
  deals,
  documentFolders,
  documents,
  emailCampaigns,
  extractedFields,
  leads,
  policies,
  signatureEnvelopes,
  smsSettings,
} from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listActivities(kind?: string) {
  const where = kind
    ? and(eq(activities.tenantId, tenant()), eq(activities.kind, kind))
    : eq(activities.tenantId, tenant());
  return db.select().from(activities).where(where).orderBy(desc(activities.updatedAt));
}

export async function getActivity(id: string) {
  const [row] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, tenant()), eq(activities.id, id)));
  return row ?? null;
}

export async function listActivityLogs(activityId: string) {
  return db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, tenant()), eq(activityLogs.activityId, activityId)))
    .orderBy(desc(activityLogs.occurredAt));
}

export async function listDueCalls() {
  const rows = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .where(and(eq(activities.tenantId, tenant()), eq(activities.kind, "call")));
  const now = new Date();
  return rows.filter(({ activity }) => {
    if (activity.status === "completed") return false;
    const when = activity.startAt ?? activity.dueAt;
    return Boolean(when && when.getTime() <= now.getTime());
  });
}

export async function listRelatedOptions() {
  const [contactRows, dealRows, policyRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        phone: contacts.phone,
      })
      .from(contacts)
      .where(eq(contacts.tenantId, tenant()))
      .orderBy(contacts.lastName),
    db
      .select({ id: deals.id, title: deals.title, pipelineStage: deals.pipelineStage })
      .from(deals)
      .where(eq(deals.tenantId, tenant()))
      .orderBy(desc(deals.updatedAt)),
    db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        contactId: policies.contactId,
      })
      .from(policies)
      .where(eq(policies.tenantId, tenant()))
      .orderBy(desc(policies.expirationDate)),
  ]);
  return { contacts: contactRows, deals: dealRows, policies: policyRows };
}

export async function getGoogleCalendarConnection() {
  const [row] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(eq(calendarConnections.tenantId, tenant()), eq(calendarConnections.provider, "google")),
    );
  return row ?? null;
}

export async function listFolders() {
  return db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.tenantId, tenant()))
    .orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name));
}

export async function getFolder(id: string) {
  const [row] = await db
    .select()
    .from(documentFolders)
    .where(and(eq(documentFolders.tenantId, tenant()), eq(documentFolders.id, id)));
  return row ?? null;
}

export async function listFolderChildren(parentId: string | null, kind?: string) {
  const filters = [
    eq(documentFolders.tenantId, tenant()),
    parentId ? eq(documentFolders.parentId, parentId) : isNull(documentFolders.parentId),
    kind ? eq(documentFolders.kind, kind) : undefined,
  ];
  return db
    .select()
    .from(documentFolders)
    .where(and(...filters))
    .orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name));
}

export async function listDocumentsInFolder(folderId: string | null) {
  if (!folderId) {
    return db
      .select()
      .from(documents)
      .where(and(eq(documents.tenantId, tenant()), isNull(documents.folderId)))
      .orderBy(desc(documents.createdAt));
  }
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenant()), eq(documents.folderId, folderId)))
    .orderBy(desc(documents.createdAt));
}

export async function folderFileCounts() {
  const rows = await db
    .select({
      folderId: documents.folderId,
      id: documents.id,
    })
    .from(documents)
    .where(eq(documents.tenantId, tenant()));
  const counts = new Map<string, number>();
  let unfiled = 0;
  for (const row of rows) {
    if (!row.folderId) {
      unfiled += 1;
      continue;
    }
    counts.set(row.folderId, (counts.get(row.folderId) ?? 0) + 1);
  }
  return { counts, unfiled };
}

export async function listDocumentsWithExtracted() {
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenant()))
    .orderBy(desc(documents.createdAt));
  const fields = await db
    .select()
    .from(extractedFields)
    .where(eq(extractedFields.tenantId, tenant()));
  return { docs, fields };
}

export async function documentsForEntity(input: {
  contactId?: string;
  dealId?: string;
  policyId?: string;
}) {
  const filters = [
    input.contactId ? eq(documents.contactId, input.contactId) : undefined,
    input.dealId ? eq(documents.dealId, input.dealId) : undefined,
    input.policyId ? eq(documents.policyId, input.policyId) : undefined,
  ].filter(Boolean);
  if (filters.length === 0) return [];
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenant()), or(...filters)))
    .orderBy(desc(documents.createdAt));
}

export async function getContactWorkspace(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, contactId)));
  if (!contact) return null;
  const [docs, contactActivities, contactPolicies, contactDeals] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(and(eq(documents.tenantId, tenant()), eq(documents.contactId, contactId)))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, tenant()), eq(activities.contactId, contactId)))
      .orderBy(desc(activities.updatedAt)),
    db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, contactId))),
    db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenant()), eq(deals.contactId, contactId))),
  ]);
  return { contact, docs, activities: contactActivities, policies: contactPolicies, deals: contactDeals };
}

export async function getPolicyWorkspace(policyId: string) {
  const [row] = await db
    .select({
      policy: policies,
      contact: contacts,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!row) return null;
  const [docs, policyActivities] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(and(eq(documents.tenantId, tenant()), eq(documents.policyId, policyId)))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, tenant()), eq(activities.policyId, policyId)))
      .orderBy(desc(activities.updatedAt)),
  ]);
  return { ...row, docs, activities: policyActivities };
}

export async function listCampaigns() {
  return db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.tenantId, tenant()))
    .orderBy(desc(emailCampaigns.updatedAt));
}

export async function getCampaign(id: string) {
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(and(eq(emailCampaigns.tenantId, tenant()), eq(emailCampaigns.id, id)));
  if (!campaign) return null;
  const logs = await db
    .select()
    .from(campaignSendLogs)
    .where(and(eq(campaignSendLogs.tenantId, tenant()), eq(campaignSendLogs.campaignId, id)))
    .orderBy(desc(campaignSendLogs.loggedAt));
  return { campaign, logs };
}

export async function listContactTags() {
  const rows = await db
    .select({ tags: contacts.tags })
    .from(contacts)
    .where(eq(contacts.tenantId, tenant()));
  const set = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return [...set].sort();
}

export async function resolveCampaignAudience(audienceType: string, audienceValue: string) {
  if (audienceType === "tag") {
    const tag = audienceValue.trim().toLowerCase();
    const rows = await db.select().from(contacts).where(eq(contacts.tenantId, tenant()));
    return rows
      .filter((c) => (c.tags ?? []).map((t) => t.toLowerCase()).includes(tag))
      .map((c) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
      }));
  }

  const stage = audienceValue.trim().toLowerCase();
  const rows = await db
    .select({
      deal: deals,
      contact: contacts,
      lead: leads,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .where(and(eq(deals.tenantId, tenant()), eq(deals.pipelineStage, stage)));

  return rows.map(({ deal, contact, lead }) => ({
    name:
      contact
        ? `${contact.firstName} ${contact.lastName}`.trim()
        : lead
          ? `${lead.firstName} ${lead.lastName}`.trim()
          : deal.title,
    email: contact?.email ?? lead?.email ?? null,
  }));
}

export async function listEnvelopes() {
  return db
    .select({
      envelope: signatureEnvelopes,
      document: documents,
    })
    .from(signatureEnvelopes)
    .innerJoin(documents, eq(signatureEnvelopes.documentId, documents.id))
    .where(eq(signatureEnvelopes.tenantId, tenant()))
    .orderBy(desc(signatureEnvelopes.updatedAt));
}

export async function getSmsSettings() {
  const [row] = await db
    .select()
    .from(smsSettings)
    .where(eq(smsSettings.tenantId, tenant()));
  return row ?? null;
}

export async function distinctDocumentTags() {
  const rows = await db
    .select({ tags: documents.tags })
    .from(documents)
    .where(eq(documents.tenantId, tenant()));
  const set = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return [...set].sort();
}
