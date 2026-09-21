import { and, eq, inArray } from "drizzle-orm";
import { ownerIdForWrite, type ProducerRef } from "@/lib/auth/producer-identity";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, leads, policies, users } from "@/lib/db/schema";

export type AliasOwnerBackfillReport = {
  canonicalUserId: string;
  aliasUserIds: string[];
  deals: number;
  leads: number;
  contacts: number;
  policies: number;
};

/**
 * Point mis-owned rows at the real Admin/owner when a second users row is
 * the same person (Francisco Javier Garcia → Javy Rivera). Idempotent. Does
 * not touch Maya / other distinct producers.
 */
export async function reassignAliasOwnedRecords(input: {
  canonicalUserId: string;
  aliasUserIds: string[];
  tenantId?: string;
}): Promise<AliasOwnerBackfillReport> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const aliasUserIds = [...new Set(input.aliasUserIds.filter((id) => id && id !== input.canonicalUserId))];
  const empty: AliasOwnerBackfillReport = {
    canonicalUserId: input.canonicalUserId,
    aliasUserIds,
    deals: 0,
    leads: 0,
    contacts: 0,
    policies: 0,
  };
  if (!input.canonicalUserId || aliasUserIds.length === 0) return empty;

  const now = new Date();
  const [dealRows, leadRows, contactRows, policyRows] = await Promise.all([
    db
      .update(deals)
      .set({ ownerId: input.canonicalUserId, updatedAt: now })
      .where(and(eq(deals.tenantId, tenantId), inArray(deals.ownerId, aliasUserIds)))
      .returning({ id: deals.id }),
    db
      .update(leads)
      .set({ ownerId: input.canonicalUserId, updatedAt: now })
      .where(and(eq(leads.tenantId, tenantId), inArray(leads.ownerId, aliasUserIds)))
      .returning({ id: leads.id }),
    db
      .update(contacts)
      .set({ ownerId: input.canonicalUserId, updatedAt: now })
      .where(and(eq(contacts.tenantId, tenantId), inArray(contacts.ownerId, aliasUserIds)))
      .returning({ id: contacts.id }),
    db
      .update(policies)
      .set({ ownerId: input.canonicalUserId, updatedAt: now })
      .where(and(eq(policies.tenantId, tenantId), inArray(policies.ownerId, aliasUserIds)))
      .returning({ id: policies.id }),
  ]);

  return {
    ...empty,
    deals: dealRows.length,
    leads: leadRows.length,
    contacts: contactRows.length,
    policies: policyRows.length,
  };
}

/** Prefer the signed-in Admin when the inherited owner row is the same person. */
export async function resolveWriteOwnerId(
  preferredId: string | null | undefined,
  actor: ProducerRef,
): Promise<string | null> {
  if (!preferredId || preferredId === actor.id) return actor.id || preferredId || null;
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, preferredId))
    .limit(1);
  return ownerIdForWrite({
    preferredId,
    preferredUser: row ?? null,
    actor,
  });
}
