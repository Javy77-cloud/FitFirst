"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { fillStayHref } from "@/lib/documents/deal-docs-save";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import {
  parseProductInstanceToken,
  parseStorageLine,
  requireStorageLine,
} from "@/lib/deals/product-instances";
import { dealProductDef } from "@/lib/deals/deal-products";
import {
  addressFromSheetSubmission,
  addressFromSheetValues,
  instanceOwnsSheet,
  isPropertyCoveringProduct,
  legacyAutoOwnerKey,
  legacyPropertyOwnerKey,
  newCopyPropertySeed,
  riskSyncValuesForInstance,
  sheetAddressCells,
  splitSharedSheetAddressSave,
  vehiclesOnAutoSheet,
} from "@/lib/deals/product-property";
import {
  instancesFromDeal,
  listDealRisks,
  saveAutoVehicleRisks,
  saveInstancePropertyAddress,
} from "@/lib/deals/product-property-store";
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
import { persistDealFile } from "@/lib/documents/store";
import { readStoredFile } from "@/lib/files/object-store";
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
import { inferShopLine, isQuoteAttachment, looksLikeFloodPolicyDoc, sourceDocFillsHome, trustSheetLineForFill } from "@/lib/ingest/identity";
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
import {
  ACTION_FLASH,
  ACTION_FLASH_MESSAGE,
  SHEET_CONFIRM_HASH,
  dealActionFlashHref,
} from "@/lib/desk/action-flash";
import { isSheetProduct, type SheetProduct } from "@/lib/quote-sheet/products";
import { blankSheetWithDefaults, emptySheetValues, extractKeyToSheetKey } from "@/lib/quote-sheet/catalog";
import {
  coverageLinesValueForDeal,
  isCommercialSheetLine,
} from "@/lib/quote-sheet/commercial-risk-profile";
import { applyMasterSheetDefaults, emptyDefaultsForLine } from "@/lib/quote-sheet/sheet-defaults";
import { addressFromSheet, lookupPublicFacts } from "@/lib/public-records/lookup";
import {
  ADDRESS_CONFIRM_KEYS,
  enrichPropertyOnAddressConfirm,
} from "@/lib/property-enrichment/service";
import { applyPropertyRecordsToSheet } from "@/lib/florida-property/apply";
import { moveSoleSheetMailingToProperty } from "@/lib/quote-sheet/home-address-fill";
import { isDwellingFireProduct } from "@/lib/deals/dwelling-addresses";
import { geocodePropertyAddress } from "@/lib/getparceldata/geocode";
import {
  MILES_TO_COAST_SHEET_KEY,
  milesToNearestCoast,
  sheetCellForMilesToCoast,
} from "@/lib/geo/miles-to-coast";
import { toastForFillCounts } from "@/lib/quote-sheet/fill-toast";
import { loadGetParcelDataApiKey } from "@/lib/getparceldata/key";
import { loadPermitStackApiKey } from "@/lib/permitstack/key";
import { orchestratePropertyFill } from "@/lib/property-fill/orchestrate";
import { isZoneXNoBfe, toastForPropertyFill } from "@/lib/property-fill/merge";
import {
  NHTSA_VPIC_LABEL,
  coerceVinDecodeValues,
  isDecodableVin,
  isVehicleVinSheetKey,
  normalizeVin,
  orchestrateVinDecodeFill,
  blankVinCoreFacts,
  overlayFormVins,
  shouldRunVinDecode,
} from "@/lib/vin-decode";
import type { VinDecodeValues } from "@/lib/vin-decode";
import { fillSheetFromDealDetails, type DealSheetCopyInput } from "@/lib/quote-sheet/fill-from-deal";
import { loadRecordValues, writeRecordValues } from "@/lib/custom-fields/store";
import { cascadeValuesFromDealHints } from "@/lib/deals/insurance-cascade";
import {
  MASTER_FILL_SKIP_AUTO_PROPERTY,
  MASTER_FILL_SKIP_NEEDS_KEY,
  MASTER_FILL_SKIP_NO_ADDRESS,
  MASTER_FILL_SKIP_NO_DEAL,
  MASTER_FILL_SKIP_NO_DOCS,
  MASTER_FILL_SKIP_NO_VIN,
  MASTER_FILL_SKIP_NOT_FOUND,
  MASTER_FILL_UNEXPECTED,
  MASTER_FILL_DOC_TIMEOUT_MS,
  MASTER_FILL_STEP_TIMEOUT_MS,
  masterFillStepTimeoutMessage,
  masterFillUnexpectedMessage,
  type MasterFillDocList,
  masterFillStepsForLine,
  type MasterFillStepId,
  type MasterFillStepResult,
} from "@/lib/quote-sheet/master-fill";
import { DeadlineError, withDeadline } from "@/lib/async/deadline";
import { isImageUpload } from "@/lib/extraction/ocr";
import { SHOP_LINES } from "@/lib/domain";
import { ERRORS_OMISSIONS_LABEL, isErrorsOmissionsProduct } from "@/lib/policy/eo";
import { currentDeskSession } from "@/lib/auth/session";
import { applyLearningToExtracted } from "@/lib/fill-learning/lookup";
import { listFillLearningForLookup } from "@/lib/db/queries";
import { DEAL_ID } from "@/lib/fixtures/ids";
import {
  lobForProduct,
  quotingFormForProduct,
  sheetProductForQuotingForm,
  shopLineForProduct,
} from "@/lib/deals/deal-line";
import {
  defaultFormForShopLine,
  mergeShopLinesKeepExisting,
  packageCreateDraft,
} from "@/lib/deals/package-lines";
import { flashAction } from "@/lib/flash-action";
import { isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { selectFillDocsForProductWindow } from "@/lib/quote-sheet/fill-docs-for-product";
import { withFlash } from "@/lib/flash";
import { dealTitleForRecords } from "@/lib/deals/deal-title";
import { markShopFlowStaleAfterRiskChange, persistSheetRecheckCue } from "@/lib/deals/shop-flow-persist";
import { restoreDealSourceDocuments } from "@/lib/documents/restore-deal-docs";
import { filledKeysAreRatingCritical, ratingCriticalChanged } from "@/lib/deals/rating-critical";
import { carrierTransferValues } from "@/lib/quote-sheet/home-inspections";
import { parseShopFlow, sheetValuesFingerprint } from "@/lib/deals/shop-flow";
import {
  normalizeProductInstanceList,
  resolveVisibleProductInstances,
  storageLineForInstance,
} from "@/lib/deals/product-instances";
import { productStageFor } from "@/lib/deals/product-stages";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function isShopLine(value: string): value is ShopLine {
  return (SHOP_LINES as readonly string[]).includes(value);
}

/** Shared Deal Details payload for Fill and first-open Auto seed — same mapping, one helper. */
async function loadDealSheetCopyInput(
  dealId: string,
  lineRaw: ShopLine,
): Promise<DealSheetCopyInput | null> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return null;
  const riskRows = await listDealRisks(dealId);
  const risk = riskRows.find((row) => !String(row.productKey ?? "").trim()) ?? riskRows[0];
  const [contact] = deal.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, deal.contactId))
    : [];
  const [lead] = deal.leadId ? await db.select().from(leads).where(eq(leads.id, deal.leadId)) : [];
  const stored = await loadRecordValues(dealId, "deals");
  return {
    primaryNamedInsured: deal.primaryNamedInsured,
    secondaryNamedInsured: deal.secondaryNamedInsured,
    propertyOneliner: deal.propertyOneliner,
    currentCarrier: deal.currentCarrier,
    coverageAmount: deal.coverageAmount,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
    quotingLine: lineRaw,
    shopProducts: deal.shopProducts,
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
  };
}

