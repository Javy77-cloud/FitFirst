import { AUTO_FIELDS } from "@/lib/quote-sheet/catalog";
import {
  DRIVER_BLOCK_FIELDS,
  HOUSEHOLD_BLOCK_FIELDS,
  VEHICLE_BLOCK_FIELDS,
  type RepeatableField,
} from "@/lib/quote-sheet/repeatable-units";

/**
 * Words that show up around a carrier prompt but are not the data point.
 * "How" / "long" stay, so a paraphrase is not silently treated as a known field.
 */
const FILLER = new Set([
  "a",
  "an",
  "the",
  "please",
  "enter",
  "select",
  "choose",
  "provide",
  "what",
  "is",
  "are",
  "was",
  "were",
  "your",
  "you",
  "do",
  "does",
  "did",
  "have",
  "has",
  "any",
  "this",
  "that",
  "required",
  "require",
  "blank",
  "missing",
  "waiting",
  "of",
  "for",
  "to",
  "on",
  "in",
  "at",
  "with",
  "from",
  "not",
  "found",
  "disabled",
  "next",
  "if",
  "when",
]);

export type AutoProfileHit = {
  fieldKey: string;
  label: string;
};

const EXTRA_ALIASES: { phrase: string; fieldKey: string; label: string }[] = [
  { phrase: "dl", fieldKey: "driver_1_license", label: "Driver 1 license" },
  { phrase: "dl number", fieldKey: "driver_1_license", label: "Driver 1 license" },
  { phrase: "drivers license", fieldKey: "driver_1_license", label: "Driver 1 license" },
  { phrase: "driver license", fieldKey: "driver_1_license", label: "Driver 1 license" },
  { phrase: "license number", fieldKey: "driver_1_license", label: "Driver 1 license" },
  { phrase: "sex", fieldKey: "driver_1_gender", label: "Driver 1 gender" },
  { phrase: "highest education", fieldKey: "driver_1_education_level", label: "Driver 1 education level" },
  { phrase: "education", fieldKey: "driver_1_education_level", label: "Driver 1 education level" },
  { phrase: "date of birth", fieldKey: "driver_1_dob", label: "Driver 1 DOB" },
  { phrase: "birth date", fieldKey: "driver_1_dob", label: "Driver 1 DOB" },
  { phrase: "birthdate", fieldKey: "driver_1_dob", label: "Driver 1 DOB" },
  { phrase: "vin number", fieldKey: "vin", label: "VIN" },
  { phrase: "ocn", fieldKey: "original_cost_new", label: "Original cost new (OCN)" },
  { phrase: "cost new", fieldKey: "original_cost_new", label: "Original cost new (OCN)" },
  { phrase: "policy number", fieldKey: "policy_number", label: "Current policy ID" },
  { phrase: "bodily injury", fieldKey: "liability_bi", label: "BI limits" },
  { phrase: "property damage", fieldKey: "liability_pd", label: "PD limit" },
  { phrase: "uninsured motorist", fieldKey: "um_uim", label: "UM / UIM" },
  { phrase: "underinsured motorist", fieldKey: "um_uim", label: "UM / UIM" },
  { phrase: "own or rent", fieldKey: "own_rent", label: "Own / Rent" },
  { phrase: "rent or own", fieldKey: "own_rent", label: "Own / Rent" },
  {
    phrase: "how long have you owned this vehicle",
    fieldKey: "vehicle_ownership_length",
    label: "Length of ownership",
  },
  { phrase: "how long owned", fieldKey: "vehicle_ownership_length", label: "Length of ownership" },
  { phrase: "time owned", fieldKey: "vehicle_ownership_length", label: "Length of ownership" },
  { phrase: "years at current address", fieldKey: "years_at_address", label: "Years at address" },
  { phrase: "how long at current address", fieldKey: "years_at_address", label: "Years at address" },
  { phrase: "time at address", fieldKey: "years_at_address", label: "Years at address" },
];

