/**
 * Geography expansion for appetite import.
 *
 * Fuzzy tokens → real 2-letter US codes when storing `states_available`.
 * Never invent all 50 unless the source row literally says US (Foremost, Pacific Specialty, Hagerty).
 */

export const US_50_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export type UsState = (typeof US_50_STATES)[number];

/** SE_coastal / SE / SE_select / SE_east → FL, GA, SC, NC, AL, MS, LA */
export const SE_STATES: readonly UsState[] = ["FL", "GA", "SC", "NC", "AL", "MS", "LA"];

/** mid_atlantic_select → VA, MD, DE, NJ, PA, NY */
export const MID_ATLANTIC_SELECT: readonly UsState[] = ["VA", "MD", "DE", "NJ", "PA", "NY"];

/** Tokens that expand to a real state list. */
export const STATE_EXPAND_MAP: Record<string, readonly UsState[]> = {
  SE_coastal: SE_STATES,
  SE: SE_STATES,
  SE_select: SE_STATES,
  SE_east: SE_STATES,
  mid_atlantic_select: MID_ATLANTIC_SELECT,
  US: US_50_STATES,
};

/**
 * Tokens that must NOT invent a state list.
 * - coastal_other: keep explicit listed states only; do not invent all coastal US.
 * - 33_plus_US_states / 45_plus_US_states / other_15plus / other: explicit listed only + needs_state_confirm.
 * - CA_provinces: Canadian — ignore for the US gate.
 */
export const STATE_TOKENS_NO_EXPAND = [
  "coastal_other",
  "33_plus_US_states",
  "45_plus_US_states",
  "other_15plus",
  "other",
  "CA_provinces",
] as const;

export const STATE_CONFIRM_TOKENS = [
  "33_plus_US_states",
  "45_plus_US_states",
  "other_15plus",
  "other",
] as const;

const US_SET = new Set<string>(US_50_STATES);

export function normalizeStateToken(raw: string): string {
  return raw.trim();
}

export function isUsStateCode(value: string): value is UsState {
  return US_SET.has(value.toUpperCase());
}

export type ExpandStatesResult = {
  states: UsState[];
  raw: string[];
  needsStateConfirm: boolean;
  ignoredTokens: string[];
};

export function splitStateTokens(raw: string): string[] {
  return raw
    .split("|")
    .map((part) => normalizeStateToken(part))
    .filter(Boolean);
}

/**
 * Expand fuzzy geography tokens to stored 2-letter codes.
 * `US` → all 50 ONLY when the source token is literally `US`.
 */
export function expandStatesAvailable(raw: string | string[]): ExpandStatesResult {
  const tokens = Array.isArray(raw) ? raw.map(normalizeStateToken).filter(Boolean) : splitStateTokens(raw);
  const states = new Set<UsState>();
  const ignored: string[] = [];
  let needsStateConfirm = false;

  for (const token of tokens) {
    if (token === "CA_provinces") {
      ignored.push(token);
      continue;
    }
    if (token === "coastal_other") {
      ignored.push(token);
      continue;
    }
    if ((STATE_CONFIRM_TOKENS as readonly string[]).includes(token)) {
      needsStateConfirm = true;
      ignored.push(token);
      continue;
    }
    const mapped = STATE_EXPAND_MAP[token];
    if (mapped) {
      for (const code of mapped) states.add(code);
      continue;
    }
    const upper = token.toUpperCase();
    if (isUsStateCode(upper)) {
      states.add(upper);
      continue;
    }
    ignored.push(token);
  }

  return {
    states: [...states],
    raw: tokens,
    needsStateConfirm,
    ignoredTokens: ignored,
  };
}

export function needsStateConfirmNote(existing: string | null | undefined, needsConfirm: boolean): string {
  const base = (existing ?? "").trim();
  if (!needsConfirm) return base;
  const flag = "needs_state_confirm: footprint token is 33+/45+/other — stored explicit listed states only; do not invent 50.";
  if (base.includes("needs_state_confirm")) return base;
  return base ? `${base} ${flag}` : flag;
}
