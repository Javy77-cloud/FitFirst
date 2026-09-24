import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policyTerms } from "@/lib/db/schema";
import type { TermCandidate } from "@/lib/policies/current-term";

export async function loadPolicyTermCandidates(
  policyIds: readonly string[],
): Promise<Map<string, TermCandidate[]>> {
  const map = new Map<string, TermCandidate[]>();
  if (policyIds.length === 0) return map;
  const rows = await db
    .select({
      id: policyTerms.id,
      policyId: policyTerms.policyId,
      role: policyTerms.role,
      effective: policyTerms.termEffective,
      expiration: policyTerms.termExpiration,
      premium: policyTerms.premium,
      source: policyTerms.source,
    })
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), inArray(policyTerms.policyId, [...policyIds])));
  for (const row of rows) {
    const list = map.get(row.policyId) ?? [];
    list.push(row);
    map.set(row.policyId, list);
  }
  return map;
}
