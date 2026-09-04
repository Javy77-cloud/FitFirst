import { and, asc, desc, eq, or, type SQL } from "drizzle-orm";
import type { ApiActor } from "@/lib/auth/api";
import { visibleOwnerId } from "@/lib/auth/rbac";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { clientStatusFromCounts, isInForcePolicyStatus } from "@/lib/lifecycle/client-status";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  activityLogs,
  commissions,
  contacts,
  deals,
  leads,
  policies,
  carriers,
} from "@/lib/db/schema";
import { serializeActivity, serializeCommission, serializeContact, serializeDeal, serializePolicy } from "./serialize";

const tenant = () => DEFAULT_TENANT_ID;

function ownerEq(actor: ApiActor, column: typeof contacts.ownerId) {
  const ownerId = visibleOwnerId(actor);
  return ownerId ? eq(column, ownerId) : undefined;
}

export async function listApiContacts(
  actor: ApiActor,
  filter: { q?: string | null; status?: string | null } = {},
) {
  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), ownerEq(actor, contacts.ownerId)))
    .orderBy(asc(contacts.lastName), asc(contacts.firstName));
  const allPolicies = await db.select().from(policies).where(eq(policies.tenantId, tenant()));
  const q = (filter.q ?? "").trim().toLowerCase();
  return rows
    .map((contact) => {
      const related = allPolicies.filter((p) => p.contactId === contact.id);
      const lifetime = related.length;
      const inForce = related.filter((p) => isInForcePolicyStatus(p.status)).length;
      return serializeContact({
        ...contact,
        lifetimePolicyCount: lifetime,
        activePolicyCount: inForce,
        clientStatus: clientStatusFromCounts(lifetime, inForce),
      });
    })
    .filter((row) => {
      if (filter.status && row.client_status !== filter.status) return false;
      if (!q) return true;
      const hay = [row.first_name, row.last_name, row.email, row.phone, row.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
}

export async function getApiContact(actor: ApiActor, id: string) {
  if (!isUuid(id)) return null;
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, id), ownerEq(actor, contacts.ownerId)));
  if (!contact) return null;
  const related = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.contactId, id)));
  const lifetime = related.length;
  const inForce = related.filter((p) => isInForcePolicyStatus(p.status)).length;
  return serializeContact({
    ...contact,
    lifetimePolicyCount: lifetime,
    activePolicyCount: inForce,
    clientStatus: clientStatusFromCounts(lifetime, inForce),
  });
}

export async function listApiPolicies(
  actor: ApiActor,
  filter: { status?: string | null; line?: string | null } = {},
) {
  const rows = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(and(eq(policies.tenantId, tenant()), ownerEq(actor, policies.ownerId)))
    .orderBy(asc(policies.expirationDate));
  return rows
    .filter(({ policy }) => {
      if (filter.status && policy.status.toLowerCase() !== filter.status.toLowerCase()) return false;
      if (filter.line && policy.lineOfBusiness.toLowerCase() !== filter.line.toLowerCase()) return false;
      return true;
    })
    .map(serializePolicy);
}

export async function getApiPolicy(actor: ApiActor, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(and(eq(policies.tenantId, tenant()), eq(policies.id, id), ownerEq(actor, policies.ownerId)));
  return row ? serializePolicy(row) : null;
}

