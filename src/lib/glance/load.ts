import { and, desc, eq, inArray } from "drizzle-orm";
import { requireSignedIn } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  claims,
  contacts,
  deals,
  policies,
  policyEvents,
  policyWorkItems,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import { partyLabel } from "@/lib/desk/policy-name";
import { deskNow } from "@/lib/home/as-of";
import { filterOwned, rowsForTab, type GlanceRecord, type GlanceServiceItem } from "./filter";
import { parseGlanceTab, type GlanceTab } from "./tabs";

const tenant = () => DEFAULT_TENANT_ID;

function namesById(rows: { id: string; name: string }[]) {
  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function loadGlance(tabRaw?: string | null): Promise<{
  session: Awaited<ReturnType<typeof requireSignedIn>>;
  tab: GlanceTab;
  rows: GlanceRecord[];
  counts: Record<GlanceTab, number>;
}> {
  const session = await requireSignedIn();
  const tab = parseGlanceTab(tabRaw);
  const scope = { isAdmin: session.isAdmin, userId: session.userId };

  const [people, dealRows, policyRows, claimRows, taskRows, eventRows, workRows, activityRows] =
    await Promise.all([
      db.select({ id: users.id, name: users.name }).from(users).where(eq(users.tenantId, tenant())),
      db
        .select({
          deal: deals,
          contact: contacts,
          account: accounts,
        })
        .from(deals)
        .leftJoin(contacts, eq(deals.contactId, contacts.id))
        .leftJoin(accounts, eq(deals.accountId, accounts.id))
        .where(eq(deals.tenantId, tenant()))
        .orderBy(desc(deals.updatedAt)),
      db
        .select({
          policy: policies,
          contact: contacts,
          account: accounts,
        })
        .from(policies)
        .leftJoin(contacts, eq(policies.contactId, contacts.id))
        .leftJoin(accounts, eq(policies.accountId, accounts.id))
        .where(eq(policies.tenantId, tenant())),
      db
        .select({
          claim: claims,
          policy: policies,
          contact: contacts,
        })
        .from(claims)
        .leftJoin(policies, eq(claims.policyId, policies.id))
        .leftJoin(contacts, eq(policies.contactId, contacts.id))
        .where(eq(claims.tenantId, tenant())),
      db
        .select()
        .from(reviewTasks)
        .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.status, "open")))
        .orderBy(reviewTasks.dueDate),
      db
        .select()
        .from(policyEvents)
        .where(and(eq(policyEvents.tenantId, tenant()), eq(policyEvents.kind, "endorsement"))),
      db.select().from(policyWorkItems).where(eq(policyWorkItems.tenantId, tenant())),
      db
        .select()
        .from(activities)
        .where(
          and(eq(activities.tenantId, tenant()), eq(activities.kind, "task"), eq(activities.status, "open")),
        ),
    ]);

  const names = namesById(people);
  const policyById = new Map(policyRows.map((row) => [row.policy.id, row]));
  const dealById = new Map(dealRows.map((row) => [row.deal.id, row]));

  const glanceDeals = dealRows.map(({ deal, contact, account }) => ({
    id: deal.id,
    title: deal.title,
    pipelineStage: deal.pipelineStage,
    lineOfBusiness: deal.lineOfBusiness,
    ownerId: deal.ownerId,
    ownerName: deal.ownerId ? names.get(deal.ownerId) ?? null : null,
    party: partyLabel(contact, account) || deal.primaryNamedInsured || "—",
    updatedAt: deal.updatedAt,
    archivedAt: deal.archivedAt,
  }));

  const glancePolicies = policyRows.map(({ policy, contact, account }) => ({
    id: policy.id,
    policyNumber: policy.policyNumber,
    status: policy.status,
    lineOfBusiness: policy.lineOfBusiness,
    ownerId: policy.ownerId,
    ownerName: policy.ownerId ? names.get(policy.ownerId) ?? null : null,
    party: partyLabel(contact, account) || "—",
    premium: policy.premium == null ? 0 : Number(policy.premium),
    expirationDate: policy.expirationDate,
  }));

  const glanceClaims = claimRows.map(({ claim, policy, contact }) => ({
    id: claim.id,
    status: claim.status,
    causeType: claim.causeType,
    carrierClaimNumber: claim.carrierClaimNumber,
    description: claim.description,
    dateReported: claim.dateReported,
    policyNumber: policy?.policyNumber ?? null,
    party: contact ? partyLabel(contact, null) : "—",
    ownerId: policy?.ownerId ?? null,
    ownerName: policy?.ownerId ? names.get(policy.ownerId) ?? null : null,
  }));

  const service: GlanceServiceItem[] = [];

  for (const task of taskRows) {
    const policy = task.policyId ? policyById.get(task.policyId) : undefined;
    const deal = task.dealId ? dealById.get(task.dealId) : undefined;
    const ownerId = policy?.policy.ownerId ?? deal?.deal.ownerId ?? null;
    service.push({
      id: task.id,
      kind: "task",
      title: task.title,
      status: task.status,
      href: `/tasks/${task.id}`,
      party:
        partyLabel(policy?.contact ?? null, policy?.account ?? null) ||
        partyLabel(deal?.contact ?? null, deal?.account ?? null) ||
        "—",
      ownerId,
      ownerName: ownerId ? names.get(ownerId) ?? null : null,
      detail: task.kind,
      when: task.dueDate,
    });
  }

  const activityPolicyIds = activityRows.map((row) => row.policyId).filter((id): id is string => Boolean(id));
  const extraPolicies =
    activityPolicyIds.length === 0
      ? []
      : await db
          .select({
            policy: policies,
            contact: contacts,
            account: accounts,
          })
          .from(policies)
          .leftJoin(contacts, eq(policies.contactId, contacts.id))
          .leftJoin(accounts, eq(policies.accountId, accounts.id))
          .where(and(eq(policies.tenantId, tenant()), inArray(policies.id, activityPolicyIds)));
  for (const row of extraPolicies) policyById.set(row.policy.id, row);

  for (const activity of activityRows) {
    if (!activity.policyId) continue;
    const policy = policyById.get(activity.policyId);
    service.push({
      id: activity.id,
      kind: "task",
      title: activity.title,
      status: activity.status,
      href: `/policies/${activity.policyId}`,
      party: partyLabel(policy?.contact ?? null, policy?.account ?? null) || "—",
      ownerId: policy?.policy.ownerId ?? null,
      ownerName: policy?.policy.ownerId ? names.get(policy.policy.ownerId) ?? null : null,
      detail: "Policy task",
      when: activity.dueAt,
    });
  }

  for (const event of eventRows) {
    if (!event.policyId) continue;
    const policy = policyById.get(event.policyId);
    service.push({
      id: event.id,
      kind: "endorsement",
      title: event.summary ?? "Endorsement",
      status: event.kind,
      href: `/policies/${event.policyId}`,
      party: partyLabel(policy?.contact ?? null, policy?.account ?? null) || "—",
      ownerId: policy?.policy.ownerId ?? null,
      ownerName: policy?.policy.ownerId ? names.get(policy.policy.ownerId) ?? null : null,
      detail: event.reason ?? "Filed endorsement",
      when: event.effectiveDate,
    });
  }

  for (const work of workRows) {
    if (work.workStatus === "ready" || work.workStatus === "cleared") continue;
    const policy = policyById.get(work.policyId);
    service.push({
      id: work.id,
      kind: "work",
      title: policy?.policy.policyNumber ?? "Policy work",
      status: work.workStatus,
      href: `/policies/${work.policyId}`,
      party: partyLabel(policy?.contact ?? null, policy?.account ?? null) || "—",
      ownerId: work.assigneeId ?? policy?.policy.ownerId ?? null,
      ownerName: (work.assigneeId ?? policy?.policy.ownerId)
        ? names.get(work.assigneeId ?? policy?.policy.ownerId ?? "") ?? null
        : null,
      detail: "Work queue item",
      when: work.updatedAt,
    });
  }

  const pack = {
    deals: glanceDeals,
    service,
    claims: glanceClaims,
    policies: glancePolicies,
    asOf: deskNow(),
  };

  const counts = {
    sales: filterOwned(rowsForTab("sales", pack), scope).length,
    service: filterOwned(rowsForTab("service", pack), scope).length,
    claims: filterOwned(rowsForTab("claims", pack), scope).length,
    renewals: filterOwned(rowsForTab("renewals", pack), scope).length,
  };

  return {
    session,
    tab,
    rows: filterOwned(rowsForTab(tab, pack), scope),
    counts,
  };
}
