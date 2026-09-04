"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  deals,
  documents,
  extractedFields,
  extractionJobs,
  fillFeedbackLogs,
  quoteSheets,
  risks,
} from "@/lib/db/schema";
import type { Document, QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyLoggedCorrections } from "@/lib/fill-feedback/prefer";
import { persistDealFile, uploadRoot } from "@/lib/documents/store";
import {
  coerceRiskValue,
  extractFieldsFromText,
  fieldKeyToRiskColumn,
  type ExtractedField,
} from "@/lib/extraction/extract";
import { classifyIngest, extractFromImage } from "@/lib/extraction/ocr";
import { inferShopLine, isQuoteAttachment, sourceDocFillsHome } from "@/lib/ingest/identity";
import { ImageOcrNotImplementedError, textFromUpload } from "@/lib/extraction/pdf";
import {
  MELBOURNE_DEC_FILENAME,
  MELBOURNE_DEC_TEXT,
} from "@/lib/fixtures/sample-melbourne-dec";
import {
  SAMPLE_PHOTO_DEC_FILENAME,
  loadSamplePhotoDecPng,
} from "@/lib/fixtures/sample-photo-dec";
import {
  FRANCISCO_GARCIA_DEC_FILENAME,
  FRANCISCO_GARCIA_DEC_TEXT,
} from "@/lib/fixtures/sample-francisco-garcia-dec";
import {
  applyExtractedToSheet,
  applyPublicToSheet,
  confirmField,
  fillDealHeaderBlanks,
  mergeAgentEdits,
} from "@/lib/quote-sheet/apply";
import { emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { addressFromSheet, lookupPublicFacts } from "@/lib/public-records/lookup";
import { SHOP_LINES } from "@/lib/domain";
import { currentDeskSession } from "@/lib/auth/session";
import { applyLearningToExtracted } from "@/lib/fill-learning/lookup";
import { listFillLearningForLookup } from "@/lib/db/queries";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function isShopLine(value: string): value is ShopLine {
  return (SHOP_LINES as readonly string[]).includes(value);
}

export async function ensureQuoteSheet(dealId: string, line: ShopLine) {
  const [existing] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, line),
      ),
    );
  if (existing) return existing;
  const [created] = await db
    .insert(quoteSheets)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: emptySheetValues(line),
    })
    .returning();
  return created;
}

export async function saveQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  const submitted: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "dealId" || key === "line") continue;
    submitted[key] = String(value);
  }
  const values = mergeAgentEdits(sheet.values, submitted, lineRaw);
  await logSheetCorrections({
    dealId,
    sheetId: sheet.id,
    line: lineRaw,
    before: sheet.values,
    after: values,
  });
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  await syncRiskFromSheet(dealId, values, "save");
  await syncHeaderFromSheet(dealId, values, "save");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes/fill-feedback");
}

export async function confirmQuoteSheetField(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  const fieldKey = str(formData, "fieldKey");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  const values = confirmField(sheet.values, fieldKey);
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  revalidatePath(`/deals/${dealId}`);
}

export async function addShopLine(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const next = Array.from(new Set([...(deal.shopLines ?? []), lineRaw]));
  await db
    .update(deals)
    .set({ shopLines: next, updatedAt: new Date() })
    .where(eq(deals.id, dealId));
  await ensureQuoteSheet(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
}

export async function fillQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  await runFillDealSheets(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
}

export async function runFillDealSheets(dealId: string, primary: ShopLine) {
  await runFillQuoteSheet(dealId, primary);
  await fillOtherShopLines(dealId, primary);
}

async function fillOtherShopLines(dealId: string, already: ShopLine) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  for (const line of deal?.shopLines ?? []) {
    if (line !== already && isShopLine(line)) {
      await runFillQuoteSheet(dealId, line);
    }
  }
}

