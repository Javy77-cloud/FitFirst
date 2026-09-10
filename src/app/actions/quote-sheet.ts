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
import {
  findLatestFieldAttempt,
  insertExtractionAttempt,
  insertFieldAttempts,
  listExtractionCorrectionsForLookup,
  recordExtractionCorrection,
} from "@/lib/extraction/audit";
import { mergeLearningHints } from "@/lib/fill-learning/lookup";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { applyLoggedCorrections } from "@/lib/fill-feedback/prefer";
import { persistDealFile, uploadRoot } from "@/lib/documents/store";
import {
  coerceRiskValue,
  fieldKeyToRiskColumn,
  type ExtractedField,
} from "@/lib/extraction/extract";
import {
  docTypeUsesGemini,
  extractWithGeminiPdf,
  fillableGeminiFields,
  geminiKeyReady,
  loadGeminiApiKey,
  MISSING_GEMINI_KEY_MESSAGE,
} from "@/lib/extraction/gemini";
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
  fieldIsBlank,
} from "@/lib/quote-sheet/apply";
import { ACTION_FLASH, ACTION_FLASH_MESSAGE, dealActionFlashHref } from "@/lib/desk/action-flash";
import { isSheetProduct, type SheetProduct } from "@/lib/quote-sheet/products";
import { blankSheetWithDefaults, emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import { applyMasterSheetDefaults } from "@/lib/quote-sheet/sheet-defaults";
import { addressFromSheet, lookupPublicFacts } from "@/lib/public-records/lookup";
import {
  ADDRESS_CONFIRM_KEYS,
  enrichPropertyOnAddressConfirm,
} from "@/lib/property-enrichment/service";
import { applyPropertyRecordsToSheet } from "@/lib/florida-property/apply";
import { geocodePropertyAddress } from "@/lib/getparceldata/geocode";
import {
  MILES_TO_COAST_SHEET_KEY,
  milesToNearestCoast,
  sheetCellForMilesToCoast,
} from "@/lib/geo/miles-to-coast";
import { toastForFillCounts } from "@/lib/quote-sheet/fill-toast";
import { loadGetParcelDataApiKey } from "@/lib/getparceldata/key";
import { orchestratePropertyFill } from "@/lib/property-fill/orchestrate";
import { toastForPropertyFill } from "@/lib/property-fill/merge";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import { loadRecordValues } from "@/lib/custom-fields/store";
import {
  MASTER_FILL_SKIP_NEEDS_KEY,
  MASTER_FILL_SKIP_NO_ADDRESS,
  MASTER_FILL_SKIP_NO_DEAL,
  MASTER_FILL_SKIP_NO_DOCS,
  MASTER_FILL_SKIP_NOT_FOUND,
  type MasterFillStepId,
  type MasterFillStepResult,
} from "@/lib/quote-sheet/master-fill";
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
import { isDocumentsSourceDoc, isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { withFlash } from "@/lib/flash";
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
      values: blankSheetWithDefaults(line),
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

function addressFromDealRecord(input: {
  sheet: Record<string, QuoteSheetFieldValue>;
  risk?: { address1?: string | null; city?: string | null; county?: string | null; state?: string | null; zip?: string | null } | null;
  deal?: { propertyOneliner?: string | null } | null;
}) {
  const sheet = addressFromSheet(input.sheet);
  const county = input.sheet.county?.value?.trim() || input.risk?.county || "";
  if ((sheet.address1 ?? "").trim()) {
    return { ...sheet, county };
  }
  const street = (input.risk?.address1 ?? "").trim() || (input.deal?.propertyOneliner ?? "").split("·")[0].trim();
  return {
    address1: street,
    city: input.risk?.city ?? sheet.city ?? "",
    county,
    state: input.risk?.state ?? sheet.state ?? "",
    zip: input.risk?.zip ?? sheet.zip ?? "",
  };
}

export type PropertyFillRunResult = {
  status: "ok" | "needs_key" | "no_address" | "not_found" | "error";
  filledKeys: string[];
  skippedKeys: string[];
  sourcesUsed: string[];
  message: string;
  toast: string;
};

/** Core Property Fill — returns counts (no redirect). Used by master Fill + form action. */
export async function runFillFromPropertyRecords(
  dealId: string,
  lineRaw: ShopLine,
): Promise<PropertyFillRunResult> {
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  // Property Fill uses quote-sheet property address only (not applicant/Lead/PDF).
  // One button → GetParcelData + County PA GIS + FEMA NFHL (empty-only merge).
  const sheetAddr = addressFromSheet(sheet.values);
  const address = {
    address1: sheetAddr.address1,
    city: sheetAddr.city,
    state: sheetAddr.state,
    zip: sheetAddr.zip,
    county: sheet.values.county?.value?.trim() || "",
  };
  const apiKey = await loadGetParcelDataApiKey();
  const bundle = await orchestratePropertyFill({ address, apiKey });
  // Re-read immediately before write — Gemini Fill may have landed while parcel APIs ran.
  const freshPropertyValues = await loadFreshSheetValues(sheet.id, sheet.values);
  const applied =
    bundle.status === "ok"
      ? applyPropertyRecordsToSheet(lineRaw, freshPropertyValues, bundle.facts)
      : { values: freshPropertyValues, filledKeys: [] as string[], skippedKeys: [] as string[] };

  // Free INTERNAL miles-to-coast when coords/address available — empty-only (same overwrite rules).
  let coastCoords: { lat?: number; lng?: number } = {
    lat: bundle.lookup.lat,
    lng: bundle.lookup.lng,
  };
  if (coastCoords.lat == null || coastCoords.lng == null) {
    const geo = await geocodePropertyAddress(address);
    if (geo.ok) coastCoords = { lat: geo.lat, lng: geo.lng };
  }
  const withCoast = applyMilesToCoastIfBlank(applied, coastCoords);

  if (bundle.status !== "ok" && !withCoast.filledKeys.includes(MILES_TO_COAST_SHEET_KEY)) {
    return {
      status: bundle.status,
      filledKeys: [],
      skippedKeys: [],
      sourcesUsed: bundle.sourcesUsed,
      message: bundle.message,
      toast: "",
    };
  }

  await db
    .update(quoteSheets)
    .set({ values: withCoast.values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  await db.insert(extractionJobs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    quoteSheetId: sheet.id,
    engine: "property_records",
    status: "done",
    filledKeys: withCoast.filledKeys,
    skippedKeys: withCoast.skippedKeys,
    message: bundle.message,
  });
  // Optional Why-drawer audit only — engine=api, NO synonym candidates from API.
  await insertExtractionAttempt({
    dealId,
    quoteSheetId: sheet.id,
    shopLine: lineRaw,
    docType: "property_records",
    engine: "api",
    status: "done",
    message: bundle.message,
    documentQuality: "clean",
    qualityNotes: [
      "property_records_api",
      "getparceldata",
      ...bundle.sourcesUsed,
    ],
  });
  await syncRiskFromSheet(dealId, withCoast.values, "fill");
  await syncHeaderFromSheet(dealId, withCoast.values, "fill");
  const toast =
    withCoast.filledKeys.length || withCoast.skippedKeys.length
      ? toastForFillCounts({
          filledCount: withCoast.filledKeys.length,
          skippedCount: withCoast.skippedKeys.length,
        })
      : toastForPropertyFill({
          filledCount: 0,
          sourcesUsed: bundle.sourcesUsed,
        });
  return {
    status: "ok",
    filledKeys: withCoast.filledKeys,
    skippedKeys: withCoast.skippedKeys,
    sourcesUsed: bundle.sourcesUsed,
    message: bundle.message,
    toast,
  };
}


type CoastApplyResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
  skippedKeys: string[];
};

/** Empty-only miles_to_coast write — matches property-fill (never clobber confirmed/check cells). */
function applyMilesToCoastIfBlank(
  applied: CoastApplyResult,
  coords: { lat?: number; lng?: number } | null | undefined,
): CoastApplyResult {
  if (coords?.lat == null || coords?.lng == null) return applied;
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return applied;
  if (!fieldIsBlank(applied.values[MILES_TO_COAST_SHEET_KEY])) {
    return {
      ...applied,
      skippedKeys: applied.skippedKeys.includes(MILES_TO_COAST_SHEET_KEY)
        ? applied.skippedKeys
        : [...applied.skippedKeys, MILES_TO_COAST_SHEET_KEY],
    };
  }
  const miles = milesToNearestCoast({ lat: coords.lat, lng: coords.lng });
  if (!Number.isFinite(miles)) return applied;
  return {
    values: {
      ...applied.values,
      [MILES_TO_COAST_SHEET_KEY]: sheetCellForMilesToCoast(miles),
    },
    filledKeys: [...applied.filledKeys, MILES_TO_COAST_SHEET_KEY],
    skippedKeys: applied.skippedKeys,
  };
}

export type ComputeMilesToCoastResult =
  | { ok: true; miles: string }
  | { ok: false; error: string };

/**
 * Button entry: recalculate INTERNAL miles_to_coast and write the Home master sheet cell.
 * Uses free ArcGIS geocode (already in product) + bundled FL shoreline — no paid Maps APIs.
 */
export async function runComputeMilesToCoast(input: {
  dealId: string;
  line: string;
}): Promise<ComputeMilesToCoastResult> {
  const dealId = String(input.dealId ?? "").trim();
  const lineRaw = String(input.line ?? "home").trim() || "home";
  if (!dealId) return { ok: false, error: "Missing deal" };
  if (!isShopLine(lineRaw)) return { ok: false, error: "Unknown line" };

  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  const sheetAddr = addressFromSheet(sheet.values);
  const address = {
    address1: sheetAddr.address1,
    city: sheetAddr.city,
    state: sheetAddr.state,
    zip: sheetAddr.zip,
  };
  if (!(address.address1 ?? "").trim()) {
    return { ok: false, error: "Add a property address on the sheet first." };
  }

  // Free ArcGIS geocode already used by property fill / GetParcel — no paid Google Geocoding.
  const geo = await geocodePropertyAddress(address);
  if (!geo.ok) return { ok: false, error: geo.message || "Could not geocode that address." };

  const miles = milesToNearestCoast({ lat: geo.lat, lng: geo.lng });
  if (!Number.isFinite(miles)) {
    return { ok: false, error: "Coastline geometry unavailable." };
  }
  const cell = sheetCellForMilesToCoast(miles);
  const fresh = await loadFreshSheetValues(sheet.id, sheet.values);
  const values = { ...fresh, [MILES_TO_COAST_SHEET_KEY]: cell };
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  await syncRiskFromSheet(dealId, values, "save");
  revalidatePath(`/deals/${dealId}`);
  return { ok: true, miles: cell.value };
}

export async function fillFromPropertyRecords(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const dest = `/deals/${dealId}?tab=documents&line=${lineRaw}`;
  const result = await runFillFromPropertyRecords(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
  if (result.status === "needs_key") {
    flashAction(dest, "property-records-needs-key", "error");
  }
  if (result.status === "no_address") {
    flashAction(dest, "property-records-no-address", "error");
  }
  if (result.status !== "ok") {
    const flash =
      result.status === "not_found" ? "property-records-not-found" : "property-records-error";
    flashAction(dest, flash, "error");
  }
  flashAction(dest, result.toast);
}

export type DealFillRunResult = {
  filledKeys: string[];
  skippedKeys: string[];
  note?: string;
};

/** Deal page → blank master-sheet fields (CHECK only — never auto-confirm). */
export async function runFillFromDealDetails(
  dealId: string,
  lineRaw: ShopLine,
): Promise<DealFillRunResult> {
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) {
    return { filledKeys: [], skippedKeys: [], note: MASTER_FILL_SKIP_NO_DEAL };
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const [contact] = deal.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, deal.contactId))
    : [];
  const [lead] = deal.leadId ? await db.select().from(leads).where(eq(leads.id, deal.leadId)) : [];
  const stored = await loadRecordValues(dealId, "deals");
  const fresh = await loadFreshSheetValues(sheet.id, sheet.values);
  const applied = fillSheetFromDealDetails(
    {
      primaryNamedInsured: deal.primaryNamedInsured,
      secondaryNamedInsured: deal.secondaryNamedInsured,
      propertyOneliner: deal.propertyOneliner,
      currentCarrier: deal.currentCarrier,
      coverageAmount: deal.coverageAmount,
      stored,
      risk: risk ?? null,
      contact: contact
        ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            dateOfBirth: contact.dateOfBirth,
            mailingAddress: contact.mailingAddress,
            city: contact.city,
            state: contact.state,
            zip: contact.zip,
          }
        : null,
      lead: lead
        ? {
            firstName: lead.firstName,
            middleName: lead.middleName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            dateOfBirth: lead.dateOfBirth,
            mailingAddress: lead.mailingAddress,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
            notes: lead.notes,
            source: lead.source,
            preferredLanguage: lead.preferredLanguage,
          }
        : null,
    },
    fresh,
  );
  if (!applied.filledKeys.length) {
    return {
      filledKeys: [],
      skippedKeys: applied.skippedKeys,
      note: MASTER_FILL_SKIP_NO_DEAL,
    };
  }
  await db
    .update(quoteSheets)
    .set({ values: applied.values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  await db.insert(extractionJobs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    quoteSheetId: sheet.id,
    engine: "deal_details",
    status: "done",
    filledKeys: applied.filledKeys,
    skippedKeys: applied.skippedKeys,
    message: "Copied deal details into blank master-sheet fields (CHECK).",
  });
  await syncRiskFromSheet(dealId, applied.values, "fill");
  await syncHeaderFromSheet(dealId, applied.values, "fill");
  return { filledKeys: applied.filledKeys, skippedKeys: applied.skippedKeys };
}


/** Empty-only protection/hazard defaults after a Fill step (never overwrites agent cells). */
async function persistMasterSheetDefaults(dealId: string, lineRaw: ShopLine): Promise<number> {
  const sheet = await ensureQuoteSheet(dealId, lineRaw);
  const fresh = await loadFreshSheetValues(sheet.id, sheet.values);
  const applied = applyMasterSheetDefaults(fresh);
  if (!applied.filledKeys.length) return 0;
  await db
    .update(quoteSheets)
    .set({ values: applied.values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  return applied.filledKeys.length;
}

/**
 * One master-sheet Fill step for the progress modal.
 * Deal → Property → Docs. Returns counts; does not redirect/toast.
 */
export async function fillMasterSheetStep(input: {
  dealId: string;
  line: string;
  step: MasterFillStepId;
}): Promise<MasterFillStepResult> {
  const dealId = String(input.dealId ?? "").trim();
  const lineRaw = String(input.line ?? "home").trim() || "home";
  if (!dealId) throw new Error("Missing deal");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const step = input.step;

  if (step === "deal") {
    const result = await runFillFromDealDetails(dealId, lineRaw);
    const defaultsFilled = await persistMasterSheetDefaults(dealId, lineRaw);
    revalidatePath(`/deals/${dealId}`);
    return {
      step,
      filledCount: result.filledKeys.length + defaultsFilled,
      skippedCount: result.skippedKeys.length,
      note: result.note,
    };
  }

  if (step === "property") {
    const result = await runFillFromPropertyRecords(dealId, lineRaw);
    revalidatePath(`/deals/${dealId}`);
    if (result.status === "no_address") {
      return { step, filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NO_ADDRESS };
    }
    if (result.status === "needs_key") {
      return { step, filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NEEDS_KEY };
    }
    if (result.status === "not_found") {
      return { step, filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NOT_FOUND };
    }
    if (result.status !== "ok") {
      return {
        step,
        filledCount: 0,
        skippedCount: 0,
        error: result.message || "Property records error",
      };
    }
    return {
      step,
      filledCount: result.filledKeys.length,
      skippedCount: result.skippedKeys.length,
    };
  }

  // docs
  const allDocs = await db
    .select({ id: documents.id, slot: documents.slot, docType: documents.docType, tags: documents.tags })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId)));
  const docs = allDocs.filter((doc) => isDocumentsSourceDoc(doc));
  if (docs.length === 0) {
    return { step, filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NO_DOCS };
  }
  const geminiKey = await loadGeminiApiKey();
  if (!geminiKeyReady(geminiKey)) {
    return {
      step,
      filledCount: 0,
      skippedCount: 0,
      error: "Gemini API key is not configured — docs fill skipped",
    };
  }
  const counts = await runFillDealSheets(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
  return {
    step,
    filledCount: counts.filledKeys.length,
    skippedCount: counts.skippedKeys.length,
  };
}

export async function fillQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const geminiKey = await loadGeminiApiKey();
  if (!geminiKeyReady(geminiKey)) {
    flashAction(`/deals/${dealId}?tab=documents&line=${lineRaw}`, "gemini-needs-key", "error");
  }
  const counts = await runFillDealSheets(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
  // Stay on Documents after Fill — Markets only after Confirm & request quotes.
  flashAction(
    `/deals/${dealId}?tab=documents&line=${lineRaw}`,
    toastForFillCounts({
      filledCount: counts.filledKeys.length,
      skippedCount: counts.skippedKeys.length,
    }),
  );
}

export type FillDealCounts = { filledKeys: string[]; skippedKeys: string[] };

export async function runFillDealSheets(dealId: string, primary: ShopLine): Promise<FillDealCounts> {
  const primaryCounts = await runFillQuoteSheet(dealId, primary);
  const other = await fillOtherShopLines(dealId, primary);
  return {
    filledKeys: [...primaryCounts.filledKeys, ...other.filledKeys],
    skippedKeys: [...primaryCounts.skippedKeys, ...other.skippedKeys],
  };
}

async function fillOtherShopLines(dealId: string, already: ShopLine): Promise<FillDealCounts> {
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  for (const line of deal?.shopLines ?? []) {
    if (line !== already && isShopLine(line)) {
      const counts = await runFillQuoteSheet(dealId, line);
      filledKeys.push(...counts.filledKeys);
      skippedKeys.push(...counts.skippedKeys);
    }
  }
  return { filledKeys, skippedKeys };
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
  if (docType === "wind_mit") return "wind mitigation";
  if (docType === "four_point") return "4pt inspection";
  if (docType === "related_insured") return "related insured";
  if (docType === "dec" || docType === "policy" || docType === "current_policy") return "dec page";
  if (docType === "inspection") return "Inspection";
  if (docType === "photo") return "Photo";
  return filename ? `dec page · ${filename}` : "dec page";
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
    const extracted = prev.source === "extracted" || prev.source === "public" || prev.source === "photo-ocr";
    if (!extracted) continue;
    if (next.source !== "agent") continue;
    if (prev.value.trim() === next.value.trim()) continue;
    if (!prev.value.trim() || !next.value.trim()) continue;
    const tag = prev.sourceLabel?.toLowerCase() ?? "";
    const docType = tag.includes("wind")
      ? "wind_mit"
      : tag.includes("4pt") || tag.includes("4-point")
        ? "four_point"
        : tag.includes("related")
          ? "related_insured"
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
    const latest = await findLatestFieldAttempt(input.dealId, key);
    await recordExtractionCorrection({
      dealId: input.dealId,
      documentId: latest?.attempt.documentId ?? null,
      fieldAttemptId: latest?.field.id ?? null,
      evidenceAttemptId: latest?.attempt.id ?? null,
      docType,
      fieldKey: key,
      shopLine: input.line,
      extractedValue: prev.value,
      correctedValue: next.value,
      reason: (input.reason as "agent_edit" | "paste_wrong" | "mapping_wrong") || "agent_edit",
      correctedBy: who,
      correctedByUserId: session?.userId ?? null,
      note: `form:${formId}`,
      existingSource: prev.source,
      missReason: latest?.field.missReason ?? null,
      proposedSynonym: latest?.field.matchedSynonym ?? null,
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
  const docType = str(formData, "docType") || "dec";
  const who = session?.name || "desk";
  await db.insert(fillFeedbackLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    quoteSheetId: sheet.id,
    docType,
    fieldKey,
    wrongValue,
    correctedValue: note,
    reason: "paste_wrong",
    line: lineRaw,
    createdBy: who,
  });
  const latest = await findLatestFieldAttempt(dealId, fieldKey);
  const pasteProposed = str(formData, "proposedSynonym");
  const proposedSynonym = latest?.field.matchedSynonym ?? (pasteProposed.length > 0 ? pasteProposed : null);
  await recordExtractionCorrection({
    dealId,
    documentId: latest?.attempt.documentId ?? null,
    fieldAttemptId: latest?.field.id ?? null,
    evidenceAttemptId: latest?.attempt.id ?? null,
    docType,
    fieldKey,
    shopLine: lineRaw,
    extractedValue: wrongValue,
    correctedValue: note,
    reason: "paste_wrong",
    correctedBy: who,
    correctedByUserId: session?.userId ?? null,
    note,
    existingSource: sheet.values[fieldKey]?.source,
    missReason: latest?.field.missReason ?? null,
    proposedSynonym,
  });
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes/fill-feedback");
  revalidatePath("/logs/synonym-candidates");
}


async function persistSheetValues(
  sheetId: string,
  values: Record<string, QuoteSheetFieldValue>,
) {
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheetId));
}

