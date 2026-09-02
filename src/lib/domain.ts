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

export const USER_ROLES = ["admin", "agent"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COMMISSION_STATUSES = ["pending", "payable", "paid", "held"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const ASK_STATUSES = ["open", "done"] as const;
export type AskStatus = (typeof ASK_STATUSES)[number];

export const ASK_KINDS = ["question", "payout"] as const;
export type AskKind = (typeof ASK_KINDS)[number];

export const ASK_ENTITY_TYPES = ["commission", "policy"] as const;
export type AskEntityType = (typeof ASK_ENTITY_TYPES)[number];

export const OWNER_ENTITY_TYPES = ["lead", "contact", "deal", "policy"] as const;
export type OwnerEntityType = (typeof OWNER_ENTITY_TYPES)[number];

export const COMMISSION_RANGES = [
  "all",
  "pending",
  "paid",
  "last_30",
  "last_quarter",
  "fiscal_year",
  "upcoming",
] as const;
export type CommissionRange = (typeof COMMISSION_RANGES)[number];

export const COMMISSION_VIEWS = ["mine", "agency"] as const;
export type CommissionView = (typeof COMMISSION_VIEWS)[number];

export const DEFAULT_COMMISSION_RATE_PCT = 10;

export function formatRatePct(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(Number.isInteger(n) ? 0 : 2)}%`;
}
