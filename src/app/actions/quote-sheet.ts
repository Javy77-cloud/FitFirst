"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  contacts,
  deals,
  documents,
  extractedFields,
  extractionJobs,
  propertyEnrichmentCache,
  fillFeedbackLogs,
  fillLearningLogs,
  leads,
  quoteSheets,
  risks,
} from "@/lib/db/schema";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyLoggedCorrections } from "@/lib/fill-feedback/prefer";
import { persistDealFile, uploadRoot } from "@/lib/documents/store";
import {
  coerceRiskValue,
  extractFieldsFromText,
  fieldKeyToRiskColumn,
  type ExtractedField,
} from "@/lib/extraction/extract";
import { classifyIngest } from "@/lib/extraction/ocr";
import { inferShopLine, isQuoteAttachment, sourceDocFillsHome } from "@/lib/ingest/identity";
import { readUploadText } from "@/lib/extraction/pdf";
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
  submittedSheetValues,
} from "@/lib/quote-sheet/apply";
import { ACTION_FLASH, ACTION_FLASH_MESSAGE, dealActionFlashHref } from "@/lib/desk/action-flash";
import { isSheetProduct, type SheetProduct } from "@/lib/quote-sheet/products";
import { emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { addressFromSheet, lookupPublicFacts } from "@/lib/public-records/lookup";
import {
  ADDRESS_CONFIRM_KEYS,
  enrichPropertyOnAddressConfirm,
} from "@/lib/property-enrichment/service";
import { SHOP_LINES } from "@/lib/domain";
import { currentDeskSession } from "@/lib/auth/session";
import { applyLearningToExtracted } from "@/lib/fill-learning/lookup";
import { listFillLearningForLookup } from "@/lib/db/queries";
import { DEAL_ID } from "@/lib/fixtures/ids";
import {
  lobForProduct,
  quotingFormForProduct,
  shopLineForProduct,
} from "@/lib/deals/deal-line";
import { flashAction } from "@/lib/flash-action";
import { dealTitleForRecords } from "@/lib/deals/deal-title";

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

export async function persistQuoteSheetValues(
  dealId: string,
  line: ShopLine,
  submitted: Record<string, string>,
  formId?: string,
) {
  const sheet = await ensureQuoteSheet(dealId, line);
  const productRaw = submitted.sheet_product?.trim();
  const product = productRaw && isSheetProduct(productRaw) ? (productRaw as SheetProduct) : undefined;
  const values = mergeAgentEdits(sheet.values, submitted, line, product);
  if (productRaw) {
    values.sheet_product = { value: productRaw, status: "confirmed", source: "agent" };
  }
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  await logSheetCorrections({
    dealId,
    sheetId: sheet.id,
    line,
    before: sheet.values,
    after: values,
    formId: formId || deal?.quotingForm || "HO3",
  });
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  await syncRiskFromSheet(dealId, values, "save");
  await syncHeaderFromSheet(dealId, values, "save");
  return values;
}

export async function applySavedSheetToDeal(dealId: string, line: ShopLine) {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, line),
      ),
    );
  if (!sheet) return null;
  await syncRiskFromSheet(dealId, sheet.values, "save");
  await syncHeaderFromSheet(dealId, sheet.values, "save");
  return sheet.values;
}

export async function saveQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const submitted = submittedSheetValues(formData);
  const product = str(formData, "sheet_product");
  if (product) submitted.sheet_product = product;
  await persistQuoteSheetValues(dealId, lineRaw, submitted, str(formData, "formId"));
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes/fill-feedback");
  const flash = {
    ok: true as const,
    notice: ACTION_FLASH.sheetSaved,
    message: ACTION_FLASH_MESSAGE[ACTION_FLASH.sheetSaved],
  };
  if (str(formData, "flash") === "0") return flash;
  const returnTo = str(formData, "returnTo");
  const dest =
    returnTo ||
    dealActionFlashHref({
      dealId,
      tab: "documents",
      line: lineRaw,
      product: product || undefined,
      notice: ACTION_FLASH.sheetSaved,
    });
  flashAction(dest, "sheet-saved");
}

export async function confirmQuoteSheetField(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  const fieldKey = str(formData, "fieldKey");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  let values = confirmField(sheet.values, fieldKey);
  if (ADDRESS_CONFIRM_KEYS.has(fieldKey)) {
    const enriched = await enrichPropertyOnAddressConfirm(addressFromSheet(values));
    if (enriched.triggered) {
      if (enriched.facts.length) {
        const applied = applyPublicToSheet(lineRaw, values, enriched.facts);
        values = applied.values;
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          quoteSheetId: sheet.id,
          engine: "property_enrichment",
          status: "done",
          filledKeys: applied.filledKeys,
          skippedKeys: applied.skippedKeys,
          message: enriched.message,
        });
      } else {
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          quoteSheetId: sheet.id,
          engine: "property_enrichment",
          status: "done",
          message: enriched.message,
        });
      }
      await db
        .insert(propertyEnrichmentCache)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          addressKey: enriched.cacheKey,
          provider: enriched.provider,
          facts: enriched.facts,
          conflicts: enriched.conflicts,
          message: enriched.message,
        })
        .onConflictDoUpdate({
          target: [propertyEnrichmentCache.tenantId, propertyEnrichmentCache.addressKey],
          set: {
            dealId,
            provider: enriched.provider,
            facts: enriched.facts,
            conflicts: enriched.conflicts,
            message: enriched.message,
            updatedAt: new Date(),
          },
        });
    }
  }
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  revalidatePath(`/deals/${dealId}`);
  const returnTo = str(formData, "returnTo");
  flashAction(returnTo || `/deals/${dealId}?tab=documents&line=${lineRaw}`, "field-confirmed");
}

