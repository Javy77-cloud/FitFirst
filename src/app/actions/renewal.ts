"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { flashAction } from "@/lib/flash-action";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { appointmentLine } from "@/lib/domain-ams";
import { shopLineFromLob } from "@/lib/deals/shop-flow";
import { db } from "@/lib/db";
import {
  documents,
  extractedFields,
  policies,
  policyTerms,
  renewalCompareLogs,
  type PolicyCoverageLine,
} from "@/lib/db/schema";
import { extractWithGeminiPdf } from "@/lib/extraction/gemini";
import { loadGeminiApiKey } from "@/lib/extraction/gemini/key";
import { readStoredFile } from "@/lib/files/object-store";
import { isUuid } from "@/lib/ids";
import { issuedPolicyDocType } from "@/lib/policy/issued-upload";
import { loadGeminiRows, type GeminiMintRow } from "@/lib/policy/load-gemini-rows";
import {
  buildCompareSnapshot,
  compareSummary,
  coverageRows,
  formatDeltaPct,
  formatSignedMoney,
  parseMoney,
  premiumChange,
} from "@/lib/renewal/compare";
import {
  mapGeminiRowsToTermFields,
  selectCompareTermRoleDocs,
  type MappedTermFields,
  type TermRoleDocLike,
} from "@/lib/renewal/fill-compare-from-decs";
import {
  monthsBetweenTermDates,
  tagsWithTermMonths,
} from "@/lib/documents/document-labels";

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
    delta: change.delta.toFixed(2),
    pct: change.pct == null ? null : change.pct.toFixed(4),
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

function bounceCompare(policyId: string, error?: string): never {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  else params.set("filed", "compare");
  redirect(`/policies/${policyId}/compare?${params.toString()}`);
}

export async function saveProposedTerm(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!policyId) throw new Error("Policy is required.");
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) bounceCompare(policyId, "Policy not found.");
  if (policy.status !== "active" && policy.status !== "bound") {
    bounceCompare(policyId, "Compare renewal is only for in-force policies.");
  }

  const premium = parseMoney(str(formData, "premium"));
  if (premium == null) bounceCompare(policyId, "Proposed premium is required.");

  const effective = dateOrNull(str(formData, "termEffective"));
  const expiration = dateOrNull(str(formData, "termExpiration"));
  if (!effective || !expiration) bounceCompare(policyId, "Proposed term dates are required.");

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
    try {
      await persistCompareLog({
        policyId,
        eventType: "proposed_updated",
        current,
        proposed,
      });
    } catch (error) {
      bounceCompare(policyId, error instanceof Error ? error.message : "Could not log compare.");
    }
  }

  revalidatePath(`/policies/${policyId}`);
  revalidatePath(`/policies/${policyId}/compare`);
  revalidatePath("/policies");
  flashAction(`/policies/${policyId}/compare`, "term-saved");
}

export async function recordRenewalCompare(formData: FormData) {
  const policyId = str(formData, "policyId");
  if (!policyId) throw new Error("Policy is required.");
  const terms = await db
    .select()
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, policyId)));
  const current = terms.find((term) => term.role === "current");
  const proposed = terms.find((term) => term.role === "proposed");
  if (!current || !proposed) {
    bounceCompare(policyId, "Current and proposed terms are required to log a compare.");
  }
  try {
    await persistCompareLog({
      policyId,
      eventType: "recorded",
      current,
      proposed,
    });
  } catch (error) {
    bounceCompare(policyId, error instanceof Error ? error.message : "Could not log compare.");
  }
  revalidatePath(`/policies/${policyId}`);
  revalidatePath(`/policies/${policyId}/compare`);
  bounceCompare(policyId);
}