export async function ensureQuoteSheet(dealId: string, line: string) {
  const opened = requireStorageLine(line);
  const [existing] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, opened.storageLine),
      ),
    );
  if (existing) return existing;
  const values = blankSheetWithDefaults(opened.shopLine);
  const form = defaultFormForShopLine(opened.shopLine);
  if (form) {
    values.quoting_form = { value: form, status: "confirmed", source: "agent" };
    const product = sheetProductForQuotingForm(form);
    if (product) {
      values.sheet_product = { value: product, status: "confirmed", source: "agent" };
    }
  }
  if (isCommercialSheetLine(opened.shopLine)) {
    const [deal] = await db
      .select({ shopProducts: deals.shopProducts, quotingLine: deals.quotingLine })
      .from(deals)
      .where(eq(deals.id, dealId));
    const coverage = coverageLinesValueForDeal({
      line: opened.shopLine,
      products: deal?.shopProducts,
    });
    if (coverage) {
      values.coverage_lines = { value: coverage, status: "confirmed", source: "agent" };
    }
    if (!String(values.premises_same_as_business?.value ?? "").trim()) {
      values.premises_same_as_business = { value: "Yes", status: "confirmed", source: "agent" };
    }
  }
  // First-open Auto Risk Profile: same Deal Details → driver mapping as Fill (empty cells only).
  // A second Auto copy starts blank so it does not inherit the first vehicle.
  if (line === "auto") {
    const input = await loadDealSheetCopyInput(dealId, opened.shopLine);
    if (input) {
      Object.assign(values, fillSheetFromDealDetails(input, values).values);
    }
  }
  const copy = opened.instanceKey ? parseProductInstanceToken(opened.instanceKey) : null;
  if (copy && isPropertyCoveringProduct(copy.productId)) {
    const quotingForm = dealProductDef(copy.productId).quotingForm;
    values.quoting_form = { value: quotingForm, status: "confirmed", source: "agent" };
    values.sheet_product = { value: copy.productId, status: "confirmed", source: "agent" };
    const stored = await loadRecordValues(dealId, "deals").catch(() => ({} as Record<string, string>));
    const dwellingFire = isDwellingFireProduct(quotingForm, copy.productId);
    const seed = newCopyPropertySeed(stored, { dwellingFire });
    Object.assign(values, sheetAddressCells(seed.address, copy.key, true));
  }
  const [created] = await db
    .insert(quoteSheets)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line: opened.storageLine,
      values,
    })
    .returning();
  return created;
}

export async function persistQuoteSheetValues(
  dealId: string,
  line: string,
  submitted: Record<string, string>,
  formId?: string,
  instanceKey?: string | null,
) {
  const opened = requireStorageLine(line);
  const sheet = await ensureQuoteSheet(dealId, opened.storageLine);
  const productRaw = submitted.sheet_product?.trim();
  const product = productRaw && isSheetProduct(productRaw) ? (productRaw as SheetProduct) : undefined;
  let values = mergeAgentEdits(sheet.values, submitted, opened.shopLine, product);
  if (productRaw) {
    values.sheet_product = { value: productRaw, status: "confirmed", source: "agent" };
  }
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const instances = deal ? instancesFromDeal(deal) : [];
  const instance = parseProductInstanceToken(instanceKey ?? opened.instanceKey);
  let separateProperty = false;
  if (instance && isPropertyCoveringProduct(instance.productId) && deal) {
    const legacyKey = legacyPropertyOwnerKey(instances);
    const ownsSheet = instanceOwnsSheet(instance, instances);
    const separate = Boolean(legacyKey) && instance.key !== legacyKey;
    if (separate) {
      separateProperty = true;
      const submittedAddress = addressFromSheetSubmission(submitted);
      if (!ownsSheet) {
        values = splitSharedSheetAddressSave({
          previous: sheet.values,
          merged: values,
          instanceKey: instance.key,
          submitted: submittedAddress,
          characteristicSource: submitted,
        });
      }
      await saveInstancePropertyAddress({
        dealId,
        tenantId: deal.tenantId,
        contactId: deal.contactId,
        instanceKey: instance.key,
        address: ownsSheet ? addressFromSheetValues(values, instance.key, true) : submittedAddress,
        legacyOwnerKey: legacyKey,
      });
      const ownRows = await listDealRisks(dealId, deal.tenantId);
      const own = ownRows.find((row) => (row.productKey ?? "").trim() === instance.key);
      if (own) {
        await applySheetToRiskRow(
          own,
          riskSyncValuesForInstance(values, instance.key, ownsSheet),
          "save",
        );
      }
    }
  }
  await logSheetCorrections({
    dealId,
    sheetId: sheet.id,
    line: opened.shopLine,
    before: sheet.values,
    after: values,
    formId: formId || deal?.quotingForm || "HO3",
  });
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  // The original sheet still mirrors the original risk. A later product does not.
  if (!separateProperty) {
    await syncRiskFromSheet(dealId, values, "save", {
      shopLine: opened.shopLine,
      storageLine: opened.storageLine,
      instanceKey: instance?.key ?? opened.instanceKey,
    });
    const propertyOwnsHeader = Boolean(legacyPropertyOwnerKey(instances));
    if (!(opened.shopLine === "auto" && propertyOwnsHeader)) {
      await syncHeaderFromSheet(dealId, values, "save");
    }
  }
  if (sheetValuesFingerprint(sheet.values) !== sheetValuesFingerprint(values)) {
    // Keep Markets complete — cue Quotes Recheck; clear unlock only if rating-critical.
    await persistSheetRecheckCue(dealId, opened.storageLine);
    const dropPropertySidecars = (rows: Record<string, QuoteSheetFieldValue>) => {
      const next = { ...rows };
      for (const key of Object.keys(next)) {
        if (key.startsWith("ffpa:")) delete next[key];
      }
      return next;
    };
    await markShopFlowStaleAfterRiskChange(dealId, opened.storageLine, {
      ratingCritical: ratingCriticalChanged(
        dropPropertySidecars(opened.shopLine === "home" ? carrierTransferValues(sheet.values) : sheet.values),
        dropPropertySidecars(opened.shopLine === "home" ? carrierTransferValues(values) : values),
      ),
    });
  }
  // Sheet save / confirm / stale cue must never unlink or hide source docs.
  await restoreDealSourceDocuments(dealId).catch(() => null);
  let vinDecode: VinDecodeRun | null = null;
  if (opened.shopLine === "auto" || line === "auto") {
    const product = (values.sheet_product?.value ?? "").trim() || null;
    // VIN set/changed, or year/make/model/body/fuel/engine still blank.
    // Save already landed; a vPIC failure must not fail the save. Agent and
    // Gemini values stay put (empty-only merge).
    if (shouldRunVinDecode(sheet.values, values, product)) {
      try {
        vinDecode = await runFillFromVinDecode(dealId, opened.storageLine);
      } catch (error) {
        const message = error instanceof Error ? error.message : "NHTSA vPIC decode failed";
        console.error("[persistQuoteSheetValues] vin decode", message.slice(0, 300));
        vinDecode = {
          filledKeys: [],
          skippedKeys: [],
          vinsDecoded: [],
          filled: [],
          toast: "",
          status: "error",
          message,
        };
      }
    }
  }
  return { values, vinDecode };
}

