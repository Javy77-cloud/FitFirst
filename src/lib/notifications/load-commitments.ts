import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, activities, contacts, deals, leads, policies, reviewTasks } from "@/lib/db/schema";
import { deskNow } from "@/lib/home/as-of";
import { currentDeskSession } from "@/lib/auth/session";
import {
  applyOrphanLink,
  commitmentEntityHref,
  commitmentHasEntity,
  commitmentHeat,
  commitmentRecordType,
  matchOrphanToName,
  type Commitment,
  type CommitmentRecordType,
} from "@/lib/notifications/commitments";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export async function migrateOrphanCommitments(): Promise<number> {
  const [orphans, nameRows] = await Promise.all([
    db
      .select()
      .from(reviewTasks)
      .where(
        and(
          eq(reviewTasks.tenantId, tenant()),
          eq(reviewTasks.status, "open"),
          sql`${reviewTasks.contactId} is null`,
          sql`${reviewTasks.dealId} is null`,
          sql`${reviewTasks.policyId} is null`,
          sql`${reviewTasks.leadId} is null`,
          sql`${reviewTasks.accountId} is null`,
        ),
      ),
    loadNameIndex(),
  ]);

  const activityOrphans = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.tenantId, tenant()),
        eq(activities.kind, "task"),
        notInArray(activities.status, ["completed", "cancelled", "done"]),
        sql`${activities.contactId} is null`,
        sql`${activities.dealId} is null`,
        sql`${activities.policyId} is null`,
        sql`${activities.leadId} is null`,
        sql`${activities.accountId} is null`,
      ),
    );

  let linked = 0;
  for (const row of orphans) {
    const hit = matchOrphanToName(row.title, nameRows);
    if (!hit) continue;
    const next = applyOrphanLink(row, hit);
    await db
      .update(reviewTasks)
      .set({
        contactId: next.contactId ?? null,
        dealId: next.dealId ?? null,
        policyId: next.policyId ?? null,
        leadId: next.leadId ?? null,
        accountId: next.accountId ?? null,
      })
      .where(eq(reviewTasks.id, row.id));
    linked += 1;
  }
  for (const row of activityOrphans) {
    const hit = matchOrphanToName(row.title, nameRows);
    if (!hit) continue;
    const next = applyOrphanLink(row, hit);
    await db
      .update(activities)
      .set({
        contactId: next.contactId ?? null,
        dealId: next.dealId ?? null,
        policyId: next.policyId ?? null,
        leadId: next.leadId ?? null,
        accountId: next.accountId ?? null,
      })
      .where(eq(activities.id, row.id));
    linked += 1;
  }
  return linked;
}

async function loadNameIndex(): Promise<{ id: string; name: string; type: CommitmentRecordType }[]> {
  const [contactRows, dealRows, policyRows, leadRows, accountRows] = await Promise.all([
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts)
      .where(eq(contacts.tenantId, tenant())),
    db.select({ id: deals.id, title: deals.title }).from(deals).where(eq(deals.tenantId, tenant())),
    db
      .select({ id: policies.id, policyNumber: policies.policyNumber })
      .from(policies)
      .where(eq(policies.tenantId, tenant())),
    db
      .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName })
      .from(leads)
      .where(eq(leads.tenantId, tenant())),
    db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(eq(accounts.tenantId, tenant())),
  ]);
  return [
    ...contactRows.map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      type: "contact" as const,
    })),
    ...dealRows.map((row) => ({ id: row.id, name: row.title, type: "deal" as const })),
    ...policyRows.map((row) => ({ id: row.id, name: row.policyNumber, type: "policy" as const })),
    ...leadRows.map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      type: "lead" as const,
    })),
    ...accountRows.map((row) => ({ id: row.id, name: row.name, type: "account" as const })),
  ].filter((row) => row.name.length >= 3);
}

