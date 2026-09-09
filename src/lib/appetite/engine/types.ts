/** sep7dl Appetite prediction engine (shadow mode) — shared types. */

export type AppetiteColor = "green" | "yellow" | "red";

export type AppetiteOperator = "lte" | "gte" | "eq" | "in" | "not_in";

export type AppetiteLayer = "standing" | "candidate";

export type AppetitePartitionStatus = "shadow" | "live" | "held";

export type AppetiteReasonCode =
  | "roof_age"
  | "cov_a_floor"
  | "coastal"
  | "four_point"
  | "occupancy"
  | "credit"
  | "portal_closed"
  | "year_built"
  | "mobile_home"
  | "other";

export type AppetiteRuleSource = "seed" | "decline_parse" | "manual";

/** Flexible sheet / risk snap bag used by predict (silent — no agent UI). */
export type AppetiteSheetSnapshot = {
  state?: string | null;
  line?: string | null;
  year_built?: number | null;
  roof_year?: number | null;
  /** Derived age in years when as-of year known. */
  roof_year_age?: number | null;
  miles_to_coast?: number | null;
  cov_a?: number | null;
  cov_a_min?: number | null;
  construction?: string | null;
  occupancy?: string | null;
  mobile_home?: boolean | null;
  county?: string | null;
  city?: string | null;
  stories?: number | null;
  /** Extra keys allowed for lookalike / future rules. */
  [key: string]: unknown;
};

export type StandingRuleInput = {
  id: string;
  field: string;
  operator: AppetiteOperator | string;
  threshold: unknown;
  disposition: AppetiteColor | string;
  reasonCode: string;
  carrierId?: string | null;
  layer?: AppetiteLayer | string;
  live?: boolean;
  stale?: boolean;
};

export type CarrierAppetitePrediction = {
  carrierId: string;
  color: AppetiteColor;
  ruleId: string | null;
  reasonCode: string | null;
};

export type PredictAppetiteInput = {
  state: string;
  line: string;
  sheetSnapshot: AppetiteSheetSnapshot;
  carriers: string[];
  /** Standing rules only; candidates never drive colors. */
  rules: StandingRuleInput[];
  /** Calendar year for roof_year_age derivation when only roof_year present. */
  asOfYear?: number;
};

/**
 * Floor-only / forced Cov A must never resolve as green.
 * Documented contract for resolveShadowPrediction + scorePartition.
 */
export const FLOOR_ONLY_RESOLVES_AS: AppetiteColor = "yellow";

/** Attempt / writeback results that are not scored (portal noise). */
export const SHADOW_SKIP_ACTUALS = new Set([
  "incomplete",
  "portal_closed",
  "login_fail",
  "login_failed",
  "skip",
  "maybe",
]);

export function colorRank(color: AppetiteColor): number {
  if (color === "red") return 3;
  if (color === "yellow") return 2;
  return 1;
}

export function worseColor(a: AppetiteColor, b: AppetiteColor): AppetiteColor {
  return colorRank(a) >= colorRank(b) ? a : b;
}

export function asAppetiteColor(value: string | null | undefined): AppetiteColor | null {
  if (value === "green" || value === "yellow" || value === "red") return value;
  if (value === "bindable" || value === "quoted" || value === "hit") return "green";
  if (value === "conditional" || value === "floor_only" || value === "takeout_only") {
    return "yellow";
  }
  if (value === "declined" || value === "no_market" || value === "hard_no") return "red";
  return null;
}

/**
 * Map raw attempt disposition → color for scoring writeback.
 * floor_only / forced Cov A → yellow (never green).
 */
export function resolveActualColor(actual: string | null | undefined): AppetiteColor | null {
  if (!actual) return null;
  const key = actual.trim().toLowerCase();
  if (SHADOW_SKIP_ACTUALS.has(key)) return null;
  if (key === "floor_only" || key === "forced_cov_a" || key === "cov_a_floor") {
    return FLOOR_ONLY_RESOLVES_AS;
  }
  return asAppetiteColor(key);
}