export async function listApiDeals(
  actor: ApiActor,
  filter: { stage?: string | null; q?: string | null } = {},
) {
  const rows = await db
    .select({
      deal: deals,
      contact: contacts,
      account: accounts,
      lead: leads,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .where(and(eq(deals.tenantId, tenant()), ownerEq(actor, deals.ownerId)))
    .orderBy(desc(deals.updatedAt));
  const q = (filter.q ?? "").trim().toLowerCase();
  return rows
    .filter(({ deal }) => {
      if (filter.stage && deal.pipelineStage.toLowerCase() !== filter.stage.toLowerCase()) return false;
      if (!q) return true;
      return deal.title.toLowerCase().includes(q);
    })
    .map(serializeDeal);
}

export async function getApiDeal(actor: ApiActor, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      deal: deals,
      contact: contacts,
      account: accounts,
      lead: leads,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .where(and(eq(deals.tenantId, tenant()), eq(deals.id, id), ownerEq(actor, deals.ownerId)));
  return row ? serializeDeal(row) : null;
}

function activityOwnerWhere(actor: ApiActor): SQL | undefined {
  const ownerId = visibleOwnerId(actor);
  if (!ownerId) return undefined;
  return or(
    eq(contacts.ownerId, ownerId),
    eq(policies.ownerId, ownerId),
    eq(deals.ownerId, ownerId),
    eq(activities.createdByUserId, ownerId),
  );
}

export async function listApiActivities(
  actor: ApiActor,
  filter: {
    kind?: string | null;
    status?: string | null;
    contactId?: string | null;
    policyId?: string | null;
    dealId?: string | null;
  } = {},
) {
  const rows = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      business: accounts,
      deal: deals,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .where(
      and(
        eq(activities.tenantId, tenant()),
        activityOwnerWhere(actor),
        filter.kind ? eq(activities.kind, filter.kind) : undefined,
        filter.status ? eq(activities.status, filter.status) : undefined,
        filter.contactId && isUuid(filter.contactId)
          ? eq(activities.contactId, filter.contactId)
          : undefined,
        filter.policyId && isUuid(filter.policyId) ? eq(activities.policyId, filter.policyId) : undefined,
        filter.dealId && isUuid(filter.dealId) ? eq(activities.dealId, filter.dealId) : undefined,
      ),
    )
    .orderBy(desc(activities.updatedAt));
  return rows.map(serializeActivity);
}

export async function getApiActivity(actor: ApiActor, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      activity: activities,
      contact: contacts,
      policy: policies,
      business: accounts,
      deal: deals,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .where(and(eq(activities.tenantId, tenant()), eq(activities.id, id), activityOwnerWhere(actor)));
  if (!row) return null;
  const events = await db
    .select({
      id: activityLogs.id,
      kind: activityLogs.kind,
      eventType: activityLogs.eventType,
      body: activityLogs.body,
      occurredAt: activityLogs.occurredAt,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, tenant()), eq(activityLogs.activityId, id)))
    .orderBy(desc(activityLogs.occurredAt));
  return {
    ...serializeActivity(row),
    events: events.map((event) => ({
      id: event.id,
      kind: event.kind,
      event_type: event.eventType,
      body: event.body,
      occurred_at: event.occurredAt.toISOString(),
    })),
  };
}

export async function listApiCommissions(actor: ApiActor) {
  const ownerId = visibleOwnerId(actor);
  const rows = await db
    .select({
      commission: commissions,
      policy: policies,
    })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .where(
      and(
        eq(commissions.tenantId, tenant()),
        ownerId ? or(eq(commissions.agentId, ownerId), eq(policies.ownerId, ownerId)) : undefined,
      ),
    )
    .orderBy(desc(commissions.updatedAt));
  return rows.map(serializeCommission);
}

export function contactCsvRows(items: ReturnType<typeof serializeContact>[]) {
  return items.map((row) => [
    row.id,
    row.first_name,
    row.last_name,
    row.email,
    row.phone,
    row.mailing_address,
    row.city,
    row.state,
    row.zip,
    row.date_of_birth,
    row.language,
    row.status,
    row.client_status,
    row.lifetime_policy_count,
    row.active_policy_count,
    row.owner_id,
    row.created_at,
    row.updated_at,
  ]);
}

export function policyCsvRows(items: ReturnType<typeof serializePolicy>[]) {
  return items.map((row) => [
    row.id,
    row.policy_number,
    row.line_of_business,
    row.status,
    row.premium,
    row.effective_date,
    row.expiration_date,
    row.contact_id,
    row.contact_name,
    row.account_id,
    row.account_name,
    row.deal_id,
    row.carrier_id,
    row.carrier_name,
    row.producer,
    row.owner_id,
    row.created_at,
  ]);
}

export function commissionCsvRows(items: ReturnType<typeof serializeCommission>[]) {
  return items.map((row) => [
    row.id,
    row.policy_id,
    row.policy_number,
    row.carrier_id,
    row.line_of_business,
    row.premium,
    row.rate_pct,
    row.amount,
    row.status,
    row.due_date,
    row.paid_date,
    row.period,
    row.agent_id,
    row.created_at,
  ]);
}
