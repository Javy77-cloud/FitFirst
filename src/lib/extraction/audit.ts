import { and, desc, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  extractionAttempts,
  extractionCorrections,
  extractionFieldAttempts,
  fillLearningLogs,
  synonymCandidates,
} from "@/lib/db/schema";
import type { ExtractedField } from "@/lib/extraction/extract";
import { isCoverageALocked } from "@/lib/extraction/audit-helpers";
export { isCoverageALocked, nextCandidateTimesSeen } from "@/lib/extraction/audit-helpers";
import { synonymsForField } from "@/lib/extraction/synonyms";
import { extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import type { ShopLine } from "@/lib/domain";

export type AuditEngine = "pdf_text" | "ocr" | "api";
export type AuditStatus = "done" | "failed" | "needs_glance" | "skipped";

export async function insertExtractionAttempt(input: {
  dealId: string;
  documentId?: string | null;
  quoteSheetId?: string | null;
  shopLine: string;
  docType: string;
  docTypeInferred?: boolean;
  engine: AuditEngine;
  documentQuality?: string | null;
  qualityNotes?: string[];
  status: AuditStatus;
  message?: string | null;
  startedAt?: Date;
  finishedAt?: Date | null;
}) {
  const [row] = await db
    .insert(extractionAttempts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      documentId: input.documentId ?? null,
      quoteSheetId: input.quoteSheetId ?? null,
      shopLine: input.shopLine,
      docType: input.docType || "",
      docTypeInferred: input.docTypeInferred ?? false,
      engine: input.engine,
      documentQuality: input.documentQuality ?? null,
      qualityNotes: input.qualityNotes ?? [],
      startedAt: input.startedAt ?? new Date(),
      finishedAt: input.finishedAt ?? new Date(),
      status: input.status,
      message: input.message ?? null,
    })
    .returning();
  return row;
}

export async function insertFieldAttempts(input: {
  attemptId: string;
  line: ShopLine;
  fields: ExtractedField[];
  filledSheetKeys: string[];
  sourceLabel: string;
}) {
  for (const field of input.fields) {
    const sheetKey = extractKeyToSheetKey(input.line, field.fieldKey) ?? field.fieldKey;
    const applied = input.filledSheetKeys.includes(sheetKey);
    await db.insert(extractionFieldAttempts).values({
      tenantId: DEFAULT_TENANT_ID,
      attemptId: input.attemptId,
      fieldKey: field.fieldKey,
      matchPath: field.matchPath ?? "none",
      matchedSynonym: field.matchedSynonym ?? null,
      sourceLine: field.sourceLine ?? null,
      sourceLineNo: field.sourceLineNo ?? null,
      rawValue: field.rawValue ?? "",
      normalizedValue: field.normalizedValue ?? "",
      confidence: field.confidence.toFixed(3),
      flagged: field.flagged,
      blankAfterMatch: Boolean(field.blankAfterMatch),
      missReason: field.missReason ?? null,
      appliedToSheet: applied,
      sheetKey,
      sheetSourceLabel: field.sourceDocTag ?? input.sourceLabel,
    });
  }
}

export type RecordCorrectionInput = {
  dealId: string;
  documentId?: string | null;
  fieldAttemptId?: string | null;
  docType: string;
  fieldKey: string;
  shopLine: string;
  extractedValue: string;
  correctedValue: string;
  reason: "agent_edit" | "paste_wrong" | "mapping_wrong";
  correctedBy: string;
  correctedByUserId?: string | null;
  note?: string | null;
  carrierId?: string | null;
  existingSource?: string | null;
  missReason?: string | null;
  proposedSynonym?: string | null;
  evidenceAttemptId?: string | null;
};