export async function attachSampleMelbourneDec(formData: FormData) {
  const dealId = str(formData, "dealId");
  const riskId = str(formData, "riskId");
  await persistDealFile({
    dealId,
    riskId,
    filename: MELBOURNE_DEC_FILENAME,
    mimeType: "text/plain",
    buffer: Buffer.from(MELBOURNE_DEC_TEXT, "utf8"),
    docType: "dec",
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function attachSampleFranciscoGarciaDec(formData: FormData) {
  const dealId = str(formData, "dealId");
  const riskId = str(formData, "riskId");
  await persistDealFile({
    dealId,
    riskId,
    filename: FRANCISCO_GARCIA_DEC_FILENAME,
    mimeType: "text/plain",
    buffer: Buffer.from(FRANCISCO_GARCIA_DEC_TEXT, "utf8"),
    docType: "dec",
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function attachSamplePhotoDec(formData: FormData) {
  const dealId = str(formData, "dealId");
  const riskId = str(formData, "riskId");
  await persistDealFile({
    dealId,
    riskId,
    filename: SAMPLE_PHOTO_DEC_FILENAME,
    mimeType: "image/png",
    buffer: loadSamplePhotoDecPng(),
    docType: "photo",
  });
  revalidatePath(`/deals/${dealId}`);
}

function sourceLabelForDoc(docType: string, filename: string): string {
  if (docType === "wind_mit") return "Wind mit";
  if (docType === "four_point") return "4-point";
  if (docType === "inspection") return "Inspection";
  if (docType === "photo") return "Photo";
  if (docType === "current_policy") return "Current policy";
  return `Uploaded ${docType || "dec"} · ${filename}`;
}

async function loadFillCorrections() {
  return db
    .select()
    .from(fillFeedbackLogs)
    .where(eq(fillFeedbackLogs.tenantId, DEFAULT_TENANT_ID))
    .orderBy(desc(fillFeedbackLogs.createdAt));
}

async function logSheetCorrections(input: {
  dealId: string;
  sheetId: string;
  line: string;
  before: Record<string, QuoteSheetFieldValue>;
  after: Record<string, QuoteSheetFieldValue>;
  reason?: string;
}) {
  const session = await currentDeskSession().catch(() => null);
  const who = session?.name || "desk";
  for (const [key, next] of Object.entries(input.after)) {
    const prev = input.before[key];
    if (!prev) continue;
    const extracted = prev.source === "extracted" || prev.source === "public";
    if (!extracted) continue;
    if (next.source !== "agent") continue;
    if (prev.value.trim() === next.value.trim()) continue;
    if (!prev.value.trim() || !next.value.trim()) continue;
    await db.insert(fillFeedbackLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      quoteSheetId: input.sheetId,
      docType: prev.sourceLabel?.toLowerCase().includes("wind")
        ? "wind_mit"
        : prev.sourceLabel?.toLowerCase().includes("4-point")
          ? "four_point"
          : "dec",
      fieldKey: key,
      wrongValue: prev.value,
      correctedValue: next.value,
      reason: input.reason ?? "agent_edit",
      line: input.line,
      createdBy: who,
    });
  }
}

export async function markPasteFieldWrong(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  const fieldKey = str(formData, "fieldKey");
  const wrongValue = str(formData, "wrongValue") || str(formData, fieldKey);
  const note = str(formData, "note") || "Marked wrong on paste / review";
  if (!dealId || !fieldKey || !wrongValue) throw new Error("Pick a field that was pasted wrong.");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  const session = await currentDeskSession().catch(() => null);
  await db.insert(fillFeedbackLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    quoteSheetId: sheet.id,
    docType: str(formData, "docType") || "dec",
    fieldKey,
    wrongValue,
    correctedValue: note,
    reason: "paste_wrong",
    line: lineRaw,
    createdBy: session?.name || "desk",
  });
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes/fill-feedback");
}

export async function runFillQuoteSheet(dealId: string, line: ShopLine) {
  const sheet = await ensureQuoteSheet(dealId, line);
  const docs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId)));
  const corrections = await loadFillCorrections();
  const learningLogs = await listFillLearningForLookup();

  let values: Record<string, QuoteSheetFieldValue> = { ...sheet.values };
  if (Object.keys(values).length === 0) values = emptySheetValues(line);

  for (const doc of docs) {
    if (isQuoteAttachment(doc.docType, doc.filename)) continue;
    const abs = path.join(uploadRoot, doc.storagePath);
    let buffer: Buffer;
    try {
      buffer = await readFile(abs);
    } catch {
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: classifyIngest(doc.mimeType, doc.filename).engine,
        status: "failed",
        message: `Could not read ${doc.filename} from storage.`,
      });
      continue;
    }

    const plan = classifyIngest(doc.mimeType, doc.filename);
    if (plan.engine === "ocr") {
      values = await fillSheetFromPhoto({
        dealId,
        line,
        doc,
        sheetId: sheet.id,
        buffer,
        values,
      });
      continue;
    }

    try {
      const text = await textFromUpload(buffer, doc.mimeType, doc.filename);
      if (!text.trim()) {
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          engine: "pdf_text",
          status: "failed",
          message: `${doc.filename} has no readable text. Try a text export or the sample dec / 4-point / wind mit.`,
        });
        continue;
      }
      const inferred = inferShopLine(text, doc.filename, doc.docType);
      const hoOntoHome = sourceDocFillsHome(doc.docType) && line === "home";
      if (inferred !== line && !hoOntoHome) {
        continue;
      }
      const extracted = extractFieldsFromText(text);
      const feedback = applyLoggedCorrections(extracted.fields, doc.docType, corrections);
      const learned = applyLearningToExtracted(
        feedback.fields.map((field) => ({
          fieldKey: field.fieldKey,
          normalizedValue: field.normalizedValue,
          sourceLabel: sourceLabelForDoc(doc.docType, doc.filename),
        })),
        learningLogs,
        { docType: doc.docType || "dec", dealId },
      );
      const applied = applyExtractedToSheet(line, values, learned);
      values = applied.values;
      await syncNamedInsuredFromExtract(dealId, extracted.fields);

      await db.delete(extractedFields).where(eq(extractedFields.documentId, doc.id));
      for (const field of extracted.fields) {
        await db.insert(extractedFields).values({
          tenantId: DEFAULT_TENANT_ID,
          documentId: doc.id,
          riskId: doc.riskId,
          fieldKey: field.fieldKey,
          rawValue: field.rawValue,
          normalizedValue: field.normalizedValue,
          confidence: field.confidence.toFixed(3),
          flagged: field.flagged,
          appliedToRisk: applied.filledKeys.includes(
            extractKeyToSheetKey(line, field.fieldKey) ?? field.fieldKey,
          ),
        });
      }

      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: "pdf_text",
        status: "done",
        filledKeys: applied.filledKeys,
        skippedKeys: applied.skippedKeys,
        message:
          applied.filledKeys.length === 0
            ? `Parsed ${doc.filename}. No blank Quote Sheet fields to fill (existing values were left alone).`
            : `Filled ${applied.filledKeys.length} fields from ${doc.filename}. CHECK = use the value. Source files stay on Files.`,
      });
      await db
        .update(documents)
        .set({ status: extracted.glanceRequired ? "needs_glance" : "extracted" })
        .where(eq(documents.id, doc.id));
    } catch (error) {
      if (error instanceof ImageOcrNotImplementedError) {
        values = await fillSheetFromPhoto({
          dealId,
          line,
          doc,
          sheetId: sheet.id,
          buffer,
          values,
        });
        continue;
      }
      const message = error instanceof Error ? error.message : "Extract failed";
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: "pdf_text",
        status: "failed",
        message,
      });
    }
  }

  if (docs.length === 0) {
    await db.insert(extractionJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      quoteSheetId: sheet.id,
      engine: "pdf_text",
      status: "failed",
      message: "No source files on this deal. Drop a dec, wind mit, or 4-point first.",
    });
    return;
  }

  const publicLookup = await lookupPublicFacts(addressFromSheet(values));
  if (publicLookup.facts.length) {
    const publicApplied = applyPublicToSheet(line, values, publicLookup.facts);
    values = publicApplied.values;
    await db.insert(extractionJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      quoteSheetId: sheet.id,
      engine: "pdf_text",
      status: "done",
      filledKeys: publicApplied.filledKeys,
      skippedKeys: publicApplied.skippedKeys,
      message: publicLookup.message,
    });
  }

  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));

  await syncRiskFromSheet(dealId, values, "fill");
  await syncHeaderFromSheet(dealId, values, "fill");
}