/** Re-read sheet values from DB so concurrent Fill (e.g. property records) is not wiped. */
async function loadFreshSheetValues(
  sheetId: string,
  fallback: Record<string, QuoteSheetFieldValue>,
): Promise<Record<string, QuoteSheetFieldValue>> {
  const [fresh] = await db
    .select({ values: quoteSheets.values })
    .from(quoteSheets)
    .where(eq(quoteSheets.id, sheetId));
  if (!fresh?.values || typeof fresh.values !== "object") return fallback;
  return fresh.values as Record<string, QuoteSheetFieldValue>;
}

async function logExtractionJob(input: {
  dealId: string;
  documentId?: string | null;
  quoteSheetId: string;
  engine: string;
  status: string;
  filledKeys: string[];
  skippedKeys: string[];
  message: string;
}) {
  try {
    await db.insert(extractionJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      documentId: input.documentId ?? null,
      quoteSheetId: input.quoteSheetId,
      engine: input.engine,
      status: input.status,
      filledKeys: input.filledKeys,
      skippedKeys: input.skippedKeys,
      message: input.message,
    });
  } catch (error) {
    // Document may have been deleted mid-fill (FK). Retry without documentId.
    const message = error instanceof Error ? error.message : "job insert failed";
    if (input.documentId) {
      try {
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId: input.dealId,
          documentId: null,
          quoteSheetId: input.quoteSheetId,
          engine: input.engine,
          status: input.status,
          filledKeys: input.filledKeys,
          skippedKeys: input.skippedKeys,
          message: input.message,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    console.error("[logExtractionJob]", message.slice(0, 300));
  }
}

export async function runFillQuoteSheet(dealId: string, line: ShopLine): Promise<FillDealCounts> {
  const sheet = await ensureQuoteSheet(dealId, line);
  const docs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId)));
  const corrections = await loadFillCorrections();
  const learningLogs = mergeLearningHints(
    await listFillLearningForLookup(),
    await listExtractionCorrectionsForLookup(),
  );

  let values: Record<string, QuoteSheetFieldValue> = { ...sheet.values };
  if (Object.keys(values).length === 0) values = emptySheetValues(line);
  const aggregateFilled: string[] = [];
  const aggregateSkipped: string[] = [];

  for (const doc of docs) {
    if (isQuoteAttachment(doc.docType, doc.filename) || isQuoteFileDoc(doc)) continue;
    const startedAt = new Date();
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
        filledKeys: [],
        skippedKeys: [],
        message: `Could not read ${doc.filename} from storage.`,
      });
      await insertExtractionAttempt({
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        shopLine: line,
        docType: doc.docType || "",
        engine: classifyIngest(doc.mimeType, doc.filename, undefined).engine === "ocr" ? "ocr" : "pdf_text",
        status: "failed",
        message: `Could not read ${doc.filename} from storage.`,
        startedAt,
      });
      continue;
    }

    try {
      const geminiKey = await loadGeminiApiKey();
      if (docTypeUsesGemini(doc.docType) && !geminiKeyReady(geminiKey)) {
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          engine: "gemini",
          status: "failed",
          filledKeys: [],
          skippedKeys: [],
          message: MISSING_GEMINI_KEY_MESSAGE,
        });
        await insertExtractionAttempt({
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          shopLine: line,
          docType: doc.docType || "",
          engine: "gemini",
          status: "failed",
          message: MISSING_GEMINI_KEY_MESSAGE,
          startedAt,
        });
        continue;
      }

      // Prefer filename / typed docType for shop-line gate (no synonym text extract).
      let textForLine = "";
      try {
        const uploaded = await readUploadText(buffer, doc.mimeType, doc.filename);
        textForLine = uploaded.text;
      } catch {
        textForLine = "";
      }
      const inferred = inferShopLine(textForLine, doc.filename, doc.docType);
      const hoOntoHome = sourceDocFillsHome(doc.docType) && line === "home";
      if (inferred !== line && !hoOntoHome) {
        await insertExtractionAttempt({
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          shopLine: line,
          docType: doc.docType || inferred || "",
          docTypeInferred: !doc.docType,
          engine: "gemini",
          status: "skipped",
          message: `Wrong shop line for ${doc.filename}: inferred ${inferred}, sheet is ${line}. No field attempts.`,
          startedAt,
        });
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          engine: "gemini",
          status: "skipped",
          filledKeys: [],
          skippedKeys: [],
          message: `Skipped ${doc.filename} — wrong shop line (inferred ${inferred}).`,
        });
        continue;
      }

      if (!docTypeUsesGemini(doc.docType)) {
        await insertExtractionAttempt({
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          shopLine: line,
          docType: doc.docType || "",
          engine: "gemini",
          status: "skipped",
          message: `Skipped ${doc.filename} — not a Gemini source doc type.`,
          startedAt,
        });
        continue;
      }

      const gemini = await extractWithGeminiPdf(buffer, doc.docType, { apiKey: geminiKey, mimeType: doc.mimeType, filename: doc.filename });
      const engine = "gemini" as const;
      if (!gemini.ok) {
        await db.insert(extractionJobs).values({
          tenantId: DEFAULT_TENANT_ID,
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          engine,
          status: "failed",
          filledKeys: [],
          skippedKeys: [],
          message: `Gemini extract failed for ${doc.filename}: ${gemini.message}`,
        });
        await insertExtractionAttempt({
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          shopLine: line,
          docType: doc.docType || "",
          engine,
          status: "failed",
          message: `Gemini extract failed for ${doc.filename}: ${gemini.message}`,
          startedAt,
        });
        continue;
      }
      const extracted = gemini.result;
      const feedback = applyLoggedCorrections(extracted.fields, doc.docType, corrections);
      const learned = applyLearningToExtracted(
        fillableGeminiFields(feedback.fields).map((field) => ({
          fieldKey: field.fieldKey,
          normalizedValue: field.normalizedValue,
          sourceLabel: field.sourceDocTag || sourceLabelForDoc(doc.docType, doc.filename),
          sourceDocTag: field.sourceDocTag,
          blankAfterMatch: field.blankAfterMatch,
          matchPath: field.matchPath,
          matchedSynonym: field.matchedSynonym,
          sourceLine: field.sourceLine,
          sourceLineNo: field.sourceLineNo,
          missReason: field.missReason,
        })),
        learningLogs,
        { docType: doc.docType || "dec", dealId },
      );
      const source = "extracted";
      const isFourPoint =
        doc.docType === "four_point" ||
        /four[\s_-]?point|4[\s_-]?pt|4pt/i.test(doc.docType || "") ||
        /four[\s_-]?point|4[\s_-]?pt|4pt/i.test(doc.filename || "");
      // Re-read immediately before apply+write so concurrent property Fill (beds/baths)
      // is not wiped by a stale in-memory snapshot from ~20s earlier.
      const freshValues = await loadFreshSheetValues(sheet.id, values);
      const applied = applyExtractedToSheet(line, freshValues, learned, {
        source,
        overwriteWeakCheck: isFourPoint,
        recordMismatches: true,
        mismatchIncomingLabel: isFourPoint ? "4pt" : "Gemini",
      });
      values = applied.values;
      aggregateFilled.push(...applied.filledKeys);
      aggregateSkipped.push(...applied.skippedKeys);
      // Persist IMMEDIATELY so a later audit FK failure / delete race cannot leave
      // "Filled N fields" jobs with an empty sheet.
      await persistSheetValues(sheet.id, values);
      console.info("[runFillQuoteSheet] persisted", {
        dealId,
        filename: doc.filename,
        filledKeyNames: applied.filledKeys,
      });
      await syncNamedInsuredFromExtract(dealId, extracted.fields);

      const countsToast = toastForFillCounts({
        filledCount: applied.filledKeys.length,
        skippedCount: applied.skippedKeys.length,
      });
      const doneMessage = `${countsToast} (${doc.filename}). CHECK = use the value. Source files stay on Files.`;

      try {
        const attempt = await insertExtractionAttempt({
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          shopLine: line,
          docType: doc.docType || extracted.fieldMapDocType || "",
          docTypeInferred: !doc.docType,
          engine,
          documentQuality: extracted.documentQuality,
          qualityNotes: extracted.qualityNotes,
          status: extracted.glanceRequired ? "needs_glance" : "done",
          message: `${countsToast} (${doc.filename}).`,
          startedAt,
        });
        await insertFieldAttempts({
          attemptId: attempt.id,
          line,
          fields: extracted.fields,
          filledSheetKeys: applied.filledKeys,
          sourceLabel: sourceLabelForDoc(doc.docType, doc.filename),
        });

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
      } catch (auditError) {
        const auditMessage =
          auditError instanceof Error ? auditError.message : "audit insert failed";
        console.error("[runFillQuoteSheet] audit failed after persist", {
          dealId,
          filename: doc.filename,
          auditMessage: auditMessage.slice(0, 400),
        });
      }

      await logExtractionJob({
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine,
        status: "done",
        filledKeys: applied.filledKeys,
        skippedKeys: applied.skippedKeys,
        message: doneMessage,
      });
      try {
        await db
          .update(documents)
          .set({ status: extracted.glanceRequired ? "needs_glance" : "extracted" })
          .where(eq(documents.id, doc.id));
      } catch {
        /* doc may have been deleted mid-fill */
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extract failed";
      await logExtractionJob({
        dealId,
        documentId: doc.id,
        quoteSheetId: sheet.id,
        engine: classifyIngest(doc.mimeType, doc.filename, buffer).engine,
        status: "failed",
        filledKeys: [],
        skippedKeys: [],
        message,
      });
      try {
        await insertExtractionAttempt({
          dealId,
          documentId: doc.id,
          quoteSheetId: sheet.id,
          shopLine: line,
          docType: doc.docType || "",
          engine: classifyIngest(doc.mimeType, doc.filename, buffer).engine === "ocr" ? "ocr" : "pdf_text",
          status: "failed",
          message,
          startedAt,
        });
      } catch {
        /* audit optional — sheet values already persisted when apply succeeded */
      }
    }
  }

  if (docs.length === 0) {
    await db.insert(extractionJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      quoteSheetId: sheet.id,
      engine: "pdf_text",
      status: "failed",
      filledKeys: [],
      skippedKeys: [],
      message: "No source files on this deal. Drop a dec, wind mit, or 4-point first.",
    });
    return { filledKeys: [], skippedKeys: [] };
  }

  // Re-read before public gap-fill / final write — never clobber concurrent Fill.
  values = await loadFreshSheetValues(sheet.id, values);
  const publicLookup = await lookupPublicFacts(addressFromSheet(values));
  if (publicLookup.facts.length) {
    const publicApplied = applyPublicToSheet(line, values, publicLookup.facts);
    values = publicApplied.values;
    aggregateFilled.push(...publicApplied.filledKeys);
    aggregateSkipped.push(...publicApplied.skippedKeys);
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

  await persistSheetValues(sheet.id, values);

  await syncRiskFromSheet(dealId, values, "fill");
  await syncHeaderFromSheet(dealId, values, "fill");
  return { filledKeys: aggregateFilled, skippedKeys: aggregateSkipped };
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
