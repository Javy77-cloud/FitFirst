"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  deals,
  documents,
  extractedFields,
  extractionJobs,
  quoteSheets,
  risks,
} from "@/lib/db/schema";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { persistDealFile, uploadRoot } from "@/lib/documents/store";
import { extractFieldsFromText, fieldKeyToRiskColumn, coerceRiskValue } from "@/lib/extraction/extract";
import { classifyIngest, extractFromImage } from "@/lib/extraction/ocr";
import { inferShopLine, isQuoteAttachment } from "@/lib/ingest/identity";
import { ImageOcrNotImplementedError, textFromUpload } from "@/lib/extraction/pdf";
import {
  MELBOURNE_DEC_FILENAME,
  MELBOURNE_DEC_TEXT,
} from "@/lib/fixtures/sample-melbourne-dec";
import {
  SAMPLE_PHOTO_DEC_FILENAME,
  SAMPLE_PHOTO_DEC_PNG,
} from "@/lib/fixtures/sample-photo-dec";
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
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  await syncRiskFromSheet(dealId, values, "save");
  await syncHeaderFromSheet(dealId, values, "save");
  revalidatePath(`/deals/${dealId}`);
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

export async function attachSamplePhotoDec(formData: FormData) {
  const dealId = str(formData, "dealId");
  const riskId = str(formData, "riskId");
  await persistDealFile({
    dealId,
    riskId,
    filename: SAMPLE_PHOTO_DEC_FILENAME,
    mimeType: "image/png",
    buffer: SAMPLE_PHOTO_DEC_PNG,
    docType: "photo",
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function runFillQuoteSheet(dealId: string, line: ShopLine) {
  const sheet = await ensureQuoteSheet(dealId, line);
  const docs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId)));

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
      const ocr = extractFromImage(buffer, doc.filename);
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: "ocr",
        status: ocr.status,
        message: ocr.message,
      });
      await db
        .update(documents)
        .set({ status: "not_implemented" })
        .where(eq(documents.id, doc.id));
      continue;
    }

    try {
      const text = await textFromUpload(buffer, doc.mimeType, doc.filename);
      const inferred = inferShopLine(text, doc.filename, doc.docType);
      if (inferred !== line) {
        continue;
      }
      const extracted = extractFieldsFromText(text);
      const applied = applyExtractedToSheet(
        line,
        values,
        extracted.fields.map((field) => ({
          fieldKey: field.fieldKey,
          normalizedValue: field.normalizedValue,
          sourceLabel: "Uploaded dec",
        })),
      );
      values = applied.values;

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
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          engine: "ocr",
          status: "not_implemented",
          message: error.message,
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
