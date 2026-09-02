export const DEFAULT_TENANT_ID =
  process.env.TENANT_ID ?? "11111111-1111-4111-8111-111111111111";

export const CONFIDENCE_THRESHOLD = 0.8;

export const LINES = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "GL",
  "LIFE",
  "HEALTH",
] as const;
export type LineOfBusiness = (typeof LINES)[number];

export const DEAL_STAGES = [
  "shopping",
  "quoting",
  "comparing",
  "bound",
  "lost",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const QUOTE_RESULTS = [
  "quoted",
  "declined",
  "floor_only",
  "takeout_only",
  "portal_closed",
] as const;
export type QuoteAttemptResult = (typeof QUOTE_RESULTS)[number];

export const FIT_BANDS = ["green", "yellow", "red"] as const;
export type FitBand = (typeof FIT_BANDS)[number];

export const DOC_TYPES = [
  "dec",
  "wind_mit",
  "four_point",
  "photo",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const RISK_TYPES = ["property", "auto"] as const;
export type RiskType = (typeof RISK_TYPES)[number];

export type RiskSnapshot = {
  yearBuilt: number | null;
  roofYear: number | null;
  roofCovering: string | null;
  construction: string | null;
  openingProtection: string | null;
  occupancy: string | null;
  stories: number | null;
  pool: boolean | null;
  protectionClass: string | null;
  milesToCoast: number | null;
  city: string | null;
  county: string | null;
  coverageA: number | null;
  mobileHome: boolean | null;
  replacementCostEstimate: number | null;
  state: string | null;
};

export type AppetiteRuleInput = {
  carrierId: string;
  carrierName: string;
  lineOfBusiness: string;
  minCovA: number | null;
  maxCovA: number | null;
  minYearBuilt: number | null;
  maxRoofAge: number | null;
  allowedRoofCoverings: string[] | null;
  coastalAllowed: boolean;
  minMilesToCoast: number | null;
  maxMilesToCoast: number | null;
  mobileAllowed: boolean;
  requiresOpeningProtection: boolean;
  maxStories: number | null;
  allowedConstruction: string[] | null;
  allowedOccupancy: string[] | null;
  allowedCounties: string[] | null;
  excludedCounties: string[] | null;
  countyMinCovA: Record<string, number> | null;
  requireReplacementCost: boolean;
  rceFloorRatio: number | null;
  portalStatus: "open" | "closed" | "takeout_only";
  dontWriteNotes: string | null;
  writtenLines: string[];
};

export type PriorAttempt = {
  carrierId: string;
  result: QuoteAttemptResult;
  why: string | null;
  bindable: boolean;
  snapYearBuilt: number | null;
  snapRoofYear: number | null;
  snapRoofCovering: string | null;
  snapConstruction: string | null;
  snapCounty: string | null;
  snapMilesToCoast: number | null;
  snapCoverageA: number | null;
};

export function currentRoofAge(
  roofYear: number | null,
  asOfYear = new Date().getFullYear(),
): number | null {
  if (!roofYear) return null;
  return asOfYear - roofYear;
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
