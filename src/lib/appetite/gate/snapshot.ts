import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { carrierTransferValues } from "@/lib/quote-sheet/home-inspections";
import type { AutoFlags, MasterRiskSnapshot, WindMit } from "./types";

function emptyAutoFlags(): AutoFlags {
  return { dui: false, sr22: false, lapse: false, tickets: false, accidents: false };
}

export function emptySnapshot(partial?: Partial<MasterRiskSnapshot>): MasterRiskSnapshot {
  return {
    state: partial?.state ?? null,
    line: partial?.line ?? "HO3",
    occupancy: partial?.occupancy ?? null,
    roofAgeYears: partial?.roofAgeYears ?? null,
    roofCertified: partial?.roofCertified ?? null,
    yearBuilt: partial?.yearBuilt ?? null,
    windMit: partial?.windMit ?? null,
    coastTier: partial?.coastTier ?? null,
    milesToCoast: partial?.milesToCoast ?? null,
    constructionQuality: partial?.constructionQuality ?? null,
    construction: partial?.construction ?? null,
    isMobile: partial?.isMobile ?? false,
    isManufactured: partial?.isManufactured ?? false,
    isVacant: partial?.isVacant ?? false,
    isCollectorAuto: partial?.isCollectorAuto ?? false,
    isDailyDriver: partial?.isDailyDriver ?? null,
    secureStorage: partial?.secureStorage ?? null,
    autoFlags: { ...emptyAutoFlags(), ...partial?.autoFlags },
    admittedDeclinedCount: partial?.admittedDeclinedCount ?? 0,
    admittedMarketOpen: partial?.admittedMarketOpen ?? null,
    modeledCatPass: partial?.modeledCatPass ?? null,
    windFloodNeedMismatch: partial?.windFloodNeedMismatch ?? null,
    isPreferredStandardHome: partial?.isPreferredStandardHome ?? null,
    isStandardPreferredNewConstruction: partial?.isStandardPreferredNewConstruction ?? null,
    isInland: partial?.isInland ?? null,
    isPreferredAutoProfile: partial?.isPreferredAutoProfile ?? null,
    dirtyMvr: partial?.dirtyMvr ?? null,
    coverageA: partial?.coverageA ?? null,
    protectionClass: partial?.protectionClass ?? null,
    dealId: partial?.dealId ?? null,
    riskId: partial?.riskId ?? null,
    masterId: partial?.masterId ?? null,
  };
}

function sheetValue(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): string | null {
  const raw = values?.[key]?.value?.trim() ?? "";
  return raw || null;
}

