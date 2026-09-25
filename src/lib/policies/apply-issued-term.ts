/**
 * Persist a planned DEC term write. Callers pass the already-chosen policy.
 * This never scans sibling products.
 */
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policies, policyTerms } from "@/lib/db/schema";
import { promoteArrivingCurrentDec, tagDocumentTermRoleOnly } from "@/lib/policy/promote-current-dec";
import {
  planIssuedTermWrite,
  type BookPolicyRef,
  type DecTermFacts,
  type IssuedTermPlan,
} from "@/lib/policies/issue-term";
import type { TermCandidate } from "@/lib/policies/current-term";

export async function applyIssuedTermPlan(plan: IssuedTermPlan): Promise<IssuedTermPlan> {
  if (!plan.ok) return plan;

  if (Object.keys(plan.policyPatch).length > 0) {
    await db
      .update(policies)
      .set({ ...plan.policyPatch, updatedAt: new Date() })
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, plan.policyId)));
  }

  for (const termId of plan.demoteTermIds) {
    await db
      .update(policyTerms)
      .set({ role: "prior" })
      .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.id, termId), eq(policyTerms.policyId, plan.policyId)));
  }

  const termValues = {
    role: plan.termRole,
    termEffective: plan.termEffective,
    termExpiration: plan.termExpiration,
    premium: plan.termPremium,
    source: "dec_issue",
    notes: plan.documentId ? `Issued from DEC ${plan.documentId}` : "Issued from DEC",
  };

  if (plan.updateTermId) {
    await db
      .update(policyTerms)
      .set(termValues)
      .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.id, plan.updateTermId)));
  } else {
    await db.insert(policyTerms).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId: plan.policyId,
      ...termValues,
    });
  }

  if (plan.documentId && plan.documentRole === "current") {
    await promoteArrivingCurrentDec({
      policyId: plan.policyId,
      documentId: plan.documentId,
      advanceTerm: false,
    });
  } else if (plan.documentId && (plan.documentRole === "renewal" || plan.documentRole === "prior")) {
    await tagDocumentTermRoleOnly({
      documentId: plan.documentId,
      policyId: plan.policyId,
      role: plan.documentRole,
    });
  }

  return plan;
}

export async function writeIssuedTermForPolicy(input: {
  policyId: string;
  product: string;
  lineOfBusiness: string;
  dec: DecTermFacts;
  documentId?: string | null;
  asOf?: Date;
}): Promise<IssuedTermPlan> {
  const [policy] = await db
    .select({
      id: policies.id,
      sourceProduct: policies.sourceProduct,
      lineOfBusiness: policies.lineOfBusiness,
      policyNumber: policies.policyNumber,
      premium: policies.premium,
      effectiveDate: policies.effectiveDate,
      expirationDate: policies.expirationDate,
      status: policies.status,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, input.policyId)));
  if (!policy) {
    return { ok: false, reason: "no_policy", message: "Policy not found. Nothing was written." };
  }

  const terms = await db
    .select({
      id: policyTerms.id,
      role: policyTerms.role,
      effective: policyTerms.termEffective,
      expiration: policyTerms.termExpiration,
      premium: policyTerms.premium,
      source: policyTerms.source,
    })
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, input.policyId)));

  const book: BookPolicyRef = policy;
  const plan = planIssuedTermWrite({
    product: input.product,
    lineOfBusiness: input.lineOfBusiness,
    policies: [book],
    terms: terms as TermCandidate[],
    dec: input.dec,
    asOf: input.asOf,
    documentId: input.documentId,
  });
  return applyIssuedTermPlan(plan);
}
