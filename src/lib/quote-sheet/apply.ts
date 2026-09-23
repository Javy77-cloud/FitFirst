import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { extractKeyToSheetKey, fieldsForLine } from "./catalog";
import type { SheetProduct } from "./products";
import {
  appendRecordsCheck,
  fieldLabelFor,
  mismatchLine,
  sheetSourcePhrase,
  valuesDiffer,
} from "./records-check";
import { collapseAutoDriverSheet, retargetAutoDriverFields } from "./auto-driver-dedupe";
import {
  finalizeHomeDeclarationCoverages,
  isReplaceableHomeCoverageFill,
  reapplyDefaultsAfterManualCoverageA,
} from "./home-coverage-rules";
import { streetsAreSameLocation } from "./home-address-fill";
import { applyInspectionExistenceFromDoc } from "./home-inspections";
import { isSheetFormMetaKey, submittedSheetValues } from "./save-values";
import {
  normalizeAutoDollarLimit,
  normalizeAutoSplitLimit,
  normalizeBuildingCode,
  normalizeClaims5yr,
  normalizeDistanceToHydrant,
  normalizeDistanceToStation,
  normalizeFloodOccupancyUse,
  normalizeFloodZone,
  normalizeGender,
  normalizeInsuranceScoreRange,
  normalizeLicenseStatus,
  normalizeMonthsOccupied,
  normalizeOccupancy,
  normalizeOpeningProtection,
  normalizeProtectionClass,
  normalizeRoofCovering,
  normalizeRoofDeckAttachment,
  normalizeRoofShape,
  normalizeRoofToWall,
  normalizeSecondaryWater,
  normalizeStories,
  normalizeTerrain,
  normalizeUsage,
  normalizeWaterBackup,
  normalizeWindHailDeductible,
  normalizeScreenEnclosure,
  parseGarageFact,
  normalizeWindSpeed,
  normalizeLifeProductType,
  normalizeHealthPlanType,
  normalizeTobaccoStatus,
} from "./sheet-defaults";

export type ExtractedInput = {
  fieldKey: string;
  normalizedValue: string;
  sourceLabel?: string;
  sourceDocTag?: string;
  blankAfterMatch?: boolean;
};

export type PublicFact = {
  fieldKey: string;
  value: string;
  sourceLabel: string;
  /** Rejected for Coverage A — Zestimate / list price never become Cov A. */
  kind?: "listing" | "county" | "permit" | "fema" | "zestimate" | "list_price";
};

export type ApplyFillResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
  skippedKeys: string[];
};

/** Dec Rating Information "None" / "No" → sheet yes/no (or leave letter codes alone). */
function normalizeYesNoNone(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const lower = t.toLowerCase().replace(/\s+/g, " ");
  if (lower === "none" || lower === "n/a" || lower === "na" || lower === "no" || lower === "false") return "no";
  if (lower === "yes" || lower === "y" || lower === "true") return "yes";
  return t;
}

export function fieldIsBlank(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return true;
  return field.value.trim() === "" || field.status === "missing";
}

export function isJavyTestedCoverageA(field?: QuoteSheetFieldValue | null): boolean {
  return field?.source === "javy";
}

/** Javy-tested Cov A is confirmed seed — never CHECK, never overwritten. */
export function neverCheckCoverageA(fieldKey: string, existing?: QuoteSheetFieldValue | null): boolean {
  if (fieldKey !== "coverage_a") return false;
  return existing?.source === "javy";
}

/**
 * Gap-fill sources lose to a value read from the dec / photo / Gemini.
 * Includes Florida property-records so Fill from source can replace them.
 */
export function isPublicRecordsSource(field?: QuoteSheetFieldValue | null): boolean {
  return (
    field?.source === "public" ||
    field?.source === "public-records" ||
    field?.source === "property-records" ||
    field?.source === "blank"
  );
}

function cellSourceDocument(item: Pick<ExtractedInput, "sourceLabel" | "sourceDocTag">, source: string): string {
  return item.sourceLabel || item.sourceDocTag || (source === "photo-ocr" ? "Photo" : "dec page");
}

