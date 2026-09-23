/**
 * DB apply for renewal current-term advance (Current DEC mark / Client staying).
 */
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, documents, extractedFields, policies, policyTerms } from "@/lib/db/schema";
import { termRoleFromTags } from "@/lib/documents/document-labels";
import { mintGeminiValue, normalizeMintValue } from "@/lib/policy/mint-gate";
import {
  advanceTermAlreadyApplied,
  advanceTermChangeSummary,
  formatAdvanceTermIso,
  planPolicyTermDemotions,
  resolveAdvanceTermDates,
  type AdvanceTermDateSource,
} from "@/lib/policy/advance-current-term";
import { recordPolicyFieldChanges } from "@/lib/policy/record-changes";
import { withHistoryDefaults } from "@/lib/policy/change-log";

export type AdvanceCurrentTermResult =
  | {
      ok: true;
      advanced: boolean;
      source?: AdvanceTermDateSource;
      effective?: string;
      expiration?: string;
      reason?: string;
    }
  | { ok: false; error: string };

function parseExtractedDay(
  rows: { fieldKey: string; normalizedValue: string | null; rawValue?: string | null }[],
  key: string,
): string | null {
  const raw = normalizeMintValue(key, mintGeminiValue(rows as never, key)).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function loadCurrentDecExtractDates(policyId: string): Promise<{
  effective: string | null;
  expiration: string | null;
  docId: string | null;
}> {
  const docs = await db
    .select({
      id: documents.id,
      tags: documents.tags,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.policyId, policyId)));

  const currentDocs = docs
    .filter((doc) => termRoleFromTags(doc.tags) === "current")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const doc = currentDocs[0];
  if (!doc) return { effective: null, expiration: null, docId: null };

  const rows = await db
    .select({
      fieldKey: extractedFields.fieldKey,
      normalizedValue: extractedFields.normalizedValue,
      rawValue: extractedFields.rawValue,
    })
    .from(extractedFields)
    .where(
      and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, doc.id)),
    );

  if (rows.length === 0) {
    return { effective: null, expiration: null, docId: doc.id };
  }

  return {
    effective: parseExtractedDay(rows, "effective_date"),
    expiration: parseExtractedDay(rows, "expiration_date"),
    docId: doc.id,
  };
}

/**
 * Advance policy book dates + policy_terms when a renewed Current DEC is in force.
 * Idempotent when current term already matches the resolved renewed dates.
 */
