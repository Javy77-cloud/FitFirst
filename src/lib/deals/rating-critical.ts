/** Fields that change rating / bindability — later sheet saves re-open the approve gate. */

export const RATING_CRITICAL_KEYS = [
  "coverage_a",
  "year_built",
  "roof_year",
  "roof_covering",
  "roof_shape",
  "roof_age",
  "claims",
  "claims_count",
  "claim_count",
  "losses",
  "loss_count",
  "loss_history",
  "occupancy",
  "construction",
  "stories",
  "miles_to_coast",
  "square_feet",
  "protection_class",
  "replacement_cost_estimate",
] as const;

export type RatingCriticalKey = (typeof RATING_CRITICAL_KEYS)[number];

const CRITICAL_SET = new Set<string>(RATING_CRITICAL_KEYS);

export function isRatingCriticalKey(key: string): boolean {
  return CRITICAL_SET.has(key);
}

function cellValue(
  values: Record<string, { value?: string | null } | null | undefined> | null | undefined,
  key: string,
): string {
  return String(values?.[key]?.value ?? "").trim();
}

export function ratingCriticalFingerprint(
  values?: Record<string, { value?: string | null } | null | undefined> | null,
): string {
  return RATING_CRITICAL_KEYS.map((key) => `${key}=${cellValue(values, key)}`).join("\n");
}

export function ratingCriticalChanged(
  before?: Record<string, { value?: string | null } | null | undefined> | null,
  after?: Record<string, { value?: string | null } | null | undefined> | null,
): boolean {
  return ratingCriticalFingerprint(before) !== ratingCriticalFingerprint(after);
}

export function filledKeysAreRatingCritical(keys: readonly string[]): boolean {
  return keys.some((key) => isRatingCriticalKey(key));
}