/** Desk label for a cell source — dec/photo beat public records. */
export function sourceTag(cell: QuoteSheetFieldValue): string | null {
  if (cell.source === "javy") return "Javy-tested";
  if (cell.sourceLabel) return cell.sourceLabel;
  if (!cell.value.trim() && cell.status === "missing") return null;
  if (cell.source === "photo-ocr") {
    return cell.status === "check" ? "CHECK · photo-OCR" : "photo-OCR";
  }
  if (cell.source === "extracted") {
    return cell.status === "check" ? "CHECK · dec page" : "dec page";
  }
  if (cell.source === "property-records") {
    return cell.sourceLabel?.trim() || "property records";
  }
  if (cell.source === "public" || cell.source === "public-records") {
    return cell.status === "check" ? "CHECK · public" : "public";
  }
  if (cell.status === "check") return "CHECK";
  return null;
}

export type ApplyFillOptions = {
  source?: QuoteSheetFieldValue["source"];
  /**
   * four_point only: overwrite status=check cells from extracted / property-records.
   * Never touches agent / confirmed / javy.
   */
  overwriteWeakCheck?: boolean;
  /** When skipping a non-blank cell whose value differs, append Records check. */
  recordMismatches?: boolean;
  /** Label for mismatch lines (Gemini / 4pt / API). */
  mismatchIncomingLabel?: string;
  /**
   * Classified source document. Home inspection checkboxes turn on only for
   * a real wind-mit or four-point doc — never a dec or liability policy.
   */
  docType?: string | null;
};

/** CHECK cells from weak sources that a 4pt re-Fill may replace. */
export function isWeakCheckOverwriteable(field?: QuoteSheetFieldValue | null): boolean {
  if (!field || fieldIsBlank(field)) return false;
  if (field.status !== "check") return false;
  if (field.source === "agent" || field.source === "javy") return false;
  return field.source === "extracted" || field.source === "property-records";
}

export function isProtectedSheetSource(field?: QuoteSheetFieldValue | null): boolean {
  if (!field) return false;
  if (field.source === "agent" || field.source === "javy") return true;
  if (field.status === "confirmed" && field.value.trim()) return true;
  return false;
}

const LONE_PROPERTY_EXTRACT_KEYS = new Set([
  "address",
  "address1",
  "property_address",
  "location_description",
  "property_information",
  "insured_property",
  "residence_premises",
]);

/**
 * Liability-only (and any home doc with one printed address): that address is the
 * property location. Do not also leave it on mailing when mailing was empty or was
 * the same Deal Details misfile. A real second address extracted as property_address
 * is left on address1 and mailing stays.
 */
function promoteLoneMailingToProperty(
  values: Record<string, QuoteSheetFieldValue>,
  filledKeys: string[],
  existing: Record<string, QuoteSheetFieldValue>,
  extracted: ExtractedInput[],
) {
  const hadProperty = extracted.some((item) => {
    const key = item.fieldKey.trim();
    return LONE_PROPERTY_EXTRACT_KEYS.has(key) && String(item.normalizedValue ?? "").trim();
  });
  if (hadProperty || !fieldIsBlank(values.address1)) return;
  const mailCell = values.mailing_address;
  const mail = mailCell?.value?.trim() ?? "";
  if (!mailCell || !mail) return;
  values.address1 = { ...mailCell, value: mail };
  if (!filledKeys.includes("address1")) filledKeys.push("address1");
  const prior = existing.mailing_address;
  const priorMail = prior?.value?.trim() ?? "";
  const dealDetailsCopy = (prior?.sourceLabel ?? "").trim().toLowerCase() === "deal details";
  const agentKept =
    isProtectedSheetSource(prior) && !dealDetailsCopy && Boolean(priorMail);
  if (agentKept) return;
  if (priorMail && !streetsAreSameLocation(priorMail, mail)) return;
  values.mailing_address = { value: "", status: "missing", source: "blank" };
  const index = filledKeys.indexOf("mailing_address");
  if (index >= 0) filledKeys.splice(index, 1);
}