export async function applySavedSheetToDeal(dealId: string, line: string) {
  const opened = parseStorageLine(line);
  const storageLine = opened?.storageLine ?? line;
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, storageLine),
      ),
    );
  if (!sheet) return null;
  if (opened?.shopLine === "auto") {
    await syncRiskFromSheet(dealId, sheet.values, "save", {
      shopLine: "auto",
      storageLine: opened.storageLine,
      instanceKey: opened.instanceKey,
    });
  } else if (!opened?.instanceKey) {
    await syncRiskFromSheet(dealId, sheet.values, "save");
    await syncHeaderFromSheet(dealId, sheet.values, "save");
  }
  await restoreDealSourceDocuments(dealId).catch(() => null);
  return sheet.values;
}

export async function saveQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  const openedLine = parseStorageLine(lineRaw);
  if (!openedLine) throw new Error("Unknown line");
  const submitted = submittedSheetValues(formData);
  const product = str(formData, "sheet_product");
  if (product) submitted.sheet_product = product;
  const { persistDealSourceUploads } = await import("@/app/actions/documents");
  await persistDealSourceUploads(formData);
  const persisted = await persistQuoteSheetValues(
    dealId,
    openedLine.storageLine,
    submitted,
    str(formData, "formId"),
    str(formData, "productInstance") || null,
  );
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/quotes/fill-feedback");
  const vinDecodeError =
    persisted.vinDecode?.status === "error"
      ? persisted.vinDecode.message || "NHTSA vPIC decode failed"
      : undefined;
  const flash = {
    ok: true as const,
    notice: ACTION_FLASH.sheetSaved,
    message: ACTION_FLASH_MESSAGE[ACTION_FLASH.sheetSaved],
    vinDecodeError,
    vinFilled: persisted.vinDecode?.filled ?? [],
  };
  if (str(formData, "flash") === "0") return flash;
  const returnTo = str(formData, "returnTo");
  const dest = returnTo
    ? returnTo.includes("#")
      ? returnTo
      : `${returnTo}#${SHEET_CONFIRM_HASH}`
    : dealActionFlashHref({
        dealId,
        tab: "documents",
        line: lineRaw,
        product: product || undefined,
        notice: ACTION_FLASH.sheetSaved,
        hash: SHEET_CONFIRM_HASH,
      });
  if (vinDecodeError) flashAction(dest, vinDecodeError, "error");
  flashAction(dest, "sheet-saved");
}