export async function advancePolicyCurrentTerm(input: {
  policyId: string;
  /** When true, require a Current-term DEC on the policy (Client staying path). */
  requireCurrentDec?: boolean;
  trigger: "document_term_role" | "client_staying" | "manual_fix";
  actorName?: string | null;
}): Promise<AdvanceCurrentTermResult> {
  const policyId = input.policyId?.trim();
  if (!policyId) return { ok: false, error: "Policy required." };

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false, error: "Policy not found." };

  const extract = await loadCurrentDecExtractDates(policyId);
  if (input.requireCurrentDec && !extract.docId) {
    return {
      ok: true,
      advanced: false,
      reason: "No Current-term DEC on this policy — Handled only.",
    };
  }

  const terms = await db
    .select()
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, policyId)));

  const currentTerm = terms.find((row) => row.role === "current") ?? null;
  const proposedTerm = terms.find((row) => row.role === "proposed") ?? null;

  const resolved = resolveAdvanceTermDates({
    extractedEffective: extract.effective,
    extractedExpiration: extract.expiration,
    policyEffective: policy.effectiveDate,
    policyExpiration: policy.expirationDate,
    previousCurrent: currentTerm
      ? {
          termEffective: currentTerm.termEffective,
          termExpiration: currentTerm.termExpiration,
        }
      : {
          termEffective: policy.effectiveDate,
          termExpiration: policy.expirationDate,
        },
    proposed: proposedTerm
      ? {
          termEffective: proposedTerm.termEffective,
          termExpiration: proposedTerm.termExpiration,
        }
      : null,
    termMonths: policy.termMonths ?? null,
    asOf: new Date(),
    allowAnnualRoll: true,
  });

  if (!resolved.ok) {
    // Soft-fail for Client staying so Handled still lands; loud for explicit Current mark.
    if (input.trigger === "client_staying") {
      return { ok: true, advanced: false, reason: resolved.reason };
    }
    return { ok: false, error: resolved.reason };
  }

  if (advanceTermAlreadyApplied(currentTerm, resolved.dates)) {
    // Still sync policy row if it lagged the current term.
    const policyMatches =
      policy.effectiveDate.toISOString().slice(0, 10) ===
        formatAdvanceTermIso(resolved.dates.effective) &&
      policy.expirationDate.toISOString().slice(0, 10) ===
        formatAdvanceTermIso(resolved.dates.expiration);
    if (policyMatches) {
      return {
        ok: true,
        advanced: false,
        source: resolved.source,
        effective: formatAdvanceTermIso(resolved.dates.effective),
        expiration: formatAdvanceTermIso(resolved.dates.expiration),
        reason: "Current term already on renewed dates.",
      };
    }
  }

  const fromEffective = formatAdvanceTermIso(policy.effectiveDate);
  const fromExpiration = formatAdvanceTermIso(policy.expirationDate);
  const toEffective = formatAdvanceTermIso(resolved.dates.effective);
  const toExpiration = formatAdvanceTermIso(resolved.dates.expiration);

  const demotions = planPolicyTermDemotions(terms);
  for (const id of demotions.demoteCurrentToPrior) {
    await db
      .update(policyTerms)
      .set({
        role: "prior",
        notes: "Prior term (renewal advance — demoted from current).",
      })
      .where(eq(policyTerms.id, id));
  }

  // If a proposed term matches the resolved dates, promote it to current.
  let promotedProposed = false;
  if (
    proposedTerm &&
    formatAdvanceTermIso(proposedTerm.termEffective) === toEffective &&
    formatAdvanceTermIso(proposedTerm.termExpiration) === toExpiration
  ) {
    await db
      .update(policyTerms)
      .set({
        role: "current",
        notes: proposedTerm.notes ?? "Current term (promoted from proposed renewal).",
        source: proposedTerm.source ?? "renewal_advance",
      })
      .where(eq(policyTerms.id, proposedTerm.id));
    promotedProposed = true;
  }

  if (!promotedProposed) {
    await db.insert(policyTerms).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      role: "current",
      termEffective: resolved.dates.effective,
      termExpiration: resolved.dates.expiration,
      premium: proposedTerm?.premium ?? currentTerm?.premium ?? policy.premium,
      aopDeductible: proposedTerm?.aopDeductible ?? currentTerm?.aopDeductible ?? null,
      hurricaneDeductible:
        proposedTerm?.hurricaneDeductible ?? currentTerm?.hurricaneDeductible ?? null,
      comprehensiveDeductible:
        proposedTerm?.comprehensiveDeductible ?? currentTerm?.comprehensiveDeductible ?? null,
      collisionDeductible:
        proposedTerm?.collisionDeductible ?? currentTerm?.collisionDeductible ?? null,
      coverages: proposedTerm?.coverages ?? currentTerm?.coverages ?? null,
      source: `renewal_advance:${resolved.source}`,
      notes: `Current term advanced via ${input.trigger} (${resolved.source}).`,
    });
  }

  await db
    .update(policies)
    .set({
      effectiveDate: resolved.dates.effective,
      expirationDate: resolved.dates.expiration,
      // Keep renewal_date aligned when it previously tracked expiration.
      renewalDate:
        policy.renewalDate &&
        formatAdvanceTermIso(policy.renewalDate) === fromExpiration
          ? resolved.dates.expiration
          : policy.renewalDate,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, policyId));

  const before = withHistoryDefaults(policy as unknown as Record<string, unknown>, {});
  const after = {
    ...before,
    effectiveDate: resolved.dates.effective,
    expirationDate: resolved.dates.expiration,
  };
  await recordPolicyFieldChanges({
    policyId,
    before,
    after,
    source: "renewal_term_advance",
    actor: input.actorName
      ? { id: null, name: input.actorName }
      : undefined,
  });

  const summary = advanceTermChangeSummary({
    policyNumber: policy.policyNumber,
    fromEffective,
    fromExpiration,
    toEffective,
    toExpiration,
    source: resolved.source,
  });
  await db.insert(activities).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "note",
    title: "Current term advanced",
    notes: summary,
    status: "completed",
    policyId,
    outcome: "renewal_term_advance",
  });

  return {
    ok: true,
    advanced: true,
    source: resolved.source,
    effective: toEffective,
    expiration: toExpiration,
  };
}

/** Whether the policy has any document tagged term_role:current. */
export async function policyHasCurrentTermDec(policyId: string): Promise<boolean> {
  const docs = await db
    .select({ tags: documents.tags })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.policyId, policyId)));
  return docs.some((doc) => termRoleFromTags(doc.tags) === "current");
}