/** Flood DEC / NFIP extract → Currently have flood/NFIP? = yes (overrides empty-sheet default no). */
export function markFloodHasNfipFromExtract(
  values: Record<string, QuoteSheetFieldValue>,
  filledKeys: string[],
  extracted: ExtractedInput[],
  source: QuoteSheetFieldValue["source"] = "extracted",
): void {
  const policyKeys = new Set(["nfip_policy", "current_premium", "expiration_date", "current_carrier"]);
  const filledPolicy = filledKeys.some((key) => policyKeys.has(key));
  const extractedPolicy = extracted.some((row) => {
    const key = (row.fieldKey || "").trim().toLowerCase();
    const val = String(row.normalizedValue ?? "").trim();
    if (!val) return false;
    return (
      key === "policy_number" ||
      key === "nfip_policy" ||
      key === "current_premium" ||
      key === "expiration_date" ||
      key === "current_carrier" ||
      key === "premium"
    );
  });
  if (!filledPolicy && !extractedPolicy) return;
  const current = values.has_nfip;
  const curVal = (current?.value ?? "").trim().toLowerCase();
  const isDefaultNo =
    !current ||
    fieldIsBlank(current) ||
    curVal === "no" ||
    (current.sourceLabel ?? "").trim().toLowerCase() === "default";
  if (!isDefaultNo && curVal === "yes") {
    return;
  }
  values.has_nfip = {
    value: "yes",
    status: "check",
    source,
    sourceLabel: "flood dec",
  };
  if (!filledKeys.includes("has_nfip")) filledKeys.push("has_nfip");
}