/** Agent save / Mark wrong — mirrors fill_learning_logs. Confirm is not learning. */
export async function recordExtractionCorrection(input: RecordCorrectionInput) {
  const locked = isCoverageALocked(input.dealId, input.fieldKey, input.existingSource);
  const [correction] = await db
    .insert(extractionCorrections)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      fieldAttemptId: input.fieldAttemptId ?? null,
      dealId: input.dealId,
      documentId: input.documentId ?? null,
      docType: input.docType,
      fieldKey: input.fieldKey,
      shopLine: input.shopLine,
      extractedValue: input.extractedValue,
      correctedValue: input.correctedValue,
      reason: input.reason,
      correctedBy: input.correctedBy,
      applyOnNextFill: !locked,
      locked,
    })
    .returning();

  await db.insert(fillLearningLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: input.dealId,
    documentId: input.documentId ?? null,
    docType: input.docType,
    fieldKey: input.fieldKey,
    extractedValue: input.extractedValue,
    correctedValue: input.correctedValue,
    correctedBy: input.correctedBy,
    correctedByUserId: input.correctedByUserId ?? null,
    note: input.note ?? null,
    carrierId: input.carrierId ?? null,
    shopLine: input.shopLine,
  });

  const miss = input.missReason ?? null;
  const propose =
    (miss === "no_synonym" || miss === "no_delimiter") &&
    Boolean(input.proposedSynonym?.trim()) &&
    input.docType !== "property_records";

  if (propose && correction && input.proposedSynonym) {
    await bumpSynonymCandidate({
      fieldKey: input.fieldKey,
      proposedSynonym: input.proposedSynonym.trim(),
      evidenceCorrectionId: correction.id,
      evidenceAttemptId: input.evidenceAttemptId ?? null,
    });
  }

  return correction;
}

export async function bumpSynonymCandidate(input: {
  fieldKey: string;
  proposedSynonym: string;
  evidenceCorrectionId?: string | null;
  evidenceAttemptId?: string | null;
}) {
  const existing = await db
    .select()
    .from(synonymCandidates)
    .where(
      and(
        eq(synonymCandidates.tenantId, DEFAULT_TENANT_ID),
        eq(synonymCandidates.fieldKey, input.fieldKey),
        eq(synonymCandidates.proposedSynonym, input.proposedSynonym),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(synonymCandidates)
      .set({
        timesSeen: existing[0].timesSeen + 1,
        evidenceCorrectionId: input.evidenceCorrectionId ?? existing[0].evidenceCorrectionId,
        evidenceAttemptId: input.evidenceAttemptId ?? existing[0].evidenceAttemptId,
        updatedAt: new Date(),
      })
      .where(eq(synonymCandidates.id, existing[0].id));
    return { ...existing[0], timesSeen: existing[0].timesSeen + 1 };
  }

  const [row] = await db
    .insert(synonymCandidates)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      fieldKey: input.fieldKey,
      proposedSynonym: input.proposedSynonym,
      evidenceCorrectionId: input.evidenceCorrectionId ?? null,
      evidenceAttemptId: input.evidenceAttemptId ?? null,
      timesSeen: 1,
      status: "proposed",
    })
    .returning();
  return row;
}

export async function listExtractionCorrectionsForLookup() {
  return db
    .select({
      id: extractionCorrections.id,
      docType: extractionCorrections.docType,
      fieldKey: extractionCorrections.fieldKey,
      extractedValue: extractionCorrections.extractedValue,
      correctedValue: extractionCorrections.correctedValue,
      dealId: extractionCorrections.dealId,
      loggedAt: extractionCorrections.createdAt,
      locked: extractionCorrections.locked,
      applyOnNextFill: extractionCorrections.applyOnNextFill,
    })
    .from(extractionCorrections)
    .where(
      and(
        eq(extractionCorrections.tenantId, DEFAULT_TENANT_ID),
        eq(extractionCorrections.applyOnNextFill, true),
        eq(extractionCorrections.locked, false),
      ),
    )
    .orderBy(desc(extractionCorrections.createdAt));
}

