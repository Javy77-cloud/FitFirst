import { and, desc, eq, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  isDueToday,
  isOverdue,
  shouldNotifyCall,
  whenForActivity,
} from "@/lib/activities/rules";
import { db } from "./index";
import {
  activities,
  activityAttendees,
  activityEvents,
  businesses,
  clientHistory,
  contacts,
  deals,
  policies,
  users,
} from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listDeskUsers() {
  return db
    .select()
    .from(users)
    .where(eq(users.tenantId, tenant()))
    .orderBy(users.name);
}

export async function listBusinesses() {
  return db
    .select()
    .from(businesses)
    .where(eq(businesses.tenantId, tenant()))
    .orderBy(businesses.name);
}

export async function getBusiness(id: string) {
  const [row] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.tenantId, tenant()), eq(businesses.id, id)));
  return row ?? null;
}

export async function listRelatedOptions() {
  const [contactRows, dealRows, policyRows, businessRows, userRows] = await Promise.all([
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
        lineOfBusiness: policies.lineOfBusiness,
        status: policies.status,
      })
      .from(policies)
      .where(eq(policies.tenantId, tenant()))
      .orderBy(desc(policies.expirationDate)),
    db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(eq(businesses.tenantId, tenant()))
      .orderBy(businesses.name),
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

export async function listActivities(filters?: {
  kind?: string;
  status?: string;
  policyId?: string;
  contactId?: string;
  dealId?: string;
  businessId?: string;
  from?: Date;
  to?: Date;
}) {
  const clauses = [eq(activities.tenantId, tenant())];
  if (filters?.kind) clauses.push(eq(activities.kind, filters.kind));
  if (filters?.status) clauses.push(eq(activities.status, filters.status));
  if (filters?.policyId) clauses.push(eq(activities.policyId, filters.policyId));
  if (filters?.contactId) clauses.push(eq(activities.contactId, filters.contactId));
  if (filters?.dealId) clauses.push(eq(activities.dealId, filters.dealId));
  if (filters?.businessId) clauses.push(eq(activities.businessId, filters.businessId));

  const rows = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      deal: deals,
      business: businesses,
      assigneeUser: users,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(businesses, eq(activities.businessId, businesses.id))
    .leftJoin(users, eq(activities.assigneeId, users.id))
    .where(and(...clauses))
    .orderBy(desc(activities.updatedAt));

  return rows.filter((row) => {
    if (!filters?.from && !filters?.to) return true;
    const when = whenForActivity(row.activity);
    if (!when) return false;
    if (filters.from && when < filters.from) return false;
    if (filters.to && when >= filters.to) return false;
    return true;
  });
}

export async function getActivity(id: string) {
  const [row] = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      deal: deals,
      business: businesses,
      assigneeUser: users,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(businesses, eq(activities.businessId, businesses.id))
    .leftJoin(users, eq(activities.assigneeId, users.id))
    .where(and(eq(activities.tenantId, tenant()), eq(activities.id, id)));
  if (!row) return null;
  const events = await db
    .select()
    .from(activityEvents)
    .where(and(eq(activityEvents.tenantId, tenant()), eq(activityEvents.activityId, id)))
    .orderBy(desc(activityEvents.occurredAt));
  const attendees = await db
    .select({
      attendee: activityAttendees,
      contact: contacts,
    })
    .from(activityAttendees)
    .innerJoin(contacts, eq(activityAttendees.contactId, contacts.id))
    .where(
      and(eq(activityAttendees.tenantId, tenant()), eq(activityAttendees.activityId, id)),
    );
  return { ...row, events, attendees };
}

export async function listActivityEvents(activityId: string) {
  return db
    .select()
    .from(activityEvents)
    .where(
      and(eq(activityEvents.tenantId, tenant()), eq(activityEvents.activityId, activityId)),
    )
    .orderBy(desc(activityEvents.occurredAt));
}

export async function timelineFor(filter: {
  contactId?: string;
  policyId?: string;
  dealId?: string;
  businessId?: string;
  type?: string;
  status?: string;
  from?: Date;
  to?: Date;
}) {
  const clauses = [eq(clientHistory.tenantId, tenant())];
  if (filter.contactId) clauses.push(eq(clientHistory.contactId, filter.contactId));
  if (filter.policyId) clauses.push(eq(clientHistory.policyId, filter.policyId));
  if (filter.dealId) clauses.push(eq(clientHistory.dealId, filter.dealId));
  if (filter.businessId) clauses.push(eq(clientHistory.businessId, filter.businessId));
  if (filter.type) clauses.push(eq(clientHistory.eventType, filter.type));

  const rows = await db
    .select({
      history: clientHistory,
      activity: activities,
      policy: policies,
    })
    .from(clientHistory)
    .leftJoin(activities, eq(clientHistory.activityId, activities.id))
    .leftJoin(policies, eq(clientHistory.policyId, policies.id))
    .where(and(...clauses))
    .orderBy(desc(clientHistory.occurredAt));

  return rows.filter((row) => {
    if (filter.status && row.activity?.status !== filter.status) return false;
    if (filter.from && row.history.occurredAt < filter.from) return false;
    if (filter.to && row.history.occurredAt >= filter.to) return false;
    if (filter.policyId && !row.history.policyId && row.activity?.policyId !== filter.policyId) {
      return false;
    }
    return true;
  });
}

export async function getContactWorkspace(contactId: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, contactId)));
  if (!contact) return null;
  const [policyRows, dealRows, work, timeline] = await Promise.all([
    db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, contactId)))
      .orderBy(desc(policies.expirationDate)),
    db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenant()), eq(deals.contactId, contactId)))
      .orderBy(desc(deals.updatedAt)),
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
  const [work, timeline] = await Promise.all([
    listActivities({ policyId }),
    timelineFor({ policyId }),
  ]);
  return { ...row, work, timeline };
}

export async function getBusinessWorkspace(businessId: string) {
  const business = await getBusiness(businessId);
  if (!business) return null;
  const [work, timeline] = await Promise.all([
    listActivities({ businessId }),
    timelineFor({ businessId }),
  ]);
  const [contact] = business.primaryContactId
    ? await db.select().from(contacts).where(eq(contacts.id, business.primaryContactId))
    : [];
  return { business, contact: contact ?? null, work, timeline };
}

export async function deskQueue(now = new Date()) {
  const rows = await listActivities();
  const open = rows.filter(
    (row) =>
      row.activity.status !== "completed" &&
      row.activity.status !== "canceled" &&
      row.activity.status !== "cancelled",
  );
  const dueToday = open.filter((row) => isDueToday(whenForActivity(row.activity), now, row.activity.status));
  const overdue = open.filter((row) => isOverdue(whenForActivity(row.activity), now, row.activity.status));
  const makeThisCall = open.filter((row) =>
    shouldNotifyCall({
      kind: row.activity.kind,
      when: whenForActivity(row.activity),
      reminderMinutes: row.activity.reminderMinutes,
      now,
      status: row.activity.status,
      outcome: row.activity.outcome,
    }),
  );
  return { dueToday, overdue, makeThisCall, open };
}

export async function countOpenWork() {
  const [row] = await db
    .select({
      n: sql<number>`count(*)`,
    })
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, tenant()),
        or(eq(activities.status, "incomplete"), eq(activities.status, "in_progress"), eq(activities.status, "open"), eq(activities.status, "delayed"), eq(activities.status, "rescheduled")),
      ),
    );
  return Number(row?.n ?? 0);
}