export function applyExtractedToSheet(
  line: ShopLine,
  existing: Record<string, QuoteSheetFieldValue>,
  extracted: ExtractedInput[],
  options?: ApplyFillOptions,
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const source = options?.source ?? "extracted";
  const overwriteWeakCheck = Boolean(options?.overwriteWeakCheck);
  const recordMismatches = Boolean(options?.recordMismatches);
  const mismatchIncomingLabel = options?.mismatchIncomingLabel ?? "Gemini";
  const rows = line === "auto" ? retargetAutoDriverFields(existing, extracted) : extracted;

  for (const item of rows) {
    const key = extractKeyToSheetKey(line, item.fieldKey);
    if (!key) continue;
    const current = values[key];
    if (neverCheckCoverageA(key, current)) {
      skippedKeys.push(key);
      continue;
    }
    let nextValue = String(item.normalizedValue ?? "").trim();
    if (key === "months_occupied") nextValue = normalizeMonthsOccupied(nextValue);
    if (key === "applicant_gender" || key === "driver_1_gender" || /^driver_\d+_gender$/.test(key)) {
      const g = normalizeGender(nextValue);
      if (g) nextValue = g;
    }
    if (key === "usage") nextValue = normalizeUsage(nextValue);
    if (key === "occupancy") nextValue = normalizeOccupancy(nextValue);
    if (key === "hydrant") nextValue = normalizeDistanceToHydrant(nextValue);
    if (key === "miles_to_fire_station") nextValue = normalizeDistanceToStation(nextValue);
    if (
      key === "sprinkler" ||
      key === "central_alarm" ||
      key === "fire_alarm" ||
      key === "smoke_detectors" ||
      key === "carport" ||
      key === "deadbolts" ||
      key === "mobile_home" ||
      key === "pool" ||
      key === "pool_fence" ||
      key === "trampoline" ||
      key === "animals" ||
      key === "business_on_premises"
    ) {
      nextValue = normalizeYesNoNone(nextValue);
    }
    if (key === "opening_protection") nextValue = normalizeOpeningProtection(nextValue);
    if (key === "water_backup") nextValue = normalizeWaterBackup(nextValue);
    if (key === "screen_enclosure") nextValue = normalizeScreenEnclosure(nextValue);
    if (key === "wind_hail_deductible") nextValue = normalizeWindHailDeductible(nextValue);
    if (key === "garage_type" || key === "garage_spaces") {
      const parsed = parseGarageFact(nextValue);
      if (parsed.spaces && fieldIsBlank(values.garage_spaces)) {
        values.garage_spaces = {
          value: parsed.spaces,
          status: "check",
          source,
          sourceLabel: cellSourceDocument(item, source),
        };
        if (!filledKeys.includes("garage_spaces")) filledKeys.push("garage_spaces");
      }
      if (key === "garage_spaces") {
        nextValue = parsed.spaces;
      } else if (!parsed.type) {
        continue;
      } else {
        nextValue = parsed.type;
      }
    }
    if (key === "claims_5yr") nextValue = normalizeClaims5yr(nextValue);
    if (key === "insurance_score_range") nextValue = normalizeInsuranceScoreRange(nextValue);
    if (key === "roof_to_wall") nextValue = normalizeRoofToWall(nextValue);
    if (key === "secondary_water") nextValue = normalizeSecondaryWater(nextValue);
    if (key === "wind_speed") nextValue = normalizeWindSpeed(nextValue);
    if (key === "stories") nextValue = normalizeStories(nextValue);
    if (key === "flood_zone") nextValue = normalizeFloodZone(nextValue);
    if (key === "occupancy_use") nextValue = normalizeFloodOccupancyUse(nextValue);
    if (key === "driver_1_status" || (key.startsWith("driver_") && key.endsWith("_status"))) {
      nextValue = normalizeLicenseStatus(nextValue);
    }
    if (key === "liability_bi" || key === "um_uim") nextValue = normalizeAutoSplitLimit(nextValue);
    if (
      key === "liability_pd" ||
      key === "pip" ||
      key === "comp_deductible" ||
      key === "collision_deductible" ||
      key === "building_deductible" ||
      key === "contents_deductible"
    ) {
      nextValue = normalizeAutoDollarLimit(nextValue);
    }
    if (key === "product_type") nextValue = normalizeLifeProductType(nextValue) || nextValue;
    if (key === "plan_type") nextValue = normalizeHealthPlanType(nextValue) || nextValue;
    if (key === "tobacco_status") nextValue = normalizeTobaccoStatus(nextValue) || nextValue;
    if (key === "protection_class") nextValue = normalizeProtectionClass(nextValue);
    if (key === "building_code") nextValue = normalizeBuildingCode(nextValue);
    if (key === "roof_covering") nextValue = normalizeRoofCovering(nextValue);
    if (key === "roof_shape") nextValue = normalizeRoofShape(nextValue);
    if (key === "roof_deck" || key === "roof_deck_attachment") {
      nextValue = normalizeRoofDeckAttachment(nextValue);
    }
    if (key === "terrain") nextValue = normalizeTerrain(nextValue);
    if (key === "form") {
      // Cascade owns quoting form. Normalize leftover stored values only.
      const compact = nextValue.toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
      if (compact === "DP3" || compact === "DWELLINGDP3") nextValue = "DP3";
      else if (compact === "HO3" || compact === "HOMEOWNERS3" || compact === "HOMEOWNER3") nextValue = "HO3";
      else if (compact === "HO6") nextValue = "HO6";
      else if (compact === "HO8") nextValue = "HO8";
      else if (compact === "MH" || compact === "MHO") nextValue = "MHO";
      else if (compact === "MDP") nextValue = "MDP";
      else if (compact === "DP1") nextValue = "DP1";
    }
    const sourceLabel = cellSourceDocument(item, source);
    if (!nextValue) {
      if (item.blankAfterMatch && fieldIsBlank(current)) {
        values[key] = { value: "", status: "missing", source: "blank", sourceLabel };
      }
      continue;
    }

    const canFillBlank = fieldIsBlank(current);
    const canReplacePublic = !fieldIsBlank(current) && isPublicRecordsSource(current);
    const canReplaceWeakCheck =
      overwriteWeakCheck && isWeakCheckOverwriteable(current) && !isProtectedSheetSource(current);
    const canReplaceCoverageDefault =
      line === "home" && isReplaceableHomeCoverageFill(key, current);

    if (!canFillBlank && !canReplacePublic && !canReplaceWeakCheck && !canReplaceCoverageDefault) {
      skippedKeys.push(key);
      if (
        recordMismatches &&
        current &&
        !fieldIsBlank(current) &&
        valuesDiffer(nextValue, current.value)
      ) {
        appendRecordsCheck(
          values,
          mismatchLine(
            fieldLabelFor(key),
            nextValue,
            current.value,
            sheetSourcePhrase(current),
            mismatchIncomingLabel,
          ),
        );
      }
      continue;
    }

    values[key] = {
      value: nextValue,
      status: "check",
      source,
      sourceLabel,
    };
    filledKeys.push(key);
  }

  if (fieldIsBlank(values.applicant_name) && values.named_insured?.value?.trim()) {
    values.applicant_name = { ...values.named_insured };
    filledKeys.push("applicant_name");
  }
  if (
    fieldIsBlank(values.applicant_name) &&
    values.current_policy_named_insured?.value?.trim()
  ) {
    values.applicant_name = { ...values.current_policy_named_insured };
    filledKeys.push("applicant_name");
  }
  if (
    fieldIsBlank(values.named_insured) &&
    values.current_policy_named_insured?.value?.trim()
  ) {
    values.named_insured = { ...values.current_policy_named_insured };
    filledKeys.push("named_insured");
  }
  if (line === "home" || line === "flood") {
    promoteLoneMailingToProperty(values, filledKeys, existing, extracted);
  } else {
    if (fieldIsBlank(values.applicant_address) && values.mailing_address?.value?.trim()) {
      values.applicant_address = { ...values.mailing_address };
      filledKeys.push("applicant_address");
    }
    if (fieldIsBlank(values.address1) && values.applicant_address?.value?.trim()) {
      values.address1 = { ...values.applicant_address };
      filledKeys.push("address1");
    }
  }
  if (fieldIsBlank(values.mortgagee_name) && values.mortgagee?.value?.trim()) {
    values.mortgagee_name = { ...values.mortgagee };
    filledKeys.push("mortgagee_name");
  }
  if (fieldIsBlank(values.driver_1_gender) && values.applicant_gender?.value?.trim()) {
    const g = normalizeGender(values.applicant_gender.value) || values.applicant_gender.value;
    values.driver_1_gender = { ...values.applicant_gender, value: g };
    filledKeys.push("driver_1_gender");
  }
  if (fieldIsBlank(values.driver_1_occupation) && values.applicant_occupation?.value?.trim()) {
    values.driver_1_occupation = { ...values.applicant_occupation };
    filledKeys.push("driver_1_occupation");
  }

  if (line === "auto") {
    const collapsed = collapseAutoDriverSheet(values);
    for (const key of new Set([...Object.keys(values), ...Object.keys(collapsed)])) {
      if (!key.startsWith("driver_")) continue;
      const before = values[key]?.value?.trim() ?? "";
      const after = collapsed[key]?.value?.trim() ?? "";
      if (before && !after) {
        const index = filledKeys.indexOf(key);
        if (index >= 0) filledKeys.splice(index, 1);
      } else if (after && after !== before && !filledKeys.includes(key)) {
        filledKeys.push(key);
      }
    }
    return { values: collapsed, filledKeys, skippedKeys };
  }

  if (line === "home") {
    finalizeHomeDeclarationCoverages(values, filledKeys, options?.docType, extracted);
  }

  if (line === "flood") {
    markFloodHasNfipFromExtract(values, filledKeys, extracted, source);
  }

  const stamped =
    line === "home" ? applyInspectionExistenceFromDoc(values, options?.docType, source) : values;
  return { values: stamped, filledKeys, skippedKeys };
}

