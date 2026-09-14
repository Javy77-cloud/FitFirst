import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policies, policyTerms } from "@/lib/db/schema";

/**
 * Auto term history: ensure a current term from policy effective/expiration.
 * Rewrite / endorsement adds a prior + new current (no manual entry UI).
 */
export async function ensureCurrentPolicyTerm(policyId: string): Promise<void> {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return;

  const terms = await db
    .select()
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, policyId)));

  const current = terms.find((row) => row.role === "current");
  if (current) {
    const sameEff = current.termEffective.getTime() === policy.effectiveDate.getTime();
    const sameExp = current.termExpiration.getTime() === policy.expirationDate.getTime();
    const samePrem = (current.premium ?? null) === (policy.premium ?? null);
    if (sameEff && sameExp && samePrem) return;
    // Dates moved without an endorsement event — sync current in place (no manual UI).
    await db
      .update(policyTerms)
      .set({
        termEffective: policy.effectiveDate,
        termExpiration: policy.expirationDate,
        premium: policy.premium,
      })
      .where(eq(policyTerms.id, current.id));
    return;
  }

  await db.insert(policyTerms).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId,
    role: "current",
    termEffective: policy.effectiveDate,
    termExpiration: policy.expirationDate,
    premium: policy.premium,
    source: "auto_effective",
    notes: "Auto from policy effective / expiration.",
  });
}

/** On endorsement / rewrite: archive current as prior and insert new current. */
export async function appendTermFromEndorsement(input: {
  policyId: string;
  effectiveDate: Date;
  premium?: string | null;
  notes?: string | null;
}): Promise<void> {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, input.policyId)));
  if (!policy) return;

  await ensureCurrentPolicyTerm(input.policyId);

  const terms = await db
    .select()
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, input.policyId)));
  const current = terms.find((row) => row.role === "current");
  if (current) {
    await db
      .update(policyTerms)
      .set({ role: "prior", notes: current.notes ?? "Prior term (endorsement / rewrite)." })
      .where(eq(policyTerms.id, current.id));
  }

  await db.insert(policyTerms).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId: input.policyId,
    role: "current",
    termEffective: input.effectiveDate,
    termExpiration: policy.expirationDate,
    premium: input.premium ?? policy.premium,
    source: "endorsement",
    notes: input.notes ?? "Term added by endorsement / rewrite.",
  });
}
