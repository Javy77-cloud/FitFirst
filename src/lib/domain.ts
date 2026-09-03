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
  "RV",
  "WC",
] as const;
export type LineOfBusiness = (typeof LINES)[number];

/** Desk line tabs on a shop. Home + Auto are first-class; others are thinner. */
export const SHOP_LINES = [
  "home",
  "auto",
  "rec_rv",
  "flood",
  "umbrella",
  "life",
  "health",
  "workers_comp",
  "general_liability",
] as const;
export type ShopLine = (typeof SHOP_LINES)[number];

export const SHOP_LINE_LABELS: Record<ShopLine, string> = {
  home: "Home",
  auto: "Auto",
  rec_rv: "Rec/RV",
  flood: "Flood",
  umbrella: "Umbrella",
  life: "Life",
  health: "Health",
  workers_comp: "Workers Comp",
  general_liability: "General Liability",
};

export const FIRST_CLASS_LINES: ShopLine[] = ["home", "auto"];

export const LOB_TO_SHOP_LINE: Record<string, ShopLine> = {
  HO: "home",
  AUTO: "auto",
  RV: "rec_rv",
  FLOOD: "flood",
  UMBRELLA: "umbrella",
  LIFE: "life",
  HEALTH: "health",
  WC: "workers_comp",
  GL: "general_liability",
};

export const SHOP_LINE_TO_LOB: Record<ShopLine, string> = {
  home: "HO",
  auto: "AUTO",
  rec_rv: "RV",
  flood: "FLOOD",
  umbrella: "UMBRELLA",
  life: "LIFE",
  health: "HEALTH",
  workers_comp: "WC",
  general_liability: "GL",
};

export const QUOTE_FIELD_STATUSES = ["missing", "check", "confirmed"] as const;
export type QuoteFieldStatus = (typeof QUOTE_FIELD_STATUSES)[number];

export const QUOTE_FIELD_SOURCES = [
  "blank",
  "agent",
  "extracted",
  "photo-ocr",
  "seed",
  "javy",
] as const;
export type QuoteFieldSource = (typeof QUOTE_FIELD_SOURCES)[number];

export const EXTRACTION_ENGINES = ["pdf_text", "ocr"] as const;
export type ExtractionEngine = (typeof EXTRACTION_ENGINES)[number];

export const EXTRACTION_JOB_STATUSES = [
  "pending",
  "done",
  "not_implemented",
  "failed",
] as const;
export type ExtractionJobStatus = (typeof EXTRACTION_JOB_STATUSES)[number];

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

export function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