/** Gap-fill blanks from public records. Uploaded dec / agent / Javy always win. */
export function applyPublicToSheet(
  line: ShopLine,
  existing: Record<string, QuoteSheetFieldValue>,
  facts: PublicFact[],
): ApplyFillResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];

  for (const fact of facts) {
    const key = extractKeyToSheetKey(line, fact.fieldKey);
    if (!key) continue;
    if (key === "coverage_a" || fact.kind === "zestimate" || fact.kind === "list_price") {
      skippedKeys.push(key);
      continue;
    }
    if (isBlockedPublicKey(key)) {
      skippedKeys.push(key);
      continue;
    }
    const current = values[key];
    if (neverCheckCoverageA(key, current) || !fieldIsBlank(current)) {
      skippedKeys.push(key);
      continue;
    }
    const nextValue = String(fact.value ?? "").trim();
    if (!nextValue) continue;
    values[key] = {
      value: nextValue,
      status: "check",
      source: "public",
      sourceLabel: fact.sourceLabel,
    };
    filledKeys.push(key);
  }

  return { values, filledKeys, skippedKeys };
}

function isBlockedPublicKey(key: string): boolean {
  return /ssn|claim|social/.test(key);
}

export type DealHeaderGlance = {
  coverageAmount: number | null;
  propertyOneliner: string | null;
  currentCarrier: string | null;
  primaryNamedInsured?: string | null;
  secondaryNamedInsured?: string | null;
};

export function headerIsBlank(value: string | number | null | undefined): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return value.trim() === "";
}

