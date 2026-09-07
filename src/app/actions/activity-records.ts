"use server";

import { eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { canSeeOwned } from "@/lib/auth/rbac";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads } from "@/lib/db/schema";
import {
  matchesActivityRecordQuery,
  rankActivityRecordHits,
  type ActivityRecordHit,
} from "@/lib/activities/record-picker";

export async function searchActivityRecords(query: string): Promise<ActivityRecordHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const session = await currentDeskSession();
  const actor = {
    id: session.userId ?? "",
    name: session.name,
    email: session.email ?? "",
    role: session.isAdmin ? ("admin" as const) : ("agent" as const),
  };
  const [leadRows, dealRows, contactRows, accountRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(accounts).where(eq(accounts.tenantId, DEFAULT_TENANT_ID)),
  ]);

  const hits: ActivityRecordHit[] = [];
  for (const row of leadRows) {
    if (!canSeeOwned(actor, row.ownerId)) continue;
    const name = `${row.lastName}, ${row.firstName}`.replace(/^, /, "");
    if (!matchesActivityRecordQuery(q, { name, phone: row.phone, email: row.email })) continue;
    hits.push({
      kind: "lead",
      id: row.id,
      name,
      phone: row.phone,
      email: row.email,
      leadId: row.id,
      dealId: row.convertedDealId,
      contactId: null,
      accountId: null,
    });
  }
  for (const row of contactRows) {
    if (!canSeeOwned(actor, row.ownerId)) continue;
    const name = `${row.lastName}, ${row.firstName}`;
    if (!matchesActivityRecordQuery(q, { name, phone: row.phone, email: row.email })) continue;
    hits.push({
      kind: "contact",
      id: row.id,
      name,
      phone: row.phone,
      email: row.email,
      leadId: null,
      dealId: null,
      contactId: row.id,
      accountId: row.accountId ?? null,
    });
  }
  for (const row of dealRows) {
    if (!canSeeOwned(actor, row.ownerId)) continue;
    const contact = row.contactId ? contactRows.find((item) => item.id === row.contactId) : null;
    const account = row.accountId ? accountRows.find((item) => item.id === row.accountId) : null;
    const name = row.primaryNamedInsured || row.title;
    const phone = contact?.phone ?? account?.phone ?? null;
    const email = contact?.email ?? account?.email ?? null;
    if (!matchesActivityRecordQuery(q, { name, title: row.title, phone, email })) continue;
    hits.push({
      kind: "deal",
      id: row.id,
      name: row.title,
      phone,
      email,
      leadId: row.leadId,
      dealId: row.id,
      contactId: row.contactId,
      accountId: row.accountId,
    });
  }
  return rankActivityRecordHits(hits, q).slice(0, 12);
}