export async function loadOpenCommitments(asOf = deskNow()): Promise<Commitment[]> {
  const session = await currentDeskSession();
  const review = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.status, "open")));

  const clauses = [
    eq(activities.tenantId, tenant()),
    eq(activities.kind, "task"),
    notInArray(activities.status, ["completed", "cancelled", "done"]),
  ];
  if (!session.isAdmin) {
    clauses.push(
      session.name || session.userId
        ? or(eq(activities.assignee, session.name), eq(activities.assignee, session.userId ?? ""))!
        : sql`false`,
    );
  }
  const activityRows = await db.select().from(activities).where(and(...clauses));

  const names = await loadLinkedNames([
    ...review.map((row) => ({
      contactId: row.contactId,
      dealId: row.dealId,
      policyId: row.policyId,
      leadId: row.leadId,
      accountId: row.accountId,
    })),
    ...activityRows.map((row) => ({
      contactId: row.contactId,
      dealId: row.dealId,
      policyId: row.policyId,
      leadId: row.leadId,
      accountId: row.accountId,
    })),
  ]);

  function toCommitment(input: {
    id: string;
    source: "review" | "activity";
    title: string;
    dueAt: Date;
    status: string;
    kind: string;
    contactId: string | null;
    dealId: string | null;
    policyId: string | null;
    leadId: string | null;
    accountId: string | null;
  }): Commitment {
    const orphan = !commitmentHasEntity(input);
    const recordType = commitmentRecordType(input);
    const recordName =
      (input.dealId && names.deals.get(input.dealId)) ||
      (input.contactId && names.contacts.get(input.contactId)) ||
      (input.policyId && names.policies.get(input.policyId)) ||
      (input.leadId && names.leads.get(input.leadId)) ||
      (input.accountId && names.accounts.get(input.accountId)) ||
      null;
    return {
      ...input,
      heat: commitmentHeat(input.dueAt, asOf),
      recordType,
      recordName,
      href: commitmentEntityHref(input),
      orphan,
    };
  }

  return [
    ...review.map((row) =>
      toCommitment({
        id: row.id,
        source: "review",
        title: row.title,
        dueAt: row.dueDate,
        status: row.status,
        kind: row.kind,
        contactId: row.contactId,
        dealId: row.dealId,
        policyId: row.policyId,
        leadId: row.leadId,
        accountId: row.accountId,
      }),
    ),
    ...activityRows.map((row) =>
      toCommitment({
        id: row.id,
        source: "activity",
        title: row.title,
        dueAt: row.dueAt ?? row.startAt ?? asOf,
        status: row.status,
        kind: row.kind,
        contactId: row.contactId,
        dealId: row.dealId,
        policyId: row.policyId,
        leadId: row.leadId,
        accountId: row.accountId,
      }),
    ),
  ].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

async function loadLinkedNames(
  rows: {
    contactId?: string | null;
    dealId?: string | null;
    policyId?: string | null;
    leadId?: string | null;
    accountId?: string | null;
  }[],
) {
  const uniq = (values: Array<string | null | undefined>) => [...new Set(values.filter((id): id is string => Boolean(id)))];
  const contactIds = uniq(rows.map((row) => row.contactId));
  const dealIds = uniq(rows.map((row) => row.dealId));
  const policyIds = uniq(rows.map((row) => row.policyId));
  const leadIds = uniq(rows.map((row) => row.leadId));
  const accountIds = uniq(rows.map((row) => row.accountId));

  const [contactRows, dealRows, policyRows, leadRows, accountRows] = await Promise.all([
    contactIds.length
      ? db
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(inArray(contacts.id, contactIds))
      : Promise.resolve([]),
    dealIds.length
      ? db.select({ id: deals.id, title: deals.title }).from(deals).where(inArray(deals.id, dealIds))
      : Promise.resolve([]),
    policyIds.length
      ? db
          .select({ id: policies.id, policyNumber: policies.policyNumber })
          .from(policies)
          .where(inArray(policies.id, policyIds))
      : Promise.resolve([]),
    leadIds.length
      ? db
          .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName })
          .from(leads)
          .where(inArray(leads.id, leadIds))
      : Promise.resolve([]),
    accountIds.length
      ? db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(inArray(accounts.id, accountIds))
      : Promise.resolve([]),
  ]);

  return {
    contacts: new Map(contactRows.map((row) => [row.id, `${row.lastName}, ${row.firstName}`.replace(/^, /, "")])),
    deals: new Map(dealRows.map((row) => [row.id, row.title])),
    policies: new Map(policyRows.map((row) => [row.id, row.policyNumber])),
    leads: new Map(leadRows.map((row) => [row.id, `${row.lastName}, ${row.firstName}`.replace(/^, /, "")])),
    accounts: new Map(accountRows.map((row) => [row.id, row.name])),
  };
}

export async function loadCommitmentsForEntities(input: {
  contactIds?: string[];
  dealIds?: string[];
  asOf?: Date;
}): Promise<Commitment[]> {
  const all = await loadOpenCommitments(input.asOf ?? deskNow());
  const contacts = new Set(input.contactIds ?? []);
  const deals = new Set(input.dealIds ?? []);
  if (contacts.size === 0 && deals.size === 0) return [];
  return all.filter((row) => {
    if (row.contactId && contacts.has(row.contactId)) return true;
    if (row.dealId && deals.has(row.dealId)) return true;
    return false;
  });
}

export async function resolveTaskRedirect(id: string): Promise<string> {
  const [review] = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, tenant()), eq(reviewTasks.id, id)))
    .limit(1);
  if (review) return commitmentEntityHref(review);
  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, tenant()), eq(activities.id, id)))
    .limit(1);
  if (activity) return commitmentEntityHref(activity);
  return "/notifications#commitments";
}