function sheetNumber(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): number | null {
  const raw = sheetValue(values, key)?.replace(/[, $]/g, "") ?? "";
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function sheetBool(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): boolean | null {
  const raw = sheetValue(values, key)?.toLowerCase();
  if (!raw) return null;
  if (["true", "yes", "y", "1"].includes(raw)) return true;
  if (["false", "no", "n", "0"].includes(raw)) return false;
  return null;
}

function inferWindMit(openingProtection: string | null | undefined): WindMit | null {
  if (!openingProtection) return null;
  const v = openingProtection.toLowerCase();
  if (v.includes("none") || v.includes("unprotected")) return "none";
  if (v.includes("poor")) return "poor";
  if (v.includes("partial") || v.includes("shutters")) return "partial";
  if (v.includes("full") || v.includes("impact")) return "full";
  return null;
}

function inferLine(deal?: { lineOfBusiness?: string | null; quotingLine?: string | null; quotingForm?: string | null }): string {
  const form = deal?.quotingForm?.trim();
  if (form) return form.toUpperCase();
  const quoting = deal?.quotingLine?.trim().toLowerCase();
  if (quoting === "auto") return "PAP";
  if (quoting === "flood") return "FLOOD";
  const lob = deal?.lineOfBusiness?.trim().toUpperCase();
  if (lob === "HO" || !lob) return "HO3";
  if (lob === "AUTO") return "PAP";
  return lob;
}

export type RiskLike = {
  id?: string | null;
  dealId?: string | null;
  state?: string | null;
  occupancy?: string | null;
  yearBuilt?: number | null;
  roofYear?: number | null;
  construction?: string | null;
  openingProtection?: string | null;
  milesToCoast?: number | null;
  mobileHome?: boolean | null;
  coverageA?: number | null;
  protectionClass?: string | null;
};

export type DealLike = {
  id?: string | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
};

/**
 * Build a gate snapshot from the deal risk + optional quote-sheet values.
 * Extra flags (CAT model, SR-22, collector garage) stay TODO until the master sheet has them.
 */
export function snapshotFromRisk(input: {
  risk: RiskLike;
  deal?: DealLike | null;
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  asOfYear?: number;
  admittedDeclinedCount?: number;
  masterId?: string | null;
  overrides?: Partial<MasterRiskSnapshot>;
}): MasterRiskSnapshot {
  const asOfYear = input.asOfYear ?? new Date().getFullYear();
  const values = input.sheetValues;
  const inspections = carrierTransferValues(values);
  const occupancy = sheetValue(values, "occupancy") ?? input.risk.occupancy ?? null;
  const construction = sheetValue(values, "construction") ?? input.risk.construction ?? null;
  const yearBuilt = sheetNumber(values, "year_built") ?? input.risk.yearBuilt ?? null;
  const roofYear = sheetNumber(inspections, "roof_year") ?? input.risk.roofYear ?? null;
  const mobileSheet = sheetBool(values, "mobile_home");
  const occLower = (occupancy ?? "").toLowerCase();
  const conLower = (construction ?? "").toLowerCase();

  const isMobile = (mobileSheet ?? Boolean(input.risk.mobileHome)) || conLower.includes("mobile");
  const isManufactured = conLower.includes("manufactured") || isMobile;
  const isVacant = occLower.includes("vacant");

  return emptySnapshot({
    state: sheetValue(values, "state") ?? input.risk.state ?? null,
    line: inferLine(input.deal ?? undefined),
    occupancy,
    roofAgeYears: roofYear != null ? Math.max(0, asOfYear - roofYear) : null,
    // TODO: roofCertified ← license_or_certificate_number / wind_mit_form on master sheet
    roofCertified: sheetValue(inspections, "license_or_certificate_number")
      ? true
      : sheetValue(inspections, "wind_mit_form")
        ? true
        : null,
    yearBuilt,
    // TODO: windMit ← dedicated wind-mit grade; opening_protection is a stand-in
    windMit: inferWindMit(sheetValue(inspections, "opening_protection") ?? input.risk.openingProtection),
    // TODO: coastTier ← territory / CAT tier on master sheet
    coastTier: null,
    milesToCoast: sheetNumber(values, "miles_to_coast") ?? input.risk.milesToCoast ?? null,
    // TODO: constructionQuality ← 4-point / construction grade
    constructionQuality: null,
    construction,
    isMobile,
    isManufactured,
    isVacant,
    // TODO: isCollectorAuto / autoFlags ← auto master sheet (DUI, SR-22, lapse, tickets)
    isCollectorAuto: false,
    isDailyDriver: null,
    secureStorage: null,
    autoFlags: emptyAutoFlags(),
    admittedDeclinedCount: input.admittedDeclinedCount ?? 0,
    admittedMarketOpen: null,
    modeledCatPass: null,
    windFloodNeedMismatch: null,
    isPreferredStandardHome: null,
    isStandardPreferredNewConstruction: null,
    isInland: null,
    coverageA: sheetNumber(values, "coverage_a") ?? input.risk.coverageA ?? null,
    protectionClass: sheetValue(values, "protection_class") ?? input.risk.protectionClass ?? null,
    dealId: input.deal?.id ?? input.risk.dealId ?? null,
    riskId: input.risk.id ?? null,
    masterId: input.masterId ?? null,
    ...input.overrides,
  });
}