export function propertyOnelinerFromSheet(
  values: Record<string, QuoteSheetFieldValue>,
): string | null {
  const rawStreet = values.address1?.value?.trim() ?? "";
  if (!rawStreet) return null;
  const city = values.city?.value?.trim() ?? "";
  const state = values.state?.value?.trim() ?? "";
  const zip = values.zip?.value?.trim() ?? "";
  const year = values.year_built?.value?.trim() ?? "";
  const construction = values.construction?.value?.trim() ?? "";
  const street =
    city && rawStreet.toLowerCase().includes(city.toLowerCase())
      ? rawStreet.split(",")[0].trim()
      : rawStreet;
  const locality = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const head = locality ? `${street}, ${locality}` : street;
  const tail = [year, construction].filter(Boolean).join(" ");
  return tail ? `${head} · ${tail}` : head;
}

export function coverageAmountFromSheet(
  values: Record<string, QuoteSheetFieldValue>,
): number | null {
  const raw = values.coverage_a?.value?.replace(/[, $]/g, "") ?? "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Copy matching glance fields onto deal header BLANKS only. Never overwrite typed values. */
export function fillDealHeaderBlanks(
  header: DealHeaderGlance,
  values: Record<string, QuoteSheetFieldValue>,
): DealHeaderGlance {
  const next: DealHeaderGlance = { ...header };
  const covA = coverageAmountFromSheet(values);
  if (headerIsBlank(header.coverageAmount) && covA != null) {
    next.coverageAmount = covA;
  }
  const oneliner = propertyOnelinerFromSheet(values);
  if (headerIsBlank(header.propertyOneliner) && oneliner) {
    next.propertyOneliner = oneliner;
  }
  const carrier = values.current_carrier?.value?.trim() ?? "";
  if (headerIsBlank(header.currentCarrier) && carrier) {
    next.currentCarrier = carrier;
  }
  const named = values.named_insured?.value?.trim() ?? "";
  if (headerIsBlank(header.primaryNamedInsured) && named) {
    next.primaryNamedInsured = named;
  }
  return next;
}

export type ContactBlanks = {
  firstName: string;
  lastName: string;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

const PLACEHOLDER_NAMES = new Set(["bound", "client", "unknown", "lead"]);

export function splitNamedInsured(raw: string): { firstName: string; lastName: string } | null {
  const parts = raw.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function isPlaceholderName(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return !v || PLACEHOLDER_NAMES.has(v);
}

/** Bind: copy matching sheet values onto Contact blanks. Never invent SSN, DOB, or claims. */
export function fillContactBlanksFromSheet(
  contact: ContactBlanks,
  values: Record<string, QuoteSheetFieldValue>,
): ContactBlanks {
  const next: ContactBlanks = { ...contact };
  const named = splitNamedInsured(values.named_insured?.value?.trim() ?? "");
  if (named && isPlaceholderName(contact.firstName)) next.firstName = named.firstName;
  if (named && isPlaceholderName(contact.lastName)) next.lastName = named.lastName;
  const street = values.address1?.value?.trim() ?? "";
  if (headerIsBlank(contact.mailingAddress) && street) next.mailingAddress = street;
  const city = values.city?.value?.trim() ?? "";
  if (headerIsBlank(contact.city) && city) next.city = city;
  const state = values.state?.value?.trim() ?? "";
  if (headerIsBlank(contact.state) && state) next.state = state;
  const zip = values.zip?.value?.trim() ?? "";
  if (headerIsBlank(contact.zip) && zip) next.zip = zip;
  return next;
}

export type PolicyBlanks = {
  policyNumber: string | null;
  coverageA: number | null;
  premium: number | null;
  effectiveDate: string | null;
  expirationDate: string | null;
};

function moneyFromSheet(raw: string): number | null {
  const n = Number(raw.replace(/[, $]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Bind: copy matching sheet values onto Policy blanks. Never use Zestimate as Cov A. */
export function fillPolicyBlanksFromSheet(
  policy: PolicyBlanks,
  values: Record<string, QuoteSheetFieldValue>,
  opts?: { coverageASource?: string | null },
): PolicyBlanks {
  const next: PolicyBlanks = { ...policy };
  const number = values.policy_number?.value?.trim() ?? "";
  if (headerIsBlank(policy.policyNumber) && number) next.policyNumber = number;
  const covA = coverageAmountFromSheet(values);
  const covSource = opts?.coverageASource ?? values.coverage_a?.source ?? "";
  if (
    headerIsBlank(policy.coverageA) &&
    covA != null &&
    covSource !== "public" &&
    values.coverage_a?.sourceLabel?.toLowerCase().includes("zestimate") !== true
  ) {
    next.coverageA = covA;
  }
  const premium = moneyFromSheet(values.current_premium?.value?.trim() ?? "");
  if (headerIsBlank(policy.premium) && premium != null) next.premium = premium;
  const effective = values.effective_date?.value?.trim() ?? "";
  if (headerIsBlank(policy.effectiveDate) && effective) next.effectiveDate = effective;
  const expiration = values.expiration_date?.value?.trim() ?? "";
  if (headerIsBlank(policy.expirationDate) && expiration) next.expirationDate = expiration;
  return next;
}

export function parseSheetDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(raw.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Current policy cells Confirm must not blank when the posted value is empty. */
export const CURRENT_POLICY_CONFIRM_KEYS = [
  "policy_number",
  "effective_date",
  "expiration_date",
  "current_carrier",
  "current_premium",
  "current_policy_named_insured",
] as const;

/**
 * Confirm means "I reviewed this sheet." An empty post for a filled Current
 * policy cell (effective date, policy number, expiration) is a dropped input,
 * not an intentional clear. Save can still blank them.
 */
export function keepFilledCurrentPolicyOnConfirm(
  existing: Record<string, QuoteSheetFieldValue | undefined>,
  submitted: Record<string, string>,
): Record<string, string> {
  const next = { ...submitted };
  for (const key of CURRENT_POLICY_CONFIRM_KEYS) {
    const had = String(existing[key]?.value ?? "").trim();
    if (!had) continue;
    if (!Object.prototype.hasOwnProperty.call(next, key)) continue;
    if (String(next[key] ?? "").trim()) continue;
    delete next[key];
  }
  return next;
}

export function mergeAgentEdits(
  existing: Record<string, QuoteSheetFieldValue>,
  submitted: Record<string, string>,
  line: ShopLine,
  product?: SheetProduct,
): Record<string, QuoteSheetFieldValue> {
  const next: Record<string, QuoteSheetFieldValue> = { ...existing };

  function writeCell(key: string, raw: string) {
    const typed = String(raw ?? "").trim();
    const current = next[key];
    if (neverCheckCoverageA(key, current) && typed === (current?.value ?? "")) {
      next[key] = {
        value: current?.value ?? typed,
        status: "confirmed",
        source: "javy",
      };
      return;
    }
    if (typed === "") {
      next[key] = { value: "", status: "missing", source: "blank" };
      return;
    }
    const unchangedCheck =
      current?.status === "check" &&
      current.value === typed &&
      (current.source === "extracted" || current.source === "photo-ocr");
    if (unchangedCheck) {
      next[key] = current;
      return;
    }
    next[key] = { value: typed, status: "confirmed", source: "agent" };
  }

  const catalog = new Set(fieldsForLine(line, product).map((field) => field.key));
  for (const fieldKey of catalog) {
    if (!(fieldKey in submitted)) continue;
    writeCell(fieldKey, submitted[fieldKey]);
  }
  for (const [key, raw] of Object.entries(submitted)) {
    if (isSheetFormMetaKey(key) || catalog.has(key)) continue;
    writeCell(key, raw);
  }
  if (line === "home") reapplyDefaultsAfterManualCoverageA(existing, next, product);
  return line === "auto" ? collapseAutoDriverSheet(next) : next;
}

export { submittedSheetValues };

export function confirmField(
  existing: Record<string, QuoteSheetFieldValue>,
  fieldKey: string,
): Record<string, QuoteSheetFieldValue> {
  const current = existing[fieldKey];
  if (!current || fieldIsBlank(current)) return existing;
  if (current.source === "javy") {
    return {
      ...existing,
      [fieldKey]: { ...current, status: "confirmed", source: "javy" },
    };
  }
  return {
    ...existing,
    [fieldKey]: {
      ...current,
      status: "confirmed",
      source:
        current.source === "extracted" || current.source === "photo-ocr"
          ? "agent"
          : current.source,
    },
  };
}

export function sheetCounts(values: Record<string, QuoteSheetFieldValue>): {
  missing: number;
  check: number;
  confirmed: number;
} {
  let missing = 0;
  let check = 0;
  let confirmed = 0;
  for (const field of Object.values(values)) {
    if (field.status === "check") check += 1;
    else if (field.status === "confirmed" && field.value.trim()) confirmed += 1;
    else missing += 1;
  }
  return { missing, check, confirmed };
}