export async function loadWhyCellAudit(dealId: string, fieldKey: string) {
  const fieldRows = await db
    .select({
      field: extractionFieldAttempts,
      attempt: extractionAttempts,
    })
    .from(extractionFieldAttempts)
    .innerJoin(extractionAttempts, eq(extractionFieldAttempts.attemptId, extractionAttempts.id))
    .where(
      and(
        eq(extractionFieldAttempts.tenantId, DEFAULT_TENANT_ID),
        eq(extractionAttempts.dealId, dealId),
        eq(extractionFieldAttempts.fieldKey, fieldKey),
      ),
    )
    .orderBy(desc(extractionFieldAttempts.createdAt))
    .limit(12);

  const corrections = await db
    .select()
    .from(extractionCorrections)
    .where(
      and(
        eq(extractionCorrections.tenantId, DEFAULT_TENANT_ID),
        eq(extractionCorrections.dealId, dealId),
        eq(extractionCorrections.fieldKey, fieldKey),
      ),
    )
    .orderBy(desc(extractionCorrections.createdAt))
    .limit(5);

  const latest = fieldRows[0]?.field ?? null;
  return {
    latestMatch: latest
      ? {
          matchPath: latest.matchPath,
          matchedSynonym: latest.matchedSynonym,
          sourceLine: latest.sourceLine,
          sourceLineNo: latest.sourceLineNo,
          rawValue: latest.rawValue,
          normalizedValue: latest.normalizedValue,
          blankAfterMatch: latest.blankAfterMatch,
          missReason: latest.missReason,
          appliedToSheet: latest.appliedToSheet,
          sheetSourceLabel: latest.sheetSourceLabel,
          engine: fieldRows[0]?.attempt.engine ?? null,
          docType: fieldRows[0]?.attempt.docType ?? null,
          status: fieldRows[0]?.attempt.status ?? null,
        }
      : null,
    triedSynonyms: synonymsForField(fieldKey),
    lastCorrection: corrections[0]
      ? {
          extractedValue: corrections[0].extractedValue,
          correctedValue: corrections[0].correctedValue,
          reason: corrections[0].reason,
          correctedBy: corrections[0].correctedBy,
          createdAt: corrections[0].createdAt.toISOString(),
          locked: corrections[0].locked,
        }
      : null,
    history: fieldRows.map(({ field, attempt }) => ({
      id: field.id,
      matchPath: field.matchPath,
      matchedSynonym: field.matchedSynonym,
      appliedToSheet: field.appliedToSheet,
      missReason: field.missReason,
      engine: attempt.engine,
      docType: attempt.docType,
      createdAt: field.createdAt.toISOString(),
    })),
  };
}

export async function listSynonymCandidateQueue() {
  return db
    .select()
    .from(synonymCandidates)
    .where(
      and(
        eq(synonymCandidates.tenantId, DEFAULT_TENANT_ID),
        sql`${synonymCandidates.timesSeen} >= 2`,
      ),
    )
    .orderBy(desc(synonymCandidates.timesSeen), desc(synonymCandidates.updatedAt));
}

export async function setSynonymCandidateStatus(input: {
  id: string;
  status: "approved" | "rejected" | "shipped" | "proposed";
  approvedBy?: string | null;
  note?: string | null;
}) {
  const patch: Record<string, unknown> = {
    status: input.status,
    updatedAt: new Date(),
  };
  if (input.note != null) patch.note = input.note;
  if (input.status === "approved" || input.status === "shipped") {
    patch.approvedBy = input.approvedBy ?? null;
    patch.approvedAt = new Date();
    if (input.status === "shipped" && !input.note) {
      patch.note = "PR needed to edit synonyms.ts — approve does not ship dictionary edits.";
    }
  }
  await db.update(synonymCandidates).set(patch).where(eq(synonymCandidates.id, input.id));
}

export async function findLatestFieldAttempt(dealId: string, fieldKey: string) {
  const [row] = await db
    .select({
      field: extractionFieldAttempts,
      attempt: extractionAttempts,
    })
    .from(extractionFieldAttempts)
    .innerJoin(extractionAttempts, eq(extractionFieldAttempts.attemptId, extractionAttempts.id))
    .where(
      and(
        eq(extractionFieldAttempts.tenantId, DEFAULT_TENANT_ID),
        eq(extractionAttempts.dealId, dealId),
        eq(extractionFieldAttempts.fieldKey, fieldKey),
      ),
    )
    .orderBy(desc(extractionFieldAttempts.createdAt))
    .limit(1);
  return row ?? null;
}
