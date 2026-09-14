import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { policies, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";

/**
 * Producer *person* name for Activity & Timeline.
 * Prefer policy owner (desk user). `policies.producer` is often an agency/channel
 * code (AFA, BackNine) — use only as fallback when there is no owner name.
 */
export async function resolvePolicyProducerName(
  policyId: string | null | undefined,
): Promise<string | null> {
  if (!policyId) return null;
  const [row] = await db
    .select({
      producer: policies.producer,
      ownerName: users.name,
    })
    .from(policies)
    .leftJoin(users, eq(policies.ownerId, users.id))
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)))
    .limit(1);
  const owner = row?.ownerName?.trim();
  if (owner) return owner;
  const agencyOrName = row?.producer?.trim();
  return agencyOrName || null;
}