export async function setDealSheetProduct(formData: FormData) {
  const dealId = str(formData, "dealId");
  const productRaw = str(formData, "product");
  if (!dealId || !isSheetProduct(productRaw)) throw new Error("Pick a line of business.");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const line = shopLineForProduct(productRaw);
  const formId = quotingFormForProduct(productRaw);
  const lineOfBusiness = lobForProduct(productRaw);
  const [contact] = deal.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, deal.contactId))
    : [];
  const [lead] = deal.leadId ? await db.select().from(leads).where(eq(leads.id, deal.leadId)) : [];
  const [account] = deal.accountId
    ? await db.select().from(accounts).where(eq(accounts.id, deal.accountId))
    : [];
  await db
    .update(deals)
    .set({
      lineOfBusiness,
      quotingLine: line,
      quotingForm: formId ?? deal.quotingForm,
      policySubType: productRaw,
      title: dealTitleForRecords({
        lineOfBusiness,
        primaryNamedInsured: deal.primaryNamedInsured,
        title: deal.title,
        contact,
        lead,
        account,
      }),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  const sheet = await ensureQuoteSheet(dealId, line);
  await db
    .update(quoteSheets)
    .set({
      values: {
        ...sheet.values,
        sheet_product: { value: productRaw, status: "confirmed", source: "agent" },
      },
      updatedAt: new Date(),
    })
    .where(eq(quoteSheets.id, sheet.id));
  revalidatePath(`/deals/${dealId}`);
  redirect(withFlash(`/deals/${dealId}?tab=documents&line=${line}&product=${productRaw}`, "deal-updated"));
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
  redirect(withFlash(`/deals/${dealId}?tab=documents&line=${lineRaw}`, "deal-updated"));
}

export async function fillQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  await runFillDealSheets(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
  flashAction(`/deals/${dealId}?tab=documents&line=${lineRaw}`, "sheet-filled");
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
  formId?: string;
}) {
  const session = await currentDeskSession().catch(() => null);
  const who = session?.name || "desk";
  const formId = input.formId || "HO3";
  for (const [key, next] of Object.entries(input.after)) {
    const prev = input.before[key];
    if (!prev) continue;
    const extracted = prev.source === "extracted" || prev.source === "public";
    if (!extracted) continue;
    if (next.source !== "agent") continue;
    if (prev.value.trim() === next.value.trim()) continue;
    if (!prev.value.trim() || !next.value.trim()) continue;
    if (input.dealId === DEAL_ID && key === "coverage_a") continue;
    const docType = prev.sourceLabel?.toLowerCase().includes("wind")
      ? "wind_mit"
      : prev.sourceLabel?.toLowerCase().includes("4-point")
        ? "four_point"
        : "dec";
    await db.insert(fillFeedbackLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      quoteSheetId: input.sheetId,
      docType,
      fieldKey: key,
      wrongValue: prev.value,
      correctedValue: next.value,
      reason: input.reason ?? "agent_edit",
      line: input.line,
      createdBy: who,
    });
    await db.insert(fillLearningLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      docType,
      fieldKey: key,
      extractedValue: prev.value,
      correctedValue: next.value,
      correctedBy: who,
      correctedByUserId: session?.userId ?? null,
      note: `form:${formId}`,
      shopLine: input.line,
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
        engine: classifyIngest(doc.mimeType, doc.filename, undefined).engine,
        status: "failed",
        message: `Could not read ${doc.filename} from storage.`,
      });
      continue;
    }

    try {
      const uploaded = await readUploadText(buffer, doc.mimeType, doc.filename);
      const text = uploaded.text;
      if (!text.trim()) {
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          engine: uploaded.engine === "ocr" ? "ocr" : "pdf_text",
          status: "failed",
          message: `Could not read text from ${doc.filename}.`,
        });
        continue;
      }
      const inferred = inferShopLine(text, doc.filename, doc.docType);
      const hoOntoHome = sourceDocFillsHome(doc.docType) && line === "home";
      if (inferred !== line && !hoOntoHome) {
        continue;
      }
      const extracted = extractFieldsFromText(text, doc.docType);
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
      const source = uploaded.engine === "ocr" ? "photo-ocr" : "extracted";
      const applied = applyExtractedToSheet(line, values, learned, { source });
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
      for (const unmapped of extracted.unmappedLabels) {
        await db.insert(extractedFields).values({
          tenantId: DEFAULT_TENANT_ID,
          documentId: doc.id,
          riskId: doc.riskId,
          fieldKey: "needs_review",
          rawValue: `${unmapped.sourceLabel}: ${unmapped.rawValue}`,
          normalizedValue: "",
          confidence: "0.000",
          flagged: true,
          appliedToRisk: false,
          reviewerNote: unmapped.sourceLabel,
        });
      }

      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: uploaded.engine === "ocr" ? "ocr" : "pdf_text",
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
      const message = error instanceof Error ? error.message : "Extract failed";
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: classifyIngest(doc.mimeType, doc.filename, buffer).engine,
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