async function fillSheetFromPhoto(input: {
  dealId: string;
  line: ShopLine;
  doc: Document;
  sheetId: string;
  buffer: Buffer;
  values: Record<string, QuoteSheetFieldValue>;
}): Promise<Record<string, QuoteSheetFieldValue>> {
  const ocr = await extractFromImage(input.buffer, input.doc.filename, input.doc.mimeType);
  const corrections = await loadFillCorrections();
  const feedback = applyLoggedCorrections(ocr.fields, input.doc.docType, corrections);
  const learned = applyLearningToExtracted(
    feedback.fields.map((field) => ({
      fieldKey: field.fieldKey,
      normalizedValue: field.normalizedValue,
      sourceLabel: sourceLabelForDoc(input.doc.docType, input.doc.filename),
    })),
    await listFillLearningForLookup(),
    { docType: input.doc.docType || "photo", dealId: input.dealId },
  );
  const applied = applyExtractedToSheet(input.line, input.values, learned, {
    source: "photo-ocr",
  });

  await db.delete(extractedFields).where(eq(extractedFields.documentId, input.doc.id));
  for (const field of ocr.fields) {
    await db.insert(extractedFields).values({
      tenantId: DEFAULT_TENANT_ID,
      documentId: input.doc.id,
      riskId: input.doc.riskId,
      fieldKey: field.fieldKey,
      rawValue: field.rawValue,
      normalizedValue: field.normalizedValue,
      confidence: field.confidence.toFixed(3),
      flagged: field.flagged,
      appliedToRisk:
        applied.filledKeys.includes(field.fieldKey) ||
        applied.filledKeys.includes(field.fieldKey === "address" ? "address1" : field.fieldKey),
    });
  }

  await db.insert(extractionJobs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: input.dealId,
    documentId: input.doc.id,
    quoteSheetId: input.sheetId,
    engine: "ocr",
    status: ocr.status,
    filledKeys: applied.filledKeys,
    skippedKeys: applied.skippedKeys,
    message: ocr.message,
  });
  await db
    .update(documents)
    .set({
      status:
        ocr.status === "failed"
          ? "failed"
          : ocr.fields.some((field) => field.flagged)
            ? "needs_glance"
            : "extracted",
    })
    .where(eq(documents.id, input.doc.id));

  await syncNamedInsuredFromExtract(input.dealId, ocr.fields);
  return applied.values;
}