export function normalizeQuestionText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripUnitIndex(text: string): string {
  return text.replace(/\b(driver|vehicle|household)\s+\d+\b/g, " ").replace(/\s+/g, " ").trim();
}

/** Carrier prompt reduced to the data-point words. */
export function questionContent(raw: string): string {
  const stripped = stripUnitIndex(normalizeQuestionText(raw));
  return stripped
    .split(" ")
    .filter((token) => token && !FILLER.has(token))
    .join(" ");
}

function remember(map: Map<string, AutoProfileHit>, phrase: string, hit: AutoProfileHit) {
  const full = normalizeQuestionText(phrase);
  const content = questionContent(phrase);
  if (full && !map.has(full)) map.set(full, hit);
  if (content && !map.has(content)) map.set(content, hit);
}

function rememberField(map: Map<string, AutoProfileHit>, key: string, label: string) {
  const hit = { fieldKey: key, label };
  remember(map, label, hit);
  remember(map, key.replace(/_/g, " "), hit);
  const withoutIndex = label.replace(/\b(Driver|Vehicle|Household)\s+\d+\s+/i, "");
  if (withoutIndex !== label) remember(map, withoutIndex, hit);
  const suffix = key
    .replace(/^(vehicle|driver|household)_\d+_/, "")
    .replace(/^(vehicle|driver|household)_/, "");
  if (suffix !== key) remember(map, suffix.replace(/_/g, " "), hit);
}

function rememberBlock(map: Map<string, AutoProfileHit>, kind: "vehicle" | "driver" | "household", fields: RepeatableField[]) {
  for (const field of fields) {
    rememberField(map, `${kind}_1_${field.suffix}`, field.label);
  }
}

let phraseMap: Map<string, AutoProfileHit> | null = null;

export function autoProfilePhraseMap(): Map<string, AutoProfileHit> {
  if (phraseMap) return phraseMap;
  const map = new Map<string, AutoProfileHit>();
  for (const field of AUTO_FIELDS) rememberField(map, field.key, field.label);
  rememberBlock(map, "vehicle", VEHICLE_BLOCK_FIELDS);
  rememberBlock(map, "driver", DRIVER_BLOCK_FIELDS);
  rememberBlock(map, "household", HOUSEHOLD_BLOCK_FIELDS);
  for (const alias of EXTRA_ALIASES) {
    remember(map, alias.phrase, { fieldKey: alias.fieldKey, label: alias.label });
  }
  phraseMap = map;
  return map;
}

/**
 * True when the carrier prompt is already a data point on the Auto risk profile
 * (AUTO_FIELDS plus repeatable vehicle, driver, and household blocks).
 * Equality after filler/unit stripping — a longer ask such as "lienholder report
 * details" does not collapse into the shorter "lienholder" field.
 */
export function matchAutoRiskProfileQuestion(
  question: string,
): { onProfile: true; fieldKey: string; label: string } | { onProfile: false } {
  const content = questionContent(question);
  const full = normalizeQuestionText(question);
  if (!content && !full) return { onProfile: false };
  const map = autoProfilePhraseMap();
  const hit = (content && map.get(content)) || map.get(full) || undefined;
  if (!hit) return { onProfile: false };
  return { onProfile: true, fieldKey: hit.fieldKey, label: hit.label };
}

/** Same carrier question with a shared prefix, so "Employment required" and "employment category" group. */
export function similarAutoQuestions(a: string, b: string): boolean {
  const left = questionContent(a);
  const right = questionContent(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftTokens = left.split(" ");
  const rightTokens = right.split(" ");
  const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const longer = leftTokens.length <= rightTokens.length ? rightTokens : leftTokens;
  const prefix = shorter.every((token, index) => longer[index] === token);
  if (!prefix) return false;
  if (shorter.length >= 2) return true;
  return shorter.length === 1 && longer.length === 2;
}