async function loadCachedGeminiRows(docId: string): Promise<GeminiMintRow[]> {
  const existing = await db
    .select()
    .from(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  return existing.map((row) => ({
    fieldKey: row.fieldKey,
    normalizedValue: row.normalizedValue,
    rawValue: row.rawValue,
    confidence: Number(row.confidence ?? 0),
    flagged: row.flagged,
  }));
}

async function persistExtractRows(docId: string, rows: GeminiMintRow[]) {
  const [doc] = await db
    .select({ riskId: documents.riskId })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, docId)));
  await db
    .delete(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  for (const field of rows) {
    const normalized = field.normalizedValue?.trim() || "";
    const raw = field.rawValue?.trim() || normalized;
    if (!normalized && !raw) continue;
    await db.insert(extractedFields).values({
      tenantId: DEFAULT_TENANT_ID,
      documentId: docId,
      riskId: doc?.riskId ?? null,
      fieldKey: field.fieldKey,
      rawValue: raw,
      normalizedValue: normalized || raw,
      confidence: field.confidence.toFixed(3),
      flagged: field.flagged,
      appliedToRisk: false,
    });
  }
}

function shopLineForPolicy(lineOfBusiness: string | null | undefined): string | null {
  const lob = appointmentLine(lineOfBusiness ?? "");
  return shopLineFromLob(lob) ?? (lob === "HO" ? "home" : lob === "AUTO" ? "auto" : null);
}

async function upsertTermRole(input: {
  policyId: string;
  role: "current" | "proposed";
  fields: MappedTermFields;
  source: string;
  notes: string;
}) {
  const payload = {
    premium: input.fields.premium,
    termEffective: input.fields.termEffective,
    termExpiration: input.fields.termExpiration,
    aopDeductible: input.fields.aopDeductible,
    hurricaneDeductible: input.fields.hurricaneDeductible,
    comprehensiveDeductible: input.fields.comprehensiveDeductible,
    collisionDeductible: input.fields.collisionDeductible,
    coverages: input.fields.coverages.length ? input.fields.coverages : null,
    notes: input.notes,
    source: input.source,
  };

  const [existing] = await db
    .select()
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        eq(policyTerms.policyId, input.policyId),
        eq(policyTerms.role, input.role),
      ),
    );

  if (existing) {
    const [row] = await db
      .update(policyTerms)
      .set(payload)
      .where(eq(policyTerms.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(policyTerms)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId: input.policyId,
      role: input.role,
      ...payload,
    })
    .returning();
  return row;
}


async function stampDocTermMeta(input: {
  docId: string;
  termExpiration: Date;
  termEffective: Date;
}) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, input.docId)));
  if (!doc) return;
  const months = monthsBetweenTermDates(input.termEffective, input.termExpiration);
  const nextTags = tagsWithTermMonths(doc.tags, months);
  await db
    .update(documents)
    .set({
      expiresAt: input.termExpiration,
      tags: nextTags,
    })
    .where(eq(documents.id, doc.id));
}

export type FillCompareFromDecsResult =
  | {
      ok: true;
      summary: string;
      delta: number;
      pct: number | null;
      deltaLabel: string;
      pctLabel: string;
      baselineSource: "current" | "prior";
      baselineFilename: string;
      renewalFilename: string;
      gaps: string[];
    }
  | { ok: false; error: string; gaps?: string[] };

/**
 * Extract Prior/Current + Renewal term-role DECs via Gemini and fill Compare
 * (policy_terms current + proposed) + renewal compare log. Board premiumDelta
 * follows from policy_terms.
 */
