"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policies, policyTerms, renewalCompareLogs, type PolicyCoverageLine } from "@/lib/db/schema";
import {
  buildCompareSnapshot,
  compareSummary,
  coverageRows,
  parseMoney,
  premiumChange,
} from "@/lib/renewal/compare";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function dateOrNull(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readCoverages(form: FormData): PolicyCoverageLine[] {
  const count = Number(str(form, "coverageCount") || 0);
  const lines: PolicyCoverageLine[] = [];
  for (let i = 0; i < count; i += 1) {
    const key = str(form, `coverageKey_${i}`) || `line_${i}`;
    const label = str(form, `coverageLabel_${i}`) || key;
    const value = str(form, `coverageValue_${i}`);
    if (!label && !value) continue;
    lines.push({ key, label, value: value || "—" });
  }
  return lines;
}

async function persistCompareLog(input: {
  policyId: string;
  eventType: string;
  current: typeof policyTerms.$inferSelect;
  proposed: typeof policyTerms.$inferSelect;
}) {
  const currentPremium = parseMoney(input.current.premium);
  const proposedPremium = parseMoney(input.proposed.premium);
  if (currentPremium == null || proposedPremium == null) {
    throw new Error("Both terms need a premium before the compare can be logged.");
  }
  const change = premiumChange(currentPremium, proposedPremium);
  const rows = coverageRows(input.current.coverages, input.proposed.coverages);
  const summary = compareSummary(change);
  await db.insert(renewalCompareLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    policyId: input.policyId,
    currentTermId: input.current.id,
    proposedTermId: input.proposed.id,
    eventType: input.eventType,
    currentPremium: currentPremium.toFixed(2),
    proposedPremium: proposedPremium.toFixed(2),
    premiumDelta: change.delta.toFixed(2),
    premiumDeltaPct: change.pct == null ? null : change.pct.toFixed(4),
    summary,
    snapshot: buildCompareSnapshot({
      currentPremium: currentPremium.toFixed(2),
      proposedPremium: proposedPremium.toFixed(2),
      change,
      currentDeductibles: {
        aopDeductible: input.current.aopDeductible,
        hurricaneDeductible: input.current.hurricaneDeductible,
        comprehensiveDeductible: input.current.comprehensiveDeductible,
        collisionDeductible: input.current.collisionDeductible,
      },
      proposedDeductibles: {
        aopDeductible: input.proposed.aopDeductible,
        hurricaneDeductible: input.proposed.hurricaneDeductible,
        comprehensiveDeductible: input.proposed.comprehensiveDeductible,
        collisionDeductible: input.proposed.collisionDeductible,
      },
      coverageRows: rows,
    }),
  });
}

export async function saveProposedTerm(formData: FormData) {
  const policyId = str(formData, "policyId");
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) throw new Error("Policy not found");
  if (policy.status !== "active") {
    throw new Error("Compare renewal is only for in-force policies.");
  }

  const premium = parseMoney(str(formData, "premium"));
  if (premium == null) throw new Error("Proposed premium is required.");

  const effective = dateOrNull(str(formData, "termEffective"));
  const expiration = dateOrNull(str(formData, "termExpiration"));
  if (!effective || !expiration) throw new Error("Proposed term dates are required.");

  const coverages = readCoverages(formData);
  const fields = {
    premium: premium.toFixed(2),
    termEffective: effective,
    termExpiration: expiration,
    aopDeductible: str(formData, "aopDeductible") || null,
    hurricaneDeductible: str(formData, "hurricaneDeductible") || null,
    comprehensiveDeductible: str(formData, "comprehensiveDeductible") || null,
    collisionDeductible: str(formData, "collisionDeductible") || null,
    coverages,
    notes: str(formData, "notes") || null,
    source: "carrier_offer",
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select()
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        eq(policyTerms.policyId, policyId),
        eq(policyTerms.role, "proposed"),
      ),
    );

  const [proposed] = existing
    ? await db
        .update(policyTerms)
        .set(fields)
        .where(eq(policyTerms.id, existing.id))
        .returning()
    : await db
        .insert(policyTerms)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          policyId,
          role: "proposed",
          ...fields,
        })
        .returning();

  const [current] = await db
    .select()
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        eq(policyTerms.policyId, policyId),
        eq(policyTerms.role, "current"),
      ),
    );

  if (current && proposed) {
    await persistCompareLog({
      policyId,
      eventType: "proposed_updated",
      current,
      proposed,
    });
  }

  revalidatePath(`/policies/${policyId}`);
  revalidatePath(`/policies/${policyId}/compare`);
  revalidatePath("/policies");
}

export async function recordRenewalCompare(formData: FormData) {
  const policyId = str(formData, "policyId");
  const terms = await db
    .select()
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, policyId)));
  const current = terms.find((term) => term.role === "current");
  const proposed = terms.find((term) => term.role === "proposed");
  if (!current || !proposed) {
    throw new Error("Current and proposed terms are required to log a compare.");
  }
  await persistCompareLog({
    policyId,
    eventType: "recorded",
    current,
    proposed,
  });
  revalidatePath(`/policies/${policyId}`);
  revalidatePath(`/policies/${policyId}/compare`);
}