async function syncNamedInsuredFromExtract(dealId: string, fields: ExtractedField[]) {
  const named = fields.find((field) => field.fieldKey === "named_insured")?.normalizedValue.trim();
  const secondary = fields
    .find((field) => field.fieldKey === "secondary_named_insured")
    ?.normalizedValue.trim();
  if (!named && !secondary) return;
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (named && !deal.primaryNamedInsured?.trim()) patch.primaryNamedInsured = named;
  if (secondary && !deal.secondaryNamedInsured?.trim()) patch.secondaryNamedInsured = secondary;
  if (Object.keys(patch).length === 1) return;
  await db.update(deals).set(patch).where(eq(deals.id, dealId));
}

async function syncHeaderFromSheet(
  dealId: string,
  values: Record<string, QuoteSheetFieldValue>,
  mode: "fill" | "save",
) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return;
  const glance = fillDealHeaderBlanks(
    {
      coverageAmount: deal.coverageAmount,
      propertyOneliner: deal.propertyOneliner,
      currentCarrier: deal.currentCarrier,
      primaryNamedInsured: deal.primaryNamedInsured,
      secondaryNamedInsured: deal.secondaryNamedInsured,
    },
    values,
  );
  await db
    .update(deals)
    .set({
      coverageAmount: glance.coverageAmount ?? deal.coverageAmount,
      propertyOneliner: glance.propertyOneliner ?? deal.propertyOneliner,
      currentCarrier: glance.currentCarrier ?? deal.currentCarrier,
      primaryNamedInsured: glance.primaryNamedInsured ?? deal.primaryNamedInsured,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
}

async function syncRiskFromSheet(
  dealId: string,
  values: Record<string, QuoteSheetFieldValue>,
  mode: "fill" | "save",
) {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) return;
  const extractToSheet: Record<string, string> = {
    address: "address1",
    city: "city",
    county: "county",
    year_built: "year_built",
    construction: "construction",
    occupancy: "occupancy",
    stories: "stories",
    coverage_a: "coverage_a",
    roof_year: "roof_year",
    roof_covering: "roof_covering",
    opening_protection: "opening_protection",
    pool: "pool",
    protection_class: "protection_class",
    miles_to_coast: "miles_to_coast",
    square_feet: "square_feet",
    mobile_home: "mobile_home",
    replacement_cost_estimate: "replacement_cost_estimate",
  };
  const patch: Record<string, unknown> = {};
  for (const [extractKey, sheetKey] of Object.entries(extractToSheet)) {
    const cell = values[sheetKey];
    if (!cell?.value.trim()) continue;
    const col = fieldKeyToRiskColumn(extractKey);
    const coerced = coerceRiskValue(extractKey, cell.value);
    if (!col || coerced == null) continue;
    const current = (risk as Record<string, unknown>)[col];
    const blank =
      current == null || current === "" || (typeof current === "number" && !Number.isFinite(current));
    if (mode === "fill" && !blank) continue;
    patch[col] = coerced;
  }
  if (values.state?.value.trim() && (mode === "save" || !risk.state)) {
    patch.state = values.state.value;
  }
  if (values.zip?.value.trim() && (mode === "fill" ? !risk.zip : true)) {
    if (mode === "save" || !risk.zip) patch.zip = values.zip.value;
  }
  if (values.address1?.value.trim() && (mode === "fill" ? !risk.address1 : true)) {
    if (mode === "save" || !risk.address1) patch.address1 = values.address1.value;
  }
  if (Object.keys(patch).length === 0) return;
  await db
    .update(risks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(risks.id, risk.id));
}
