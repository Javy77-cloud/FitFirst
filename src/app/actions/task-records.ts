"use server";

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { canSeeOwned } from "@/lib/auth/rbac";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads, policies, users } from "@/lib/db/schema";
import {
  isTaskRecordType,
  type TaskRecordType,
} from "@/lib/tasks/task-types";

export type TaskRecordHit = {
  recordType: TaskRecordType;
  id: string;
  name: string;
  contactId: string | null;
  accountId: string | null;
  dealId: string | null;
  policyId: string | null;
  leadId: string | null;
};

/** Live-search records for Create Task, scoped to one record type. */
export async function searchTaskRecords(
  recordType: string,
  query: string,
): Promise<TaskRecordHit[]> {
  if (!isTaskRecordType(recordType)) return [];
  const q = query.trim();
  if (q.length < 1) return [];
  const session = await currentDeskSession();
  const actor = {
    id: session.userId ?? "",
    name: session.name,
    email: session.email ?? "",
    role: session.isAdmin ? ("admin" as const) : ("agent" as const),
    canSeeAgencyBook: Boolean(session.user?.canSeeAgencyWidgets),
  };
  const like = `%${q.replaceAll("%", "")}%`;
  const hits: TaskRecordHit[] = [];

  if (recordType === "contact") {
    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, DEFAULT_TENANT_ID),
          or(
            ilike(contacts.firstName, like),
            ilike(contacts.lastName, like),
            ilike(contacts.email, like),
            ilike(contacts.phone, like),
          ),
        ),
      )
      .limit(40);
    for (const row of rows) {
      if (!canSeeOwned(actor, row.ownerId)) continue;
      hits.push({
        recordType: "contact",
        id: row.id,
        name: `${row.lastName}, ${row.firstName}`,
        contactId: row.id,
        accountId: row.accountId ?? null,
        dealId: null,
        policyId: null,
        leadId: null,
      });
    }
  } else if (recordType === "lead") {
    const rows = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, DEFAULT_TENANT_ID),
          or(
            ilike(leads.firstName, like),
            ilike(leads.lastName, like),
            ilike(leads.email, like),
            ilike(leads.phone, like),
          ),
        ),
      )
      .limit(40);
    for (const row of rows) {
      if (!canSeeOwned(actor, row.ownerId)) continue;
      hits.push({
        recordType: "lead",
        id: row.id,
        name: `${row.lastName}, ${row.firstName}`.replace(/^, /, ""),
        contactId: null,
        accountId: null,
        dealId: row.convertedDealId,
        policyId: null,
        leadId: row.id,
      });
    }
  } else if (recordType === "deal") {
    const rows = await db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, DEFAULT_TENANT_ID),
          or(ilike(deals.title, like), ilike(deals.primaryNamedInsured, like)),
        ),
      )
      .limit(40);
    for (const row of rows) {
      if (!canSeeOwned(actor, row.ownerId)) continue;
      hits.push({
        recordType: "deal",
        id: row.id,
        name: row.title,
        contactId: row.contactId,
        accountId: row.accountId,
        dealId: row.id,
        policyId: null,
        leadId: row.leadId,
      });
    }
  } else if (recordType === "business") {
    const rows = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, DEFAULT_TENANT_ID),
          or(ilike(accounts.name, like), ilike(accounts.email, like), ilike(accounts.phone, like)),
        ),
      )
      .limit(40);
    for (const row of rows) {
      hits.push({
        recordType: "business",
        id: row.id,
        name: row.name,
        contactId: null,
        accountId: row.id,
        dealId: null,
        policyId: null,
        leadId: null,
      });
    }
  } else if (recordType === "policy") {
    const rows = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        labelOverride: policies.labelOverride,
        contactId: policies.contactId,
        accountId: policies.accountId,
        dealId: policies.dealId,
        ownerId: policies.ownerId,
      })
      .from(policies)
      .where(
        and(
          eq(policies.tenantId, DEFAULT_TENANT_ID),
          or(
            ilike(policies.policyNumber, like),
            ilike(policies.labelOverride, like),
            sql`cast(${policies.lineOfBusiness} as text) ilike ${like}`,
          ),
        ),
      )
      .limit(40);
    for (const row of rows) {
      if (!canSeeOwned(actor, row.ownerId)) continue;
      hits.push({
        recordType: "policy",
        id: row.id,
        name: row.labelOverride?.trim() || row.policyNumber,
        contactId: row.contactId,
        accountId: row.accountId,
        dealId: row.dealId,
        policyId: row.id,
        leadId: null,
      });
    }
  }

  return hits.slice(0, 12);
}


export async function listDeskAssignees(): Promise<{
  users: { id: string; name: string }[];
  currentUserId: string | null;
}> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { users: [], currentUserId: null };
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.tenantId, DEFAULT_TENANT_ID));
  const list = rows.map((row) => ({ id: row.id, name: row.name }));
  // Prefer signed-in agent at the top for selects that fall back to users[0].
  const currentUserId = session.userId ?? null;
  if (currentUserId) {
    list.sort((a, b) => Number(b.id === currentUserId) - Number(a.id === currentUserId));
  }
  return { users: list, currentUserId };
}