export async function confirmQuoteSheetField(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line");
  const fieldKey = str(formData, "fieldKey");
  const openedLine = parseStorageLine(lineRaw);
  if (!openedLine) throw new Error("Unknown line");
  const shopLine = openedLine.shopLine;
  const storageLine = openedLine.storageLine;
  const sheet = await ensureQuoteSheet(dealId, storageLine);
  let values = confirmField(sheet.values, fieldKey);
  if (ADDRESS_CONFIRM_KEYS.has(fieldKey)) {
    const enriched = await enrichPropertyOnAddressConfirm(addressFromSheet(values));
    if (enriched.triggered) {
      if (enriched.facts.length) {
        const applied = applyPublicToSheet(shopLine, values, enriched.facts);
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
  const custom = await loadRecordValues(dealId).catch(() => ({} as Record<string, string>));
  await db
    .update(deals)
    .set({
      lineOfBusiness,
      quotingLine: line,
      quotingForm: formId ?? deal.quotingForm,
      policySubType: productRaw,
      title:
        dealTitleForRecords({
          lineOfBusiness,
          firstName: custom.first_name || undefined,
          lastName: custom.last_name || undefined,
          primaryNamedInsured: deal.primaryNamedInsured,
          title: deal.title,
          contact,
          lead,
          account,
          quotingForm: formId ?? deal.quotingForm,
          policySubType: productRaw,
        }) || deal.title,
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
  const requested = str(formData, "line");
  const addingEo = isErrorsOmissionsProduct(requested);
  const lineRaw = addingEo ? "general_liability" : requested;
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");
  const { loadDeskLineSettings } = await import("@/lib/db/line-settings");
  const { visibleShopLines } = await import("@/lib/desk/line-settings");
  const settings = await loadDeskLineSettings();
  if (!visibleShopLines([lineRaw], settings).includes(lineRaw)) {
    throw new Error("That line is turned off in Settings → Lines.");
  }
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const next = Array.from(new Set([...(deal.shopLines ?? []), lineRaw]));
  const products = Array.from(new Set([...(deal.shopProducts ?? []), ...(addingEo ? ["eo"] : [])]));
  await db
    .update(deals)
    .set({
      shopLines: next,
      ...(addingEo
        ? {
            shopProducts: products,
            quotingLine: deal.quotingLine || "general_liability",
            quotingForm: deal.quotingForm || ERRORS_OMISSIONS_LABEL,
            policySubType: deal.policySubType || ERRORS_OMISSIONS_LABEL,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  await ensureQuoteSheet(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
  redirect(withFlash(`/deals/${dealId}?tab=documents&line=${lineRaw}`, "deal-updated"));
}

/** Add/remove products on one deal. New shop lines get a sheet. Removed products and orphan copy sheets (a line whose instance is not on the deal) stay stored. */
export async function setDealPackageLines(formData: FormData) {
  const dealId = str(formData, "dealId");
  const tab = str(formData, "tab");
  const currentLine = str(formData, "currentLine");
  const raw = [
    ...formData.getAll("shopProducts").map((value) => String(value)),
    ...formData.getAll("shopLines").map((value) => String(value)),
  ];
  const instances = normalizeProductInstanceList(raw);
  const nextInstances = instances.length
    ? instances
    : [{ key: "homeowners" as const, productId: "homeowners" as const }];
  const draft = packageCreateDraft(nextInstances.map((row) => row.productId));
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const previous = resolveVisibleProductInstances({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const previousKeys = new Set(previous.map((row) => row.key));
  const nextKeys = nextInstances.map((row) => row.key);
  const added = nextInstances.filter((row) => !previousKeys.has(row.key));
  const removedKeys = new Set(previous.filter((row) => !nextKeys.includes(row.key)).map((row) => row.key));
  for (const instance of nextInstances) {
    await ensureQuoteSheet(dealId, storageLineForInstance(instance, nextInstances));
  }
  const next = mergeShopLinesKeepExisting(deal.shopLines, draft.shopLines);
  const saved = parseShopFlow(deal.shopFlow);
  const stages = { ...(saved.productStages ?? {}) };
  for (const key of removedKeys) delete stages[key];
  for (const instance of added) {
    if (!stages[instance.key]) stages[instance.key] = productStageFor({}, instance.key);
  }
  const focus =
    added[0] ??
    nextInstances.find((row) => row.key === currentLine || storageLineForInstance(row, nextInstances) === currentLine) ??
    nextInstances[0]!;
  await db
    .update(deals)
    .set({
      shopLines: next,
      shopProducts: nextKeys,
      quotingLine: draft.quotingLine,
      quotingForm: draft.quotingForm,
      lineOfBusiness: draft.lineOfBusiness,
      accountKind: draft.accountKind,
      bindTarget: draft.bindTarget,
      shopFlow: { ...saved, productStages: stages },
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  const stored = await loadRecordValues(dealId, "deals").catch(() => ({} as Record<string, string>));
  await writeRecordValues(
    dealId,
    {
      ...stored,
      ...cascadeValuesFromDealHints({
        shopProducts: draft.products,
        shopLines: draft.shopLines,
        lineOfBusiness: draft.lineOfBusiness,
        quotingLine: draft.quotingLine,
        quotingForm: draft.quotingForm,
        policySubType: draft.quotingForm,
      }),
    },
    "deals",
  ).catch(() => null);
  revalidatePath(`/deals/${dealId}`);
  const query = new URLSearchParams();
  if (tab) query.set("tab", tab);
  query.set("line", storageLineForInstance(focus, nextInstances));
  query.set("product", focus.key);
  redirect(withFlash(`/deals/${dealId}?${query.toString()}`, "deal-updated"));
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
  warnings?: string[];
};

/** Core Property Fill — returns counts (no redirect). Used by master Fill + form action. */
export async function runFillFromPropertyRecords(
  dealId: string,
  lineInput: string,
): Promise<PropertyFillRunResult> {
  const opened = requireStorageLine(lineInput);
  const lineRaw = opened.shopLine;
  const sheet = await ensureQuoteSheet(dealId, opened.storageLine);
  const [dealRow] = await db
    .select({ quotingForm: deals.quotingForm, policySubType: deals.policySubType })
    .from(deals)
    .where(eq(deals.id, dealId));
  const dwellingFire = isDwellingFireProduct(
    dealRow?.quotingForm,
    dealRow?.policySubType,
    sheet.values.quoting_form?.value,
    sheet.values.sheet_product?.value,
  );
  // Property Fill geocodes the Risk Profile property address.
  // A sole mailing (Deal Details misfile) is moved onto property first so APIs can run.
  // DP1/DP3 keeps that mailing as the owner's home and does not geocode it as the rental.
  // One button → County PA + FloodZoneMap + FEMA (free) → GetParcelData → PermitStack.
  // Docs / Gemini stay on the separate docs Fill step.
  const freshForAddress = await loadFreshSheetValues(sheet.id, sheet.values);
  const healed = moveSoleSheetMailingToProperty(freshForAddress, { dwellingFire });
  const sheetAddr = addressFromSheet(healed.values);
  const address = {
    address1: sheetAddr.address1,
    city: sheetAddr.city,
    state: sheetAddr.state,
    zip: sheetAddr.zip,
    county: healed.values.county?.value?.trim() || "",
  };
  const [apiKey, permitStackKey] = await Promise.all([
    loadGetParcelDataApiKey(),
    loadPermitStackApiKey(),
  ]);
  const bundle = await orchestratePropertyFill({ address, apiKey, permitStackKey });
  // Re-read immediately before write — Gemini Fill may have landed while parcel APIs ran.
  const freshPropertyValues = await loadFreshSheetValues(sheet.id, healed.values);
  const moved = moveSoleSheetMailingToProperty(freshPropertyValues, { dwellingFire });
  const appliedBase =
    bundle.status === "ok"
      ? applyPropertyRecordsToSheet(lineRaw, moved.values, bundle.facts)
      : { values: moved.values, filledKeys: [] as string[], skippedKeys: [] as string[] };
  const applied = {
    ...appliedBase,
    filledKeys: [...moved.filledKeys, ...appliedBase.filledKeys],
  };

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

  if (bundle.status !== "ok" && withCoast.filledKeys.length === 0) {
    return {
      status: bundle.status,
      filledKeys: [],
      skippedKeys: [],
      sourcesUsed: bundle.sourcesUsed,
      message: bundle.message,
      toast: "",
      warnings: bundle.warnings,
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
      "permitstack",
      ...bundle.sourcesUsed,
    ],
  });
  if (!opened.instanceKey) {
    await syncRiskFromSheet(dealId, withCoast.values, "fill");
    await syncHeaderFromSheet(dealId, withCoast.values, "fill");
  }
  const zoneXNoBfe = isZoneXNoBfe(bundle.facts ?? []);
  let toast =
    withCoast.filledKeys.length || withCoast.skippedKeys.length
      ? toastForFillCounts({
          filledCount: withCoast.filledKeys.length,
          skippedCount: withCoast.skippedKeys.length,
        })
      : toastForPropertyFill({
          filledCount: 0,
          sourcesUsed: bundle.sourcesUsed,
          zoneXNoBfe,
        });
  if (zoneXNoBfe && (withCoast.filledKeys.length || withCoast.skippedKeys.length)) {
    const withNote = `${toast} · Zone X — no BFE`;
    if (withNote.length <= 80) toast = withNote;
  }
  return {
    status: "ok",
    filledKeys: withCoast.filledKeys,
    skippedKeys: withCoast.skippedKeys,
    sourcesUsed: bundle.sourcesUsed,
    message: bundle.message,
    warnings: bundle.warnings,
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
  if (!parseStorageLine(lineRaw)) return { ok: false, error: "Unknown line" };

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
  if (!parseStorageLine(lineRaw)?.instanceKey) await syncRiskFromSheet(dealId, values, "save");
  revalidatePath(`/deals/${dealId}`);
  return { ok: true, miles: cell.value };
}


type VinFilledCell = { sheetKey: string; value: string };

type VinDecodeRun = {
  filledKeys: string[];
  skippedKeys: string[];
  vinsDecoded: string[];
  filled: VinFilledCell[];
  toast: string;
  note?: string;
  status: "ok" | "no_vin" | "error" | "skipped_line";
  message?: string;
};

function filledVinCells(
  values: Record<string, { value?: string | null }>,
  keys: string[],
): VinFilledCell[] {
  return keys
    .map((sheetKey) => ({ sheetKey, value: String(values[sheetKey]?.value ?? "").trim() }))
    .filter((cell) => cell.value);
}

function sanitizePrefetched(
  rows: ReadonlyArray<{ vin: string; values: VinDecodeValues }> | undefined,
): Array<{ vin: string; values: VinDecodeValues }> {
  if (!rows?.length) return [];
  const out: Array<{ vin: string; values: VinDecodeValues }> = [];
  for (const row of rows.slice(0, 8)) {
    const vin = normalizeVin(row?.vin);
    const values = coerceVinDecodeValues(row?.values);
    if (!isDecodableVin(vin) || !values) continue;
    out.push({ vin, values });
  }
  return out;
}

/** Empty-only NHTSA vPIC VIN decode for Auto master sheet (no vault key). */
export async function runFillFromVinDecode(
  dealId: string,
  lineInput: string,
  options?: {
    formVins?: Record<string, string>;
    prefetched?: ReadonlyArray<{ vin: string; values: VinDecodeValues }>;
  },
): Promise<VinDecodeRun> {
  const opened = parseStorageLine(lineInput);
  const lineRaw = opened?.shopLine ?? "home";
  if (lineRaw !== "auto") {
    return {
      filledKeys: [],
      skippedKeys: [],
      vinsDecoded: [],
      filled: [],
      toast: "",
      status: "skipped_line",
    };
  }
  const sheet = await ensureQuoteSheet(dealId, opened?.storageLine ?? lineRaw);
  const fresh = await loadFreshSheetValues(sheet.id, sheet.values);
  const overlaid = overlayFormVins(fresh, options?.formVins);
  const product = (overlaid.values.sheet_product?.value ?? "").trim() || null;
  const bundle = await orchestrateVinDecodeFill({
    values: overlaid.values,
    product,
    prefetched: sanitizePrefetched(options?.prefetched),
  });
  if (bundle.status === "no_vin") {
    if (overlaid.changed) await persistSheetValues(sheet.id, overlaid.values);
    return {
      filledKeys: [],
      skippedKeys: [],
      vinsDecoded: [],
      filled: [],
      toast: bundle.toast,
      status: "no_vin",
      message: bundle.message,
    };
  }
  if (bundle.status !== "ok") {
    if (overlaid.changed) await persistSheetValues(sheet.id, overlaid.values);
    return {
      filledKeys: [],
      skippedKeys: [],
      vinsDecoded: [],
      filled: [],
      toast: bundle.toast,
      status: "error",
      message: bundle.message,
    };
  }
  if (bundle.filledKeys.length || overlaid.changed) {
    await persistSheetValues(sheet.id, bundle.values);
    if (!opened?.instanceKey) await syncRiskFromSheet(dealId, bundle.values, "fill");
  }
  await logExtractionJob({
    dealId,
    quoteSheetId: sheet.id,
    engine: "nhtsa_vpic",
    status: bundle.filledKeys.length ? "filled" : "skipped",
    filledKeys: bundle.filledKeys,
    skippedKeys: bundle.skippedKeys,
    message: bundle.message,
  });
  return {
    filledKeys: bundle.filledKeys,
    skippedKeys: bundle.skippedKeys,
    vinsDecoded: bundle.vinsDecoded,
    filled: filledVinCells(bundle.values, bundle.filledKeys),
    toast: bundle.toast,
    note: bundle.filledKeys.length || bundle.vinsDecoded.length ? NHTSA_VPIC_LABEL : undefined,
    status: "ok",
    message: bundle.message,
  };
}

/** Button entry: Decode VIN via free NHTSA vPIC → empty-only year/make/model/body/fuel/engine. */
export async function runDecodeVin(input: {
  dealId: string;
  line: string;
  formVins?: Record<string, string>;
  prefetched?: Array<{ vin: string; values: VinDecodeValues }>;
}): Promise<
  { ok: true; toast: string; filledCount: number; filled: VinFilledCell[] } | { ok: false; error: string }
> {
  const dealId = String(input.dealId ?? "").trim();
  const lineRaw = String(input.line ?? "auto").trim() || "auto";
  const opened = parseStorageLine(lineRaw);
  if (!dealId) return { ok: false, error: "Missing deal" };
  if (!opened) return { ok: false, error: "Unknown line" };
  if (opened.shopLine !== "auto") return { ok: false, error: "VIN decode is Auto-only." };
  const result = await runFillFromVinDecode(dealId, opened.storageLine, {
    formVins: input.formVins,
    prefetched: input.prefetched,
  });
  revalidatePath(`/deals/${dealId}`);
  if (result.status === "error") {
    return { ok: false, error: result.message || "NHTSA vPIC decode failed" };
  }
  if (result.status === "no_vin") {
    return { ok: false, error: "Add a 17-character VIN on the Auto sheet first." };
  }
  return {
    ok: true,
    toast: result.toast,
    filledCount: result.filledKeys.length,
    filled: result.filled,
  };
}

export async function fillFromPropertyRecords(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  if (!parseStorageLine(lineRaw)) throw new Error("Unknown line");
  const product = str(formData, "product") || str(formData, "productInstance");
  const dest = fillStayHref({ dealId, line: lineRaw, product });
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
  lineInput: string,
): Promise<DealFillRunResult> {
  const opened = requireStorageLine(lineInput);
  const lineRaw = opened.shopLine;
  const sheet = await ensureQuoteSheet(dealId, opened.storageLine);
  const input = await loadDealSheetCopyInput(dealId, lineRaw);
  if (!input) {
    return { filledKeys: [], skippedKeys: [], note: MASTER_FILL_SKIP_NO_DEAL };
  }
  const fresh = await loadFreshSheetValues(sheet.id, sheet.values);
  if (opened.instanceKey) {
    input.propertyOneliner = null;
    if (input.risk) {
      input.risk = { address1: null, city: null, county: null, state: null, zip: null };
    }
  }
  const applied = fillSheetFromDealDetails(input, fresh);
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
  if (!opened.instanceKey) {
    await syncRiskFromSheet(dealId, applied.values, "fill");
    await syncHeaderFromSheet(dealId, applied.values, "fill");
  }
  return { filledKeys: applied.filledKeys, skippedKeys: applied.skippedKeys };
}


/** Empty-only protection/hazard defaults after a Fill step (never overwrites agent cells). */
async function persistMasterSheetDefaults(dealId: string, lineInput: string): Promise<number> {
  const opened = requireStorageLine(lineInput);
  const sheet = await ensureQuoteSheet(dealId, opened.storageLine);
  const fresh = await loadFreshSheetValues(sheet.id, sheet.values);
  const applied = applyMasterSheetDefaults(fresh, emptyDefaultsForLine(opened.shopLine));
  if (!applied.filledKeys.length) return 0;
  await db
    .update(quoteSheets)
    .set({ values: applied.values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  return applied.filledKeys.length;
}

/**
 * One master-sheet Fill step for the progress modal.
 * Home: Deal → Property → Docs.
 * Auto: Deal → Docs → VIN (NHTSA vPIC). Never property/FEMA on Auto.
 */
export async function fillMasterSheetStep(input: {
  dealId: string;
  line: string;
  step: MasterFillStepId;
}): Promise<MasterFillStepResult> {
  const step = input.step;
  const shopLine = parseStorageLine(String(input.line ?? ""))?.shopLine ?? "home";
  const stepLabel =
    masterFillStepsForLine(shopLine).find((row) => row.id === step)?.label ?? step;
  try {
    return await withDeadline(
      fillMasterSheetStepInner(input),
      MASTER_FILL_STEP_TIMEOUT_MS,
      masterFillStepTimeoutMessage(stepLabel),
    );
  } catch (error) {
    if (error instanceof DeadlineError || (error instanceof Error && /timed out/i.test(error.message))) {
      return {
        step,
        filledCount: 0,
        skippedCount: 0,
        error: masterFillStepTimeoutMessage(stepLabel),
        note: "Partial fill may be saved",
      };
    }
    const raw = (error instanceof Error ? error.message : String(error ?? ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    console.error("[fillMasterSheetStep]", { step, message: raw || MASTER_FILL_UNEXPECTED });
    return {
      step,
      filledCount: 0,
      skippedCount: 0,
      error: raw ? `${stepLabel} failed. ${raw}` : masterFillUnexpectedMessage(stepLabel),
    };
  }
}

async function fillMasterSheetStepInner(input: {
  dealId: string;
  line: string;
  step: MasterFillStepId;
}): Promise<MasterFillStepResult> {
  const dealId = String(input.dealId ?? "").trim();
  const lineRaw = String(input.line ?? "home").trim() || "home";
  if (!dealId) throw new Error("Missing deal");
  const opened = parseStorageLine(lineRaw);
  if (!opened) throw new Error("Unknown line");
  const shopLine = opened.shopLine;
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
    // Auto Fill-by-LOB: never Home property / county PA / FEMA on Auto.
    if (shopLine === "auto") {
      return {
        step,
        filledCount: 0,
        skippedCount: 0,
        note: MASTER_FILL_SKIP_AUTO_PROPERTY,
      };
    }
    const result = await runFillFromPropertyRecords(dealId, lineRaw);
    revalidatePath(`/deals/${dealId}`);
    const warningNote = (result.warnings ?? []).filter((row) => row.trim()).join(" · ");
    const withWarning = (note?: string) => [note, warningNote].filter(Boolean).join(" · ") || undefined;
    if (result.status === "no_address") {
      return { step, filledCount: 0, skippedCount: 0, note: withWarning(MASTER_FILL_SKIP_NO_ADDRESS) };
    }
    if (result.status === "needs_key") {
      return {
        step,
        filledCount: result.filledKeys.length,
        skippedCount: 0,
        note: withWarning(MASTER_FILL_SKIP_NEEDS_KEY),
      };
    }
    if (result.status === "not_found") {
      return {
        step,
        filledCount: result.filledKeys.length,
        skippedCount: result.skippedKeys.length,
        note: withWarning(MASTER_FILL_SKIP_NOT_FOUND),
      };
    }
    if (result.status !== "ok") {
      return {
        step,
        filledCount: result.filledKeys.length,
        skippedCount: result.skippedKeys.length,
        error: result.message || "Property records error",
        note: warningNote || undefined,
      };
    }
    return {
      step,
      filledCount: result.filledKeys.length,
      skippedCount: result.skippedKeys.length,
      note: warningNote || undefined,
    };
  }

  if (step === "vin") {
    if (shopLine !== "auto") {
      return { step, filledCount: 0, skippedCount: 0, note: "VIN decode is Auto-only — skipped" };
    }
    const vin = await runFillFromVinDecode(dealId, lineRaw);
    revalidatePath(`/deals/${dealId}`);
    if (vin.status === "no_vin") {
      return { step, filledCount: 0, skippedCount: 0, note: MASTER_FILL_SKIP_NO_VIN };
    }
    if (vin.status === "error") {
      return {
        step,
        filledCount: 0,
        skippedCount: 0,
        error: vin.message || "NHTSA vPIC decode failed",
      };
    }
    return {
      step,
      filledCount: vin.filledKeys.length,
      skippedCount: vin.skippedKeys.length,
      note: vin.note,
    };
  }

  // docs — Fill Risk Profile does not run Gemini here.
  // Each photo is listMasterFillDocs + fillMasterSheetDocument so one file
  // cannot hold the action open until the platform kills it (~4 min).
  return {
    step,
    filledCount: 0,
    skippedCount: 0,
    note: "Docs run one file at a time.",
  };
}

/** Fast metadata list. No Gemini, no file bytes. */
export async function listMasterFillDocs(input: {
  dealId: string;
  line: string;
}): Promise<MasterFillDocList> {
  try {
    const dealId = String(input.dealId ?? "").trim();
    const lineRaw = String(input.line ?? "home").trim() || "home";
    if (!dealId) return { ok: false, docs: [], error: "Docs failed. Missing deal." };
    if (!parseStorageLine(lineRaw)) return { ok: false, docs: [], error: "Docs failed. Unknown line." };
    const geminiKey = await loadGeminiApiKey();
    if (!geminiKeyReady(geminiKey)) {
      return {
        ok: false,
        docs: [],
        error: "Docs failed. Gemini API key is not configured — docs fill skipped",
      };
    }
    const rows = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        slot: documents.slot,
        docType: documents.docType,
        tags: documents.tags,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId), notHiddenDocument()))
      .orderBy(asc(documents.createdAt));
    const docs = selectFillDocsForProductWindow(rows, await fillWindowForLine(dealId, lineRaw));
    if (docs.length === 0) {
      return { ok: true, docs: [], note: MASTER_FILL_SKIP_NO_DOCS };
    }
    return {
      ok: true,
      docs: docs.map((doc) => ({ id: doc.id, filename: doc.filename || "file" })),
    };
  } catch (error) {
    const message = (error instanceof Error ? error.message : "Could not list docs")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    console.error("[listMasterFillDocs]", message);
    return { ok: false, docs: [], error: message ? `Docs failed. ${message}` : masterFillUnexpectedMessage("Docs") };
  }
}

/**
 * One photo / PDF. Gemini errors return on this result. They do not throw,
 * and they do not roll back fields a previous file already saved.
 */
export async function fillMasterSheetDocument(input: {
  dealId: string;
  line: string;
  documentId: string;
}): Promise<MasterFillStepResult> {
  const label = "Docs";
  try {
    return await withDeadline(
      fillMasterSheetDocumentInner(input),
      MASTER_FILL_DOC_TIMEOUT_MS,
      masterFillStepTimeoutMessage(label),
    );
  } catch (error) {
    if (error instanceof DeadlineError || (error instanceof Error && /timed out/i.test(error.message))) {
      return {
        step: "docs",
        filledCount: 0,
        skippedCount: 0,
        error: masterFillStepTimeoutMessage(label),
        note: "Partial fill may be saved",
      };
    }
    const raw = (error instanceof Error ? error.message : String(error ?? ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    console.error("[fillMasterSheetDocument]", { documentId: input.documentId, message: raw });
    return {
      step: "docs",
      filledCount: 0,
      skippedCount: 0,
      error: raw ? `Docs failed. ${raw}` : masterFillUnexpectedMessage(label),
    };
  }
}

async function fillMasterSheetDocumentInner(input: {
  dealId: string;
  line: string;
  documentId: string;
}): Promise<MasterFillStepResult> {
  const dealId = String(input.dealId ?? "").trim();
  const lineRaw = String(input.line ?? "home").trim() || "home";
  const documentId = String(input.documentId ?? "").trim();
  if (!dealId) throw new Error("Missing deal");
  if (!parseStorageLine(lineRaw)) throw new Error("Unknown line");
  if (!documentId) throw new Error("Missing document");
  const counts = await runFillQuoteSheet(dealId, lineRaw, { documentId });
  revalidatePath(`/deals/${dealId}`);
  if (counts.filledKeys.length) {
    try {
      await persistSheetRecheckCue(dealId, lineRaw);
      await markShopFlowStaleAfterRiskChange(dealId, lineRaw, {
        ratingCritical: filledKeysAreRatingCritical(counts.filledKeys),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "recheck failed";
      console.error("[fillMasterSheetDocument] recheck", message.slice(0, 300));
    }
  }
  return {
    step: "docs",
    filledCount: counts.filledKeys.length,
    skippedCount: counts.skippedKeys.length,
    error: counts.error,
    note: counts.note,
  };
}

export async function fillQuoteSheet(formData: FormData) {
  const dealId = str(formData, "dealId");
  const lineRaw = str(formData, "line") || "home";
  if (!parseStorageLine(lineRaw)) throw new Error("Unknown line");
  const product = str(formData, "product") || str(formData, "productInstance");
  const dest = fillStayHref({ dealId, line: lineRaw, product });
  const geminiKey = await loadGeminiApiKey();
  if (!geminiKeyReady(geminiKey)) {
    flashAction(dest, "gemini-needs-key", "error");
  }
  const counts = await runFillDealSheets(dealId, lineRaw);
  revalidatePath(`/deals/${dealId}`);
  // Stay on Documents and this product — Markets only after Confirm & request quotes.
  flashAction(
    dest,
    toastForFillCounts({
      filledCount: counts.filledKeys.length,
      skippedCount: counts.skippedKeys.length,
    }),
  );
}

export type FillDealCounts = {
  filledKeys: string[];
  skippedKeys: string[];
  error?: string;
  note?: string;
};

export async function runFillDealSheets(
  dealId: string,
  primary: string,
  options?: { onlyLine?: boolean },
): Promise<FillDealCounts> {
  const opened = requireStorageLine(primary);
  const primaryCounts = await runFillQuoteSheet(dealId, opened.storageLine);
  const other = options?.onlyLine || opened.instanceKey
    ? { filledKeys: [] as string[], skippedKeys: [] as string[], error: undefined }
    : await fillOtherShopLines(dealId, opened.shopLine);
  const counts = {
    filledKeys: [...primaryCounts.filledKeys, ...other.filledKeys],
    skippedKeys: [...primaryCounts.skippedKeys, ...other.skippedKeys],
    error: primaryCounts.error || other.error,
  };
  if (primaryCounts.filledKeys.length) {
    await persistSheetRecheckCue(dealId, primary);
    await markShopFlowStaleAfterRiskChange(dealId, opened.storageLine, {
      ratingCritical: filledKeysAreRatingCritical(primaryCounts.filledKeys),
    });
  }
  return counts;
}

async function fillOtherShopLines(dealId: string, already: ShopLine): Promise<FillDealCounts> {
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const errors: string[] = [];
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  for (const line of deal?.shopLines ?? []) {
    if (line !== already && isShopLine(line)) {
      const counts = await runFillQuoteSheet(dealId, line);
      filledKeys.push(...counts.filledKeys);
      skippedKeys.push(...counts.skippedKeys);
      if (counts.error) errors.push(counts.error);
      if (counts.filledKeys.length) {
        await persistSheetRecheckCue(dealId, line);
        await markShopFlowStaleAfterRiskChange(dealId, line, {
          ratingCritical: filledKeysAreRatingCritical(counts.filledKeys),
        });
      }
    }
  }
  return { filledKeys, skippedKeys, error: errors[0] };
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
  if (!parseStorageLine(lineRaw)) throw new Error("Unknown line");
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

export async function runFillQuoteSheet(
  dealId: string,
  lineInput: string,
  options?: { documentId?: string },
): Promise<FillDealCounts> {
  const opened = requireStorageLine(lineInput);
  const line = opened.shopLine;
  const onlyId = String(options?.documentId ?? "").trim();
  const sheet = await ensureQuoteSheet(dealId, opened.storageLine);
  const docs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId), notHiddenDocument()));
  const productDocs = selectFillDocsForProductWindow(docs, await fillWindowForLine(dealId, opened.storageLine));
  const scoped = onlyId ? productDocs.filter((doc) => doc.id === onlyId) : productDocs;
  if (onlyId && scoped.length === 0) {
    const onDeal = docs.some((doc) => doc.id === onlyId);
    return {
      filledKeys: [],
      skippedKeys: [],
      error: onDeal
        ? `Docs failed. That file is not on this product (${line}).`
        : "Docs failed. That file is not on this deal.",
    };
  }
  const corrections = await loadFillCorrections();
  const learningLogs = mergeLearningHints(
    await listFillLearningForLookup(),
    await listExtractionCorrectionsForLookup(),
  );

  let values: Record<string, QuoteSheetFieldValue> = { ...sheet.values };
  if (Object.keys(values).length === 0) values = emptySheetValues(line);
  const aggregateFilled: string[] = [];
  const aggregateSkipped: string[] = [];
  const geminiErrors: string[] = [];
  let geminiAttempts = 0;
  let geminiMapped = 0;
  let passiveNote: string | undefined;

  // Flood product window already has a flood DEC → Currently have flood/NFIP? = yes
  // even before Gemini (Rosa: default "no" stayed wrong when DEC was skipped).
  if (line === "flood") {
    const floodDecInWindow = scoped.some((doc) => {
      const tags = (doc.tags ?? []).map((t) => String(t).toLowerCase());
      const tagged =
        tags.some((t) => t === "line:flood" || t === "form:flood") ||
        looksLikeFloodPolicyDoc(doc.filename || "", "");
      const decLike = /^(dec|declaration|current_policy|policy)$/i.test(doc.docType || "") ||
        /dec|declaration|policy/i.test(doc.docType || "");
      return tagged && (decLike || looksLikeFloodPolicyDoc(doc.filename || "", ""));
    });
    if (floodDecInWindow) {
      const cur = values.has_nfip;
      const curVal = (cur?.value ?? "").trim().toLowerCase();
      const replaceable =
        !cur ||
        !(cur.value ?? "").trim() ||
        curVal === "no" ||
        (cur.sourceLabel ?? "").trim().toLowerCase() === "default";
      if (replaceable) {
        values.has_nfip = {
          value: "yes",
          status: "check",
          source: "extracted",
          sourceLabel: "flood dec",
        };
        aggregateFilled.push("has_nfip");
      }
      // Drop HO deal-details carrier bleed so flood DEC carrier can land.
      const carrierLabel = (values.current_carrier?.sourceLabel ?? "").trim().toLowerCase();
      if (carrierLabel === "deal details") {
        values.current_carrier = { value: "", status: "missing", source: "blank" };
      }
    }
  }

  for (const doc of scoped) {
    if (isQuoteAttachment(doc.docType, doc.filename) || isQuoteFileDoc(doc)) continue;
    const startedAt = new Date();
    const buffer = await readStoredFile(doc.storagePath);
    if (!buffer) {
      geminiErrors.push(`Docs failed. Could not read ${doc.filename} from storage.`);
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
      // Photos: skip OCR entirely — trustSheetLineForFill already trusts the sheet line,
      // and HEIC/tesseract has hung Fill Risk Profile Docs forever (Domenic Iori Auto).
      let textForLine = "";
      const photoLike =
        isImageUpload(doc.mimeType || "", doc.filename || "") ||
        (doc.docType || "").toLowerCase() === "photo";
      if (!photoLike) {
        try {
          const uploaded = await withDeadline(
            readUploadText(buffer, doc.mimeType, doc.filename),
            20_000,
            `OCR timed out reading ${doc.filename}`,
          );
          textForLine = uploaded.text;
        } catch {
          textForLine = "";
        }
      }
      const inferred = inferShopLine(textForLine, doc.filename, doc.docType);
      const hoOntoHome = sourceDocFillsHome(doc.docType) && line === "home";
      const trustSheet = trustSheetLineForFill({
        sheetLine: line,
        inferred,
        docType: doc.docType,
        mimeType: doc.mimeType,
        text: textForLine,
        filename: doc.filename,
        // Product-window filter already scoped this PDF to the active sheet (#332).
        productWindowMatch: true,
        tags: doc.tags,
      });
      if (inferred !== line && !hoOntoHome && !trustSheet) {
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
        passiveNote = `Skipped ${doc.filename} — wrong shop line (inferred ${inferred}).`;
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
        passiveNote = `Skipped ${doc.filename} — not a Gemini source doc type.`;
        continue;
      }

      geminiAttempts += 1;
      const gemini = await extractWithGeminiPdf(buffer, doc.docType, {
        apiKey: geminiKey,
        mimeType: doc.mimeType,
        filename: doc.filename,
        shopLine: line,
        purpose: "fill",
      });
      const engine = "gemini" as const;
      if (!gemini.ok) {
        const detail = (gemini.message || "Gemini extract failed").replace(/\s+/g, " ").trim().slice(0, 400);
        console.error("[runFillQuoteSheet] gemini failed", {
          dealId,
          filename: doc.filename,
          shopLine: line,
          message: detail,
        });
        geminiErrors.push(`Docs failed. ${doc.filename}: ${detail}`);
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
        docType: doc.docType,
      });
      values = applied.values;
      aggregateFilled.push(...applied.filledKeys);
      aggregateSkipped.push(...applied.skippedKeys);
      geminiMapped += applied.filledKeys.length + applied.skippedKeys.length;
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
      const diffNote = (applied.diffs ?? []).slice(0, 4).join(" ");
      const doneMessage = diffNote
        ? `${countsToast} (${doc.filename}). Left existing values. ${diffNote}`.slice(0, 900)
        : `${countsToast} (${doc.filename}). CHECK = use the value. Source files stay on Files.`;

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
      const message = (error instanceof Error ? error.message : "Extract failed")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
      console.error("[runFillQuoteSheet] extract threw", {
        dealId,
        filename: doc.filename,
        shopLine: line,
        message,
      });
      geminiErrors.push(`Docs failed. ${doc.filename}: ${message}`);
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

  if (scoped.length === 0) {
    await db.insert(extractionJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      quoteSheetId: sheet.id,
      engine: "pdf_text",
      status: "failed",
      filledKeys: [],
      skippedKeys: [],
        message: "No source files on this deal. Drop a dec, wind mit, or Four-Point first.",
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

  if (opened.shopLine === "auto") {
    await syncRiskFromSheet(dealId, values, "fill", {
      shopLine: "auto",
      storageLine: opened.storageLine,
      instanceKey: opened.instanceKey,
    });
    if (!opened.instanceKey) {
      const [dealRow] = await db.select().from(deals).where(eq(deals.id, dealId));
      const propertyOwnsHeader = Boolean(
        dealRow && legacyPropertyOwnerKey(instancesFromDeal(dealRow)),
      );
      if (!propertyOwnsHeader) await syncHeaderFromSheet(dealId, values, "fill");
    }
  } else if (!opened.instanceKey) {
    await syncRiskFromSheet(dealId, values, "fill");
    await syncHeaderFromSheet(dealId, values, "fill");
  }
  // Batch Fill can vPIC here. A single photo (documentId) leaves VIN to the
  // master Fill VIN step so one file's deadline stays on Gemini.
  // Empty-only: agent / Gemini values are not overwritten.
  const vinProduct = (values.sheet_product?.value ?? "").trim() || null;
  const vinLanded = aggregateFilled.some((key) => isVehicleVinSheetKey(key));
  if (!onlyId && line === "auto" && (vinLanded || blankVinCoreFacts(values, vinProduct).length > 0)) {
    try {
      const decoded = await runFillFromVinDecode(dealId, opened.storageLine);
      if (decoded.filledKeys.length) aggregateFilled.push(...decoded.filledKeys);
      if (decoded.skippedKeys.length) aggregateSkipped.push(...decoded.skippedKeys);
      if (decoded.status === "error" && decoded.message) {
        console.error("[runFillQuoteSheet] vin decode", decoded.message.slice(0, 300));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "NHTSA vPIC decode failed";
      console.error("[runFillQuoteSheet] vin decode", message.slice(0, 300));
    }
  }
  if (line === "auto" && geminiErrors.length === 0 && geminiMapped === 0 && geminiAttempts > 0) {
    geminiErrors.push(
      "Docs failed. Gemini returned no Auto fields (VIN, year, make, model, drivers, coverages, or policy).",
    );
  } else if (
    !onlyId &&
    line === "auto" &&
    geminiErrors.length === 0 &&
    geminiMapped === 0 &&
    scoped.length > 0 &&
    geminiAttempts === 0
  ) {
    geminiErrors.push("Docs failed. No Auto declaration was sent to Gemini.");
  }
  return {
    filledKeys: aggregateFilled,
    skippedKeys: aggregateSkipped,
    error: geminiErrors.find((row) => row.trim()),
    note: onlyId ? passiveNote : undefined,
  };
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

async function applySheetToRiskRow(
  risk: NonNullable<Awaited<ReturnType<typeof listDealRisks>>[number]>,
  values: Record<string, QuoteSheetFieldValue>,
  mode: "fill" | "save",
  options?: { skipVehicle?: boolean },
) {
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
  if (!options?.skipVehicle) {
    const sheetVin = values.vin?.value?.trim();
    if (sheetVin && !risk.vin) patch.vin = sheetVin;
    const yearNum = Number(values.vehicle_year?.value?.trim());
    if (Number.isFinite(yearNum) && yearNum > 0 && risk.vehicleYear == null) patch.vehicleYear = yearNum;
    const sheetMake = values.vehicle_make?.value?.trim();
    if (sheetMake && !risk.vehicleMake) patch.vehicleMake = sheetMake;
    const sheetModel = values.vehicle_model?.value?.trim();
    if (sheetModel && !risk.vehicleModel) patch.vehicleModel = sheetModel;
  }
  if (Object.keys(patch).length === 0) return;
  await db
    .update(risks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(risks.id, risk.id));
}

async function fillWindowForLine(dealId: string, lineInput: string) {
  const opened = requireStorageLine(lineInput);
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const instances = deal ? instancesFromDeal(deal) : [];
  const owner = instances.find(
    (row) => storageLineForInstance(row, instances) === opened.storageLine,
  );
  return {
    shopLine: opened.shopLine,
    instanceKey: opened.instanceKey ?? owner?.key ?? null,
    legacyLineOwner: !opened.storageLine.includes("~"),
  };
}

async function syncRiskFromSheet(
  dealId: string,
  values: Record<string, QuoteSheetFieldValue>,
  mode: "fill" | "save",
  options?: { shopLine?: string | null; storageLine?: string | null; instanceKey?: string | null },
) {
  const rows = await listDealRisks(dealId);
  const risk = rows.find((row) => !String(row.productKey ?? "").trim());
  if (options?.shopLine === "auto") {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    if (deal) {
      const instances = instancesFromDeal(deal);
      const autoOwner = legacyAutoOwnerKey(instances);
      const sheetOwner = instances.find(
        (row) => storageLineForInstance(row, instances) === (options.storageLine || "auto"),
      );
      const instanceKey = options.instanceKey || sheetOwner?.key || autoOwner || "auto";
      await saveAutoVehicleRisks({
        dealId,
        tenantId: deal.tenantId,
        contactId: deal.contactId,
        instanceKey,
        legacyAutoOwnerKey: autoOwner,
        vehicles: vehiclesOnAutoSheet(values),
      });
      const propertyOwnsNull = Boolean(legacyPropertyOwnerKey(instances));
      const isLegacyAuto = Boolean(autoOwner && instanceKey === autoOwner);
      if (propertyOwnsNull || !isLegacyAuto) return;
    }
  }
  if (!risk) return;
  await applySheetToRiskRow(risk, values, mode, { skipVehicle: options?.shopLine === "auto" && Boolean(options.instanceKey) });
}
