import { and, desc, eq, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isDueToday, isOverdue, shouldNotifyCall, whenForActivity } from "@/lib/activities/rules";
import { db } from "./index";
import {
  accounts,
  activities,
  activityLogs,
  clientHistory,
  contacts,
  deals,
  policies,
  users,
} from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listDeskUsers() {
  return db.select().from(users).where(eq(users.tenantId, tenant())).orderBy(users.name);
}

export async function listBusinesses() {
  return db.select().from(accounts).where(eq(accounts.tenantId, tenant())).orderBy(accounts.name);
}

export async function getBusiness(id: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenant()), eq(accounts.id, id)));
  return row ?? null;
}

export async function listRelatedOptions() {
  const [contactRows, dealRows, policyRows, businessRows, userRows] = await Promise.all([
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts)
      .where(eq(contacts.tenantId, tenant()))
      .orderBy(contacts.lastName),
    db
      .select({ id: deals.id, title: deals.title })
      .from(deals)
      .where(eq(deals.tenantId, tenant()))
      .orderBy(deals.title),
    db
      .select({ id: policies.id, policyNumber: policies.policyNumber })
      .from(policies)
      .where(eq(policies.tenantId, tenant()))
      .orderBy(policies.policyNumber),
    db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.tenantId, tenant()))
      .orderBy(accounts.name),
    listDeskUsers(),
  ]);
  return {
    contacts: contactRows,
    deals: dealRows,
    policies: policyRows,
    businesses: businessRows,
    users: userRows,
  };
}

export async function listActivities(filter?: {
  contactId?: string;
  accountId?: string;
  businessId?: string;
  policyId?: string;
  dealId?: string;
}) {
  const accountId = filter?.accountId ?? filter?.businessId;
  const where = and(
    eq(activities.tenantId, tenant()),
    filter?.contactId ? eq(activities.contactId, filter.contactId) : undefined,
    accountId ? eq(activities.accountId, accountId) : undefined,
    filter?.policyId ? eq(activities.policyId, filter.policyId) : undefined,
    filter?.dealId ? eq(activities.dealId, filter.dealId) : undefined,
  );
  const rows = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      business: accounts,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .where(where)
    .orderBy(desc(activities.updatedAt));
  return rows;
}

export async function getActivity(id: string) {
  const [row] = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      business: accounts,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .where(and(eq(activities.tenantId, tenant()), eq(activities.id, id)));
  if (!row) return null;
  const events = await db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, tenant()), eq(activityLogs.activityId, id)))
    .orderBy(desc(activityLogs.occurredAt));
  return { ...row, events, attendees: [] as { attendee: unknown; contact: typeof contacts.$inferSelect }[] };
}

export async function timelineFor(filter: {
  contactId?: string;
  accountId?: string;
  businessId?: string;
  policyId?: string;
}) {
  const accountId = filter.accountId ?? filter.businessId;
  return db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.tenantId, tenant()),
        filter.contactId ? eq(activityLogs.contactId, filter.contactId) : undefined,
        accountId ? eq(activityLogs.accountId, accountId) : undefined,
        filter.policyId ? eq(activityLogs.policyId, filter.policyId) : undefined,
      ),
    )
    .orderBy(desc(activityLogs.occurredAt));
}

export async function getContactWorkspace(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, contactId)));
  if (!contact) return null;
  const [policyRows, dealRows, work, timeline] = await Promise.all([
    db.select().from(policies).where(eq(policies.contactId, contactId)),
    db.select().from(deals).where(eq(deals.contactId, contactId)).orderBy(desc(deals.updatedAt)),
    listActivities({ contactId }),
    timelineFor({ contactId }),
  ]);
  return { contact, policies: policyRows, deals: dealRows, work, timeline };
}

export async function getPolicyWorkspace(policyId: string) {
  const [row] = await db
    .select({ policy: policies, contact: contacts })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, policyId)));
  if (!row) return null;
  const [work, timeline] = await Promise.all([listActivities({ policyId }), timelineFor({ policyId })]);
  return { ...row, work, timeline };
}

export async function getBusinessWorkspace(businessId: string) {
  const business = await getBusiness(businessId);
  if (!business) return null;
  const [work, timeline] = await Promise.all([
    listActivities({ accountId: businessId }),
    timelineFor({ accountId: businessId }),
  ]);
  return { business, contact: null, work, timeline, policyRows: [] as { policy: typeof policies.$inferSelect; carrier: null }[] };
}

export async function deskQueue(now = new Date()) {
  const rows = await listActivities();
  const open = rows.filter(
    (row) => row.activity.status !== "completed" && row.activity.status !== "canceled" && row.activity.status !== "cancelled",
  );
  const dueToday = open.filter((row) => isDueToday(whenForActivity(row.activity), now, row.activity.status));
  const overdue = open.filter((row) => isOverdue(whenForActivity(row.activity), now, row.activity.status));
  const makeThisCall = open.filter((row) =>
    shouldNotifyCall({
      kind: row.activity.kind,
      when: whenForActivity(row.activity),
      reminderMinutes: null,
      now,
      status: row.activity.status,
      outcome: null,
    }),
  );
  return { dueToday, overdue, makeThisCall, open };
}

export async function countOpenWork() {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, tenant()),
        or(eq(activities.status, "incomplete"), eq(activities.status, "in_progress"), eq(activities.status, "open")),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function listClientHistory(contactId: string) {
  return db
    .select()
    .from(clientHistory)
    .where(and(eq(clientHistory.tenantId, tenant()), eq(clientHistory.contactId, contactId)))
    .orderBy(desc(clientHistory.occurredAt));
}
