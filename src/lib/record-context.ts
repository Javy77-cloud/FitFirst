import { and, desc, eq, inArray, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID, formatDay } from "@/lib/domain";
import { isDeskUuid } from "@/lib/desk-id";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  activityLogs,
  contacts,
  deals,
  leads,
  policies,
  reviewTasks,
} from "@/lib/db/schema";
import {
  activityHref,
  personKey,
  type RailConversation,
  type RailDeal,
  type RailOpenActivity,
  type RailPerson,
  type RailPolicy,
  type RecordContextPayload,
  type RecordContextScope,
} from "@/lib/record-context-types";

export type {
  RailConversation,
  RailDeal,
  RailOpenActivity,
  RailPerson,
  RailPolicy,
  RecordContextPayload,
  RecordContextScope,
} from "@/lib/record-context-types";
export { activityHref, groupOpenActivities, personKey } from "@/lib/record-context-types";

const OPEN_STATUSES = new Set(["open", "incomplete", "in_progress", "todo"]);

export async function loadRecordContext(
  scope: RecordContextScope,
  extras?: { conversations?: RailConversation[] },
): Promise<RecordContextPayload> {
  const tenant = DEFAULT_TENANT_ID;
  const people: RailPerson[] = [];
  const dealMap = new Map<string, RailDeal>();
  const policyMap = new Map<string, RailPolicy>();

  if (scope.contactId) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenant), eq(contacts.id, scope.contactId)));
    if (contact) {
      people.push({
        key: personKey("contact", contact.id),
        label: `${contact.firstName} ${contact.lastName}`,
        href: `/contacts/${contact.id}`,
        phone: contact.phone,
        email: contact.email,
        kindLabel: "Contact",
      });
    }
  }

  if (scope.leadId) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenant), eq(leads.id, scope.leadId)));
    if (lead) {
      people.push({
        key: personKey("lead", lead.id),
        label: `${lead.firstName} ${lead.lastName}`,
        href: `/leads/${lead.id}`,
        phone: lead.phone,
        email: lead.email,
        kindLabel: "Lead",
      });
    }
  }

  if (scope.accountId) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenant), eq(accounts.id, scope.accountId)));
    if (account) {
      people.push({
        key: personKey("account", account.id),
        label: account.name,
        href: `/accounts/${account.id}`,
        phone: account.phone ?? null,
        email: account.email ?? null,
        kindLabel: "Account",
      });
    }
  }

  const dealIds = new Set<string>();
  if (scope.dealId) dealIds.add(scope.dealId);
  if (scope.contactId) {
    const rows = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.tenantId, tenant), eq(deals.contactId, scope.contactId)));
    for (const row of rows) dealIds.add(row.id);
  }
  if (scope.leadId) {
    const rows = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.tenantId, tenant), eq(deals.leadId, scope.leadId)));
    for (const row of rows) dealIds.add(row.id);
  }
  if (scope.accountId) {
    const rows = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.tenantId, tenant), eq(deals.accountId, scope.accountId)));
    for (const row of rows) dealIds.add(row.id);
  }

  if (dealIds.size > 0) {
    const rows = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenant), inArray(deals.id, [...dealIds])))
      .orderBy(desc(deals.updatedAt));
    for (const deal of rows) {
      dealMap.set(deal.id, {
        id: deal.id,
        title: deal.title,
        stage: deal.pipelineStage,
        href: `/deals/${deal.id}`,
      });
    }
  }

  const policyIds = new Set<string>();
  if (scope.policyId) policyIds.add(scope.policyId);
  if (scope.contactId) {
    const rows = await db
      .select({ id: policies.id })
      .from(policies)
      .where(and(eq(policies.tenantId, tenant), eq(policies.contactId, scope.contactId)));
    for (const row of rows) policyIds.add(row.id);
  }
  if (scope.accountId) {
    const rows = await db
      .select({ id: policies.id })
      .from(policies)
      .where(and(eq(policies.tenantId, tenant), eq(policies.accountId, scope.accountId)));
    for (const row of rows) policyIds.add(row.id);
  }
  if (policyIds.size > 0) {
    const rows = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant), inArray(policies.id, [...policyIds])))
      .orderBy(desc(policies.updatedAt));
    for (const policy of rows) {
      policyMap.set(policy.id, {
        id: policy.id,
        number: policy.policyNumber,
        status: policy.status,
        href: `/policies/${policy.id}`,
      });
    }
  }

  const relatedOr: ReturnType<typeof eq>[] = [];
  if (scope.contactId) relatedOr.push(eq(activities.contactId, scope.contactId));
  if (scope.leadId) relatedOr.push(eq(activities.leadId, scope.leadId));
  if (scope.dealId) relatedOr.push(eq(activities.dealId, scope.dealId));
  if (scope.policyId) relatedOr.push(eq(activities.policyId, scope.policyId));
  if (scope.accountId) relatedOr.push(eq(activities.accountId, scope.accountId));

  let openActivities: RailOpenActivity[] = [];
  let conversations: RailConversation[] = extras?.conversations ? [...extras.conversations] : [];

  if (relatedOr.length > 0) {
    const rows = await db
      .select()
      .from(activities)
      .where(and(eq(activities.tenantId, tenant), or(...relatedOr)))
      .orderBy(desc(activities.updatedAt));
    openActivities = rows
      .filter((row) => OPEN_STATUSES.has(row.status))
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        href: activityHref(row.kind, row.id),
        when: formatDay(row.dueAt ?? row.startAt),
      }));

    const ids = rows.map((row) => row.id);
    if (ids.length > 0) {
      const logs = await db
        .select()
        .from(activityLogs)
        .where(and(eq(activityLogs.tenantId, tenant), inArray(activityLogs.activityId, ids)))
        .orderBy(desc(activityLogs.occurredAt));
      conversations = [
        ...conversations,
        ...logs.slice(0, 20).map((log) => ({
          id: log.id,
          title: `${log.kind} · ${log.eventType}`,
          body: log.body,
          when: formatDay(log.occurredAt),
        })),
      ];
    }
  }

  return {
    people,
    deals: [...dealMap.values()],
    policies: [...policyMap.values()],
    openActivities,
    conversations,
    newDealHref: "/deals/new",
    newActivityHref: "/calendar",
  };
}

export async function getActivityRecord(id: string) {
  if (!isDeskUuid(id)) return null;
  const [row] = await db
    .select({
      activity: activities,
      contact: contacts,
      lead: leads,
      deal: deals,
      policy: policies,
      account: accounts,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(leads, eq(activities.leadId, leads.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  if (!row) return null;
  const events = await db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, DEFAULT_TENANT_ID), eq(activityLogs.activityId, id)))
    .orderBy(desc(activityLogs.occurredAt));
  return { ...row, events };
}

export async function getReviewTaskRecord(id: string) {
  if (!isDeskUuid(id)) return null;
  const [row] = await db
    .select({
      task: reviewTasks,
      contact: contacts,
      deal: deals,
      policy: policies,
      account: accounts,
    })
    .from(reviewTasks)
    .leftJoin(contacts, eq(reviewTasks.contactId, contacts.id))
    .leftJoin(deals, eq(reviewTasks.dealId, deals.id))
    .leftJoin(policies, eq(reviewTasks.policyId, policies.id))
    .leftJoin(accounts, eq(reviewTasks.accountId, accounts.id))
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)));
  return row ?? null;
}