export async function fillCompareFromTermRoleDocs(
  policyId: string,
): Promise<FillCompareFromDecsResult> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, error: "Sign in required." };
  if (!isUuid(policyId)) return { ok: false, error: "Policy required." };

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false, error: "Policy not found." };

  const docs = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      storagePath: documents.storagePath,
      mimeType: documents.mimeType,
      docType: documents.docType,
      tags: documents.tags,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.policyId, policyId)));

  const selected = selectCompareTermRoleDocs(docs);
  if (!selected.ok) return { ok: false, error: selected.message };

  const shopLine = shopLineForPolicy(policy.lineOfBusiness);
  const defaultDocType = issuedPolicyDocType(shopLine);

  async function extractSide(
    doc: TermRoleDocLike,
    sideLabel: string,
  ): Promise<
    | { ok: true; fields: MappedTermFields }
    | { ok: false; error: string; gaps?: string[] }
  > {
    if (!doc.storagePath?.trim()) {
      return {
        ok: false,
        error: `${sideLabel} DEC “${doc.filename}” has no stored file. Re-upload it, then try again.`,
      };
    }
    const gemini = await loadGeminiRows(
      {
        docId: doc.id,
        storagePath: doc.storagePath,
        mimeType: doc.mimeType,
        filename: doc.filename,
        shopLine,
        docType: doc.docType || defaultDocType,
      },
      {
        readStoredFile,
        loadCachedRows: loadCachedGeminiRows,
        loadGeminiApiKey,
        extractWithGeminiPdf,
        persistRows: persistExtractRows,
      },
    );
    if (!gemini.ok) {
      return { ok: false, error: `${sideLabel}: ${gemini.message}` };
    }
    const mapped = mapGeminiRowsToTermFields(gemini.rows);
    if (!mapped.ok) {
      return {
        ok: false,
        error: `${sideLabel} (${doc.filename}): ${mapped.message}`,
        gaps: mapped.gaps,
      };
    }
    return { ok: true, fields: mapped.fields };
  }

  const baselineLabel =
    selected.baselineSource === "prior" ? "Prior term (Compare baseline)" : "Current term";
  const baselineExtract = await extractSide(selected.baseline, baselineLabel);
  if (!baselineExtract.ok) {
    return { ok: false, error: baselineExtract.error, gaps: baselineExtract.gaps };
  }
  const renewalExtract = await extractSide(selected.renewal, "Renewal / upcoming term");
  if (!renewalExtract.ok) {
    return { ok: false, error: renewalExtract.error, gaps: renewalExtract.gaps };
  }

  const current = await upsertTermRole({
    policyId,
    role: "current",
    fields: baselineExtract.fields,
    source: "dec_extract",
    notes: `Filled from ${selected.baselineSource} DEC “${selected.baseline.filename ?? selected.baseline.id}”.`,
  });
  const proposed = await upsertTermRole({
    policyId,
    role: "proposed",
    fields: renewalExtract.fields,
    source: "dec_extract",
    notes: `Filled from renewal DEC “${selected.renewal.filename ?? selected.renewal.id}”.`,
  });

  if (!current || !proposed) {
    return { ok: false, error: "Could not save current/proposed terms." };
  }

  await stampDocTermMeta({
    docId: selected.baseline.id,
    termEffective: baselineExtract.fields.termEffective,
    termExpiration: baselineExtract.fields.termExpiration,
  });
  await stampDocTermMeta({
    docId: selected.renewal.id,
    termEffective: renewalExtract.fields.termEffective,
    termExpiration: renewalExtract.fields.termExpiration,
  });

  try {
    await persistCompareLog({
      policyId,
      eventType: "dec_fill",
      current,
      proposed,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not log compare.",
    };
  }

  const curMoney = parseMoney(current.premium);
  const nextMoney = parseMoney(proposed.premium);
  if (curMoney == null || nextMoney == null) {
    return { ok: false, error: "Both terms need a premium after fill." };
  }
  const change = premiumChange(curMoney, nextMoney);
  const gaps = [
    ...baselineExtract.fields.gaps.map((g) => `baseline:${g}`),
    ...renewalExtract.fields.gaps.map((g) => `renewal:${g}`),
  ];

  revalidatePath(`/policies/${policyId}`);
  revalidatePath(`/policies/${policyId}/compare`);
  revalidatePath("/policies");
  revalidatePath("/renewals");
  revalidatePath("/renewals/queue");

  return {
    ok: true,
    summary: compareSummary(change),
    delta: change.delta,
    pct: change.pct,
    deltaLabel: formatSignedMoney(change.delta),
    pctLabel: formatDeltaPct(change.pct),
    baselineSource: selected.baselineSource,
    baselineFilename: selected.baseline.filename ?? selected.baseline.id,
    renewalFilename: selected.renewal.filename ?? selected.renewal.id,
    gaps,
  };
}
