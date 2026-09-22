/**
 * Gemini vision on a phone photo of an auto dec often ignores the flat key list and
 * returns either bare strings or a nested ACORD-style object (vehicles[], drivers[],
 * coverages{}). Bare strings used to land at confidence 0.5, under the 0.8 fill
 * threshold, and nested blocks were dropped — so Fill Risk Profile wrote nothing.
 * This flattens that shape onto the real Auto risk-profile keys before mapping.
 */

import {
  AUTO_DRIVER_PARTS,
  autoDriversSamePerson,
  collapseDriverRecords,
  normalizeAutoDriverName,
} from "@/lib/quote-sheet/auto-driver-dedupe";

export type LooseJson = Record<string, unknown>;

const AUTO_LINES = new Set(["auto", "motorcycle", "commercial_auto"]);

const VEHICLE_LIST_KEYS = [
  "vehicles",
  "autos",
  "automobiles",
  "vehicle_schedule",
  "vehicle_list",
  "covered_autos",
  "covered_auto",
];

const DRIVER_LIST_KEYS = ["drivers", "operators", "listed_drivers", "driver_schedule", "driver_list"];

const COVERAGE_LIST_KEYS = ["coverages", "coverage", "limits", "coverage_limits"];

function normKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[%$#]+/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function isRecord(raw: unknown): raw is LooseJson {
  return Boolean(raw) && typeof raw === "object" && !Array.isArray(raw);
}

function hasPrinted(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === "string" || typeof raw === "number") {
    const text = String(raw).trim().toLowerCase();
    return Boolean(text) && text !== "null" && text !== "n/a";
  }
  if (!isRecord(raw)) return false;
  const inner = raw.value ?? raw.text ?? raw.limit ?? raw.amount ?? raw.deductible;
  if (inner == null || typeof inner === "object") return false;
  const text = String(inner).trim().toLowerCase();
  return Boolean(text) && text !== "null";
}

function pull(rec: LooseJson, names: string[]): unknown {
  const wanted = new Set(names);
  for (const key of Object.keys(rec)) {
    if (!wanted.has(normKey(key))) continue;
    const value = rec[key];
    delete rec[key];
    return value;
  }
  return undefined;
}

function setIfEmpty(out: LooseJson, key: string, raw: unknown) {
  if (!hasPrinted(raw) || hasPrinted(out[key])) return;
  if (isRecord(raw)) {
    const inner = raw.value ?? raw.text ?? raw.limit ?? raw.amount ?? raw.deductible;
    if (raw.confidence == null) {
      out[key] = String(inner);
      return;
    }
    out[key] = { value: String(inner), confidence: raw.confidence };
    return;
  }
  out[key] = typeof raw === "number" ? String(raw) : raw;
}

function asItemList(raw: unknown): LooseJson[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];
  return Object.values(raw).filter(isRecord);
}

function unwrapEnvelope(json: LooseJson): LooseJson {
  const keys = Object.keys(json);
  if (keys.length !== 1) return json;
  const only = json[keys[0]];
  const name = normKey(keys[0]);
  if (
    (name === "fields" || name === "data" || name === "extracted" || name === "result") &&
    isRecord(only)
  ) {
    return { ...only };
  }
  return json;
}

export function splitYearMakeModel(text: string): { year?: string; make?: string; model?: string } {
  const match = text.trim().match(/^((?:19|20)\d{2})\s+([A-Za-z][A-Za-z0-9.+-]*)\s+(.+)$/);
  if (!match) return {};
  return { year: match[1], make: match[2], model: match[3].trim() };
}

const MONTH_NAME =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const POLICY_DATE = `(?:\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}|(?:${MONTH_NAME})\\s+\\d{1,2},?\\s+\\d{4})`;
const POLICY_CLOCK = "\\d{1,2}:\\d{2}\\s*(?:a\\.?\\s*m\\.?|p\\.?\\s*m\\.?)";

/** Travelers prints 12:01 A.M. before each policy-period date. Drop the clock so the dates match. */
export function stripPolicyClocks(text: string): string {
  return text
    .replace(new RegExp(POLICY_CLOCK, "gi"), " ")
    .replace(/\bstandard time\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitPolicyPeriod(text: string): { effective?: string; expiration?: string } {
  const cleaned = stripPolicyClocks(text);
  const match = cleaned.match(
    new RegExp(
      `(${POLICY_DATE})(?:[\\s\\S]{0,80}?)(?:\\bto\\b|\\bthrough\\b|\\buntil\\b|-)[:.]?\\s*(${POLICY_DATE})`,
      "i",
    ),
  );
  if (!match) return {};
  return { effective: match[1], expiration: match[2] };
}

function looksLikeAuto(json: LooseJson, shopLine?: string | null): boolean {
  if (AUTO_LINES.has((shopLine ?? "").trim().toLowerCase())) return true;
  const keys = new Set(Object.keys(json).map(normKey));
  return (
    VEHICLE_LIST_KEYS.some((key) => keys.has(key)) ||
    DRIVER_LIST_KEYS.some((key) => keys.has(key)) ||
    keys.has("vin") ||
    keys.has("vehicle_year") ||
    keys.has("liability_bi") ||
    keys.has("bodily_injury")
  );
}

function vehicleKey(index: number, part: string): string {
  if (index === 0) {
    if (part === "vin") return "vin";
    if (part === "year") return "vehicle_year";
    if (part === "make") return "vehicle_make";
    if (part === "model") return "vehicle_model";
    if (part === "usage") return "vehicle_usage";
    return part;
  }
  return `vehicle_${index + 1}_${part}`;
}

function applyVehicle(out: LooseJson, item: LooseJson, index: number) {
  if (index > 3) return;
  const description = pull(item, [
    "description",
    "vehicle_description",
    "year_make_model",
    "ymm",
    "vehicle",
  ]);
  if (isRecord(description)) Object.assign(item, description);
  setIfEmpty(out, vehicleKey(index, "vin"), pull(item, ["vin", "vehicle_identification_number", "vehicle_vin"]));
  setIfEmpty(out, vehicleKey(index, "year"), pull(item, ["year", "vehicle_year", "model_year"]));
  setIfEmpty(out, vehicleKey(index, "make"), pull(item, ["make", "vehicle_make"]));
  setIfEmpty(out, vehicleKey(index, "model"), pull(item, ["model", "vehicle_model"]));
  if (typeof description === "string" || typeof description === "number") {
    const split = splitYearMakeModel(String(description));
    if (split.year) setIfEmpty(out, vehicleKey(index, "year"), split.year);
    if (split.make) setIfEmpty(out, vehicleKey(index, "make"), split.make);
    if (split.model) setIfEmpty(out, vehicleKey(index, "model"), split.model);
  }
  setIfEmpty(out, vehicleKey(index, "usage"), pull(item, ["usage", "use", "vehicle_usage", "vehicle_use"]));
  const vehicleTerm = pull(item, [
    "full_term_premium",
    "total_premium",
    "total_policy_premium",
    "6_month_premium",
    "six_month_premium",
    "vehicle_total",
  ]);
  if (hasPrinted(vehicleTerm)) rememberVehiclePremium(out, vehicleTerm);
  for (const key of COVERAGE_LIST_KEYS) {
    const raw = pull(item, [key]);
    if (raw != null) applyCoverages(out, raw, hasPrinted(vehicleTerm) ? "limits" : "vehicle");
  }
  const garagingZip = pull(item, ["garaging_zip", "garage_zip", "garaged_zip"]);
  const garagingAddress = pull(item, ["garaging_address", "garage_address", "garaging_location"]);
  if (index === 0) {
    setIfEmpty(out, "garaging_zip", garagingZip);
    setIfEmpty(out, "garaging_address", garagingAddress);
  } else {
    setIfEmpty(out, vehicleKey(index, "garaging_zip"), garagingZip);
    setIfEmpty(out, vehicleKey(index, "garaging_address"), garagingAddress);
  }
}

function fieldText(item: LooseJson, names: string[]): string {
  for (const key of Object.keys(item)) {
    if (!names.includes(normKey(key))) continue;
    const text = textOf(item[key]).trim();
    if (text) return text;
  }
  return "";
}

function hasNameToken(full: string, token: string): boolean {
  if (!token) return true;
  const needle = token.toLowerCase().replace(/\.$/, "");
  return full
    .toLowerCase()
    .split(/\s+/)
    .some((part) => part.replace(/\.$/, "") === needle);
}

/** Join First / Middle / Last when the single name cell was cut off ("Domenic Ic"). */
function driverPrintedName(item: LooseJson): string {
  const direct = fieldText(item, ["name", "driver_name", "full_name"]);
  const first = fieldText(item, ["first_name", "first", "given_name"]);
  const middle = fieldText(item, ["middle_name", "middle", "middle_initial", "mi"]);
  const last = fieldText(item, ["last_name", "last", "surname", "family_name"]);
  const joined = [first, middle, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!joined) return direct;
  if (!direct) return joined;
  const missingLast = Boolean(last) && !hasNameToken(direct, last);
  const missingMiddle = Boolean(middle) && !hasNameToken(direct, middle);
  if ((missingLast || missingMiddle) && joined.length > direct.length) return joined;
  return direct;
}

function fieldRaw(item: LooseJson, names: string[]): unknown {
  for (const key of Object.keys(item)) {
    if (!names.includes(normKey(key))) continue;
    if (textOf(item[key]).trim()) return item[key];
  }
  return undefined;
}

function applyDriver(out: LooseJson, item: LooseJson, index: number) {
  if (index > 3) return;
  const n = index + 1;
  const prefix = `driver_${n}_`;
  const directRaw = fieldRaw(item, ["name", "driver_name", "full_name"]);
  const fullName = driverPrintedName(item);
  if (fullName) {
    const sameAsPrinted = textOf(directRaw).trim() === fullName;
    setIfEmpty(out, `${prefix}name`, sameAsPrinted && directRaw != null ? directRaw : fullName);
  }
  pull(item, [
    "name",
    "driver_name",
    "full_name",
    "first_name",
    "first",
    "given_name",
    "middle_name",
    "middle",
    "middle_initial",
    "mi",
    "last_name",
    "last",
    "surname",
    "family_name",
  ]);
  setIfEmpty(out, `${prefix}dob`, pull(item, ["dob", "date_of_birth", "birth_date", "birthdate"]));
  setIfEmpty(out, `${prefix}gender`, pull(item, ["gender", "sex"]));
  setIfEmpty(
    out,
    `${prefix}license`,
    pull(item, ["license", "license_number", "drivers_license", "driver_license", "dl_number", "dl"]),
  );
  setIfEmpty(out, `${prefix}marital_status`, pull(item, ["marital_status", "marital"]));
  setIfEmpty(out, `${prefix}industry`, pull(item, ["industry"]));
  setIfEmpty(out, `${prefix}occupation`, pull(item, ["occupation"]));
  setIfEmpty(out, `${prefix}education_level`, pull(item, ["education_level", "education"]));
  setIfEmpty(out, `${prefix}status`, pull(item, ["status", "license_status"]));
  setIfEmpty(out, `${prefix}years_licensed`, pull(item, ["years_licensed"]));
  setIfEmpty(out, `${prefix}household_status`, pull(item, ["household_status"]));
  if (n > 1) {
    setIfEmpty(out, `${prefix}relationship`, pull(item, ["relationship", "relation"]));
  } else {
    pull(item, ["relationship", "relation"]);
  }
}

function textOf(raw: unknown): string {
  if (typeof raw === "string" || typeof raw === "number") return String(raw);
  if (!isRecord(raw)) return "";
  const inner = raw.value ?? raw.text ?? raw.limit ?? raw.amount ?? raw.deductible;
  if (typeof inner === "string" || typeof inner === "number") return String(inner);
  return "";
}

type CoverageTarget =
  | "liability_bi"
  | "liability_pd"
  | "um_uim"
  | "pip"
  | "comp_deductible"
  | "collision_deductible";

/** Dec labels vary ("Liability Bodily Injury", "Uninsured Motorist Bodily Injury"). */
function coverageTargetForLabel(label: string): CoverageTarget | null {
  const key = normKey(label);
  if (!key) return null;
  const um = /(^|_)um($|_)|(^|_)uim($|_)|uninsured|underinsured|umbi|uimbi/.test(key);
  if (um && !/property_damage/.test(key)) return "um_uim";
  if (/other_than_collision|(^|_)otc($|_)|comprehensive|(^|_)comp($|_)/.test(key)) {
    return "comp_deductible";
  }
  if (/collision/.test(key)) return "collision_deductible";
  if (/property_damage|(^|_)pd($|_)/.test(key)) return "liability_pd";
  if (/personal_injury_protection|(^|_)pip($|_)/.test(key)) return "pip";
  if (/bodily_injury|(^|_)bi($|_)/.test(key)) return "liability_bi";
  return null;
}

function isSplitBi(key: string, kind: "person" | "accident"): boolean {
  if (/(^|_)um($|_)|(^|_)uim($|_)|uninsured|underinsured/.test(key)) return false;
  if (!/bodily_injury|(^|_)bi($|_)/.test(key)) return false;
  if (kind === "person") return /person/.test(key);
  return /accident|occurrence/.test(key);
}

function scheduleLabel(item: LooseJson): string {
  const wanted = new Set(["name", "coverage", "type", "label", "description"]);
  for (const key of Object.keys(item)) {
    if (!wanted.has(normKey(key))) continue;
    const text = textOf(item[key]).trim();
    if (text) return text;
  }
  return "";
}

function scheduleAmount(item: LooseJson): unknown {
  const wanted = ["premium", "premium_amount", "full_term_premium", "total", "amount"];
  for (const key of Object.keys(item)) {
    if (!wanted.includes(normKey(key))) continue;
    if (hasPrinted(item[key])) return item[key];
  }
  return undefined;
}

/** Coverage-schedule "Total" / "Full Term Premium" / "6 Month Premium" row. Line premiums stay out. */
function noteSchedulePremium(out: LooseJson, item: LooseJson, mode: "policy" | "vehicle" | "limits") {
  if (mode === "limits") return;
  const rank = rankForPremiumKey(normKey(scheduleLabel(item)));
  if (rank < 50) return;
  const amount = scheduleAmount(item);
  if (amount == null) return;
  if (mode === "vehicle") {
    rememberVehiclePremium(out, amount);
    return;
  }
  setPremiumIfBetter(out, amount, rank);
}

function applyCoverages(out: LooseJson, raw: unknown, mode: "policy" | "vehicle" | "limits" = "policy") {
  const split: { person?: unknown; accident?: unknown } = {};
  const items = Array.isArray(raw) ? raw : isRecord(raw) ? [raw] : [];
  for (const source of items) {
    if (!isRecord(source)) continue;
    const item = { ...source };
    noteSchedulePremium(out, item, mode);
    const label = textOf(pull(item, ["name", "coverage", "type", "label", "description"]));
    const limit = pull(item, ["limit", "value", "amount", "deductible"]);
    if (label && Object.keys(item).length === 0) {
      applyCoverageEntry(out, label, limit ?? label, split);
      continue;
    }
    if (label && limit != null) applyCoverageEntry(out, label, limit, split);
    for (const [key, value] of Object.entries(item)) {
      applyCoverageEntry(out, key, value, split);
    }
  }
  if (!hasPrinted(out.liability_bi) && split.person != null && split.accident != null) {
    const person = textOf(split.person).trim();
    const accident = textOf(split.accident).trim();
    if (person && accident) setIfEmpty(out, "liability_bi", `${person}/${accident}`);
  }
}

function applyCoverageEntry(
  out: LooseJson,
  label: string,
  raw: unknown,
  split?: { person?: unknown; accident?: unknown },
) {
  const key = normKey(label);
  if (split && isSplitBi(key, "person")) {
    split.person = raw;
    return;
  }
  if (split && isSplitBi(key, "accident")) {
    split.accident = raw;
    return;
  }
  const target = coverageTargetForLabel(label);
  if (!target) return;
  setIfEmpty(out, target, raw);
}

function applyPolicyPeriod(out: LooseJson, raw: unknown) {
  if (isRecord(raw)) {
    setIfEmpty(out, "effective_date", pull(raw, ["from", "start", "effective", "effective_date", "eff"]));
    setIfEmpty(out, "expiration_date", pull(raw, ["to", "end", "expiration", "expiration_date", "exp"]));
    return;
  }
  if (typeof raw !== "string" && typeof raw !== "number") return;
  const split = splitPolicyPeriod(String(raw));
  if (split.effective) setIfEmpty(out, "effective_date", split.effective);
  if (split.expiration) setIfEmpty(out, "expiration_date", split.expiration);
}

const POLICY_ENVELOPES = [
  "current_policy",
  "current_policy_info",
  "policy_info",
  "policy_information",
  "prior_policy",
  "premiums",
  "premium_summary",
  "premium_information",
  "policy_premiums",
];

/**
 * Term total beats a coverage-line premium and a down-payment "amount due".
 * Higher rank wins. A bare `premium` string is only the fallback.
 */
const PREMIUM_RANK: Record<string, number> = {
  full_term_premium: 100,
  total_premium: 100,
  total_policy_premium: 100,
  total_premium_for_this_policy: 100,
  total_premium_for_the_policy: 100,
  premium_for_this_policy: 90,
  six_month_premium: 80,
  six_month_total_premium: 80,
  "6_month_premium": 80,
  "6_mo_premium": 80,
  "6_month_total_premium": 100,
  total_6_month_premium: 100,
  total_six_month_premium: 100,
  semi_annual_premium: 80,
  semiannual_premium: 80,
  premium_for_the_policy_period: 100,
  total_premium_for_the_policy_period: 100,
  total_full_term_premium: 100,
  full_term_premium_charges: 90,
  premium_total: 80,
  written_premium: 70,
  term_premium: 70,
  annual_premium: 70,
  total_annual_premium: 70,
  policy_premium: 70,
  your_premium: 60,
  current_premium: 60,
  premium_due: 50,
  total_premium_due: 50,
  amount_due: 40,
  premium: 10,
};

/** Exact ranks plus Travelers labels Gemini spells out ("6 Month Premium", "Premium for this policy"). */
function rankForPremiumKey(norm: string): number {
  if (!norm || norm === PREMIUM_RANK_KEY) return 0;
  const exact = PREMIUM_RANK[norm];
  if (exact) return exact;
  if (/bodily|property_damage|collision|comprehensive|uninsured|underinsured|pip|medical|towing|rental|towing/.test(norm)) {
    return 0;
  }
  if (/(?:^|_)(?:6|six)_months?(?:$|_)|(?:^|_)6_mo(?:$|_)/.test(norm) && /premium|total|charge/.test(norm)) {
    return /total|full/.test(norm) ? 100 : 80;
  }
  if (/full_term/.test(norm) && /premium|charge/.test(norm)) return 100;
  if (/total/.test(norm) && /premium/.test(norm)) return 100;
  if (/premium_for_(?:this|the)_policy/.test(norm)) return 90;
  if (norm === "total") return 100;
  return 0;
}

const PREMIUM_BOX_KEYS = new Set([
  "premium",
  "premiums",
  "premium_summary",
  "premium_information",
  "policy_premiums",
  "item_three",
]);

const PREMIUM_RANK_KEY = "__ffPremiumRank";

function currentPremiumRank(out: LooseJson): number {
  const stored = out[PREMIUM_RANK_KEY];
  if (typeof stored === "number") return stored;
  return hasPrinted(out.current_premium) ? 60 : 0;
}

function setPremiumIfBetter(out: LooseJson, raw: unknown, rank: number) {
  if (rank <= 0 || !hasPrinted(raw)) return;
  if (rank < currentPremiumRank(out)) return;
  if (rank === currentPremiumRank(out) && hasPrinted(out.current_premium)) return;
  out.current_premium = raw;
  out[PREMIUM_RANK_KEY] = rank;
}

/** Best printed term premium in this object. Does not delete keys. */
function bestPrintedPremium(node: LooseJson, depth = 0): { rank: number; raw: unknown } | null {
  let best: { rank: number; raw: unknown } | null = null;
  const consider = (rank: number, raw: unknown) => {
    if (rank <= 0 || !hasPrinted(raw)) return;
    if (!best || rank > best.rank) best = { rank, raw };
  };
  for (const [key, value] of Object.entries(node)) {
    const norm = normKey(key);
    if (norm === PREMIUM_RANK_KEY || norm === "__ffvehiclepremiums") continue;
    if (Array.isArray(value) && depth < 4) {
      if ((VEHICLE_LIST_KEYS as readonly string[]).includes(norm)) continue;
      for (const item of value) {
        if (!isRecord(item)) continue;
        const labelRank = rankForPremiumKey(normKey(scheduleLabel(item)));
        if (labelRank >= 50) consider(labelRank, scheduleAmount(item));
        const inner = bestPrintedPremium(item, depth + 1);
        if (inner && inner.rank >= 50) consider(inner.rank, inner.raw);
      }
      continue;
    }
    if (depth < 3 && isRecord(value) && PREMIUM_BOX_KEYS.has(norm)) {
      const inner = bestPrintedPremium(value, depth + 1);
      if (inner) consider(inner.rank, inner.raw);
      continue;
    }
    if (depth > 0 && (norm === "total" || norm === "amount")) consider(norm === "total" ? 100 : 45, value);
    consider(rankForPremiumKey(norm), value);
  }
  return best;
}

function absorbBestPremium(out: LooseJson, node: LooseJson) {
  const picked = bestPrintedPremium(node);
  if (picked) setPremiumIfBetter(out, picked.raw, picked.rank);
}

function stripLosingPremiumKeys(out: LooseJson) {
  if (!hasPrinted(out.current_premium)) return;
  for (const key of Object.keys(out)) {
    const norm = normKey(key);
    if (norm !== "current_premium" && PREMIUM_RANK[norm]) delete out[key];
  }
}

/** Nested carrier/policy blocks used to die in asPayload because the value is an object. */
function applyPolicyRecord(out: LooseJson, rec: LooseJson) {
  setIfEmpty(
    out,
    "current_carrier",
    pull(rec, [
      "current_carrier",
      "carrier",
      "carrier_name",
      "company_name",
      "insurance_name",
      "insurance_company",
      "insurer",
      "insurer_name",
      "named_insurer",
      "writing_company",
      "issuing_company",
      "underwriting_company",
      "insurance_carrier",
      "company",
    ]),
  );
  setIfEmpty(
    out,
    "policy_number",
    pull(rec, [
      "policy_number",
      "policy_no",
      "policy_num",
      "pol_no",
      "pol_number",
      "pol_num",
      "policy_id",
      "current_policy_id",
      "current_policy_number",
      "policy_id_number",
      "number",
    ]),
  );
  const nestedPolicy = pull(rec, ["policy"]);
  if (typeof nestedPolicy === "string" || typeof nestedPolicy === "number") {
    setIfEmpty(out, "policy_number", nestedPolicy);
  } else if (isRecord(nestedPolicy)) {
    applyPolicyRecord(out, nestedPolicy);
  }
  absorbBestPremium(out, rec);
  setIfEmpty(
    out,
    "years_with_carrier",
    pull(rec, ["years_with_carrier", "years_with_company", "years_insured", "years_with_insurer"]),
  );
  setIfEmpty(
    out,
    "effective_date",
    pull(rec, [
      "effective_date",
      "policy_effective_date",
      "effective",
      "eff_date",
      "eff",
      "inception_date",
      "from_date",
      "policy_period_from",
      "period_from",
      "from",
      "inception",
      "start_date",
    ]),
  );
  setIfEmpty(
    out,
    "expiration_date",
    pull(rec, [
      "expiration_date",
      "policy_expiration_date",
      "expiration",
      "exp_date",
      "exp",
      "to_date",
      "policy_period_to",
      "period_to",
      "to",
      "end_date",
    ]),
  );
  setIfEmpty(
    out,
    "currently_insured",
    pull(rec, ["currently_insured", "prior_insurance", "continuous_coverage"]),
  );
  setIfEmpty(out, "aaa_member", pull(rec, ["aaa_member", "aaa", "aaa_membership"]));
  applyPolicyPeriod(out, pull(rec, ["policy_period", "policy_term"]));
}

function takePolicyEnvelopes(out: LooseJson) {
  for (const key of POLICY_ENVELOPES) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      applyCoverages(out, raw);
      continue;
    }
    if (isRecord(raw)) applyPolicyRecord(out, { ...raw });
    else out[key] = raw;
  }
  if (isRecord(out.policy)) {
    const raw = pull(out, ["policy"]);
    if (isRecord(raw)) applyPolicyRecord(out, { ...raw });
  }
}

function applyLooseVehicle(out: LooseJson) {
  const raw = pull(out, ["vehicle", "covered_vehicle"]);
  if (raw == null) return;
  if (isRecord(raw)) {
    applyVehicle(out, { ...raw }, 0);
    return;
  }
  if (typeof raw !== "string" && typeof raw !== "number") return;
  const text = String(raw).trim();
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(text)) {
    setIfEmpty(out, "vin", text.toUpperCase());
    return;
  }
  const split = splitYearMakeModel(text);
  if (split.year) setIfEmpty(out, "vehicle_year", split.year);
  if (split.make) setIfEmpty(out, "vehicle_make", split.make);
  if (split.model) setIfEmpty(out, "vehicle_model", split.model);
}

function repairFlatDriverNames(out: LooseJson) {
  for (let n = 1; n <= 4; n++) {
    const key = `driver_${n}_name`;
    const item: LooseJson = {
      name: out[key],
      first_name: pull(out, [`driver_${n}_first_name`, `driver_${n}_first`, `driver_${n}_given_name`]),
      middle_name: pull(out, [
        `driver_${n}_middle_name`,
        `driver_${n}_middle`,
        `driver_${n}_middle_initial`,
        `driver_${n}_mi`,
      ]),
      last_name: pull(out, [`driver_${n}_last_name`, `driver_${n}_last`, `driver_${n}_surname`]),
    };
    const full = driverPrintedName(item);
    if (!full) continue;
    const current = textOf(out[key]).trim();
    if (!current || full.length > current.length) out[key] = full;
  }
}

function snapshotDriver(out: LooseJson, n: number): LooseJson {
  const snap: LooseJson = {};
  for (const part of AUTO_DRIVER_PARTS) {
    const value = out[`driver_${n}_${part}`];
    if (textOf(value).trim()) snap[part] = value;
  }
  return snap;
}

function clearDriver(out: LooseJson, n: number) {
  for (const part of AUTO_DRIVER_PARTS) delete out[`driver_${n}_${part}`];
}

function writeDriver(out: LooseJson, n: number, snap: LooseJson) {
  for (const part of AUTO_DRIVER_PARTS) {
    if (n === 1 && part === "relationship") continue;
    const value = snap[part];
    if (textOf(value).trim()) out[`driver_${n}_${part}`] = value;
  }
}

/** James listed as driver 2 and driver 3 with the same name and DOB collapses to one row. */
function dedupeDriverSlots(out: LooseJson) {
  const slots = [1, 2, 3, 4].map((n) => snapshotDriver(out, n));
  const kept = collapseDriverRecords(slots, (value) => textOf(value));
  for (let n = 1; n <= 4; n++) clearDriver(out, n);
  kept.forEach((snap, index) => writeDriver(out, index + 1, snap));
}

function nextDriverSlot(out: LooseJson): number {
  for (let n = 1; n <= 4; n++) {
    if (!textOf(out[`driver_${n}_name`]).trim()) return n - 1;
  }
  return 4;
}

function mergeIfListed(out: LooseJson, item: LooseJson): boolean {
  const person = {
    name: driverPrintedName(item),
    dob: fieldText(item, ["dob", "date_of_birth", "birth_date", "birthdate"]),
  };
  if (!normalizeAutoDriverName(person.name)) return false;
  for (let n = 1; n <= 4; n++) {
    if (
      !autoDriversSamePerson(
        textOf(out[`driver_${n}_name`]),
        textOf(out[`driver_${n}_dob`]),
        person.name,
        person.dob,
      )
    ) {
      continue;
    }
    const scratch: LooseJson = {};
    applyDriver(scratch, { ...item }, n - 1);
    const prefix = `driver_${n}_`;
    for (const part of AUTO_DRIVER_PARTS) {
      const key = `${prefix}${part}`;
      if (part === "name") {
        const longer = textOf(scratch[key]).trim();
        if (longer.length > textOf(out[key]).trim().length) out[key] = scratch[key];
        continue;
      }
      setIfEmpty(out, key, scratch[key]);
    }
    return true;
  }
  return false;
}

function applyDriverList(out: LooseJson, raw: unknown) {
  for (const item of asItemList(raw)) {
    const copy = { ...item };
    if (mergeIfListed(out, copy)) continue;
    applyDriver(out, copy, nextDriverSlot(out));
  }
}

function absorbPage(out: LooseJson, page: LooseJson) {
  for (const key of DRIVER_LIST_KEYS) {
    const raw = pull(page, [key]);
    if (raw != null) applyDriverList(out, raw);
  }
  for (const key of COVERAGE_LIST_KEYS) {
    const raw = pull(page, [key]);
    if (raw != null) applyCoverages(out, raw);
  }
  applyPolicyRecord(out, page);
  for (const [key, value] of Object.entries(page)) {
    if (coverageTargetForLabel(key)) applyCoverageEntry(out, key, value);
  }
}

/** Page 2 of a multi-page dec often holds the coverage table the summary page omits. */
function absorbLaterPages(out: LooseJson) {
  const bundles: LooseJson[] = [];
  for (const key of ["pages", "dec_pages"]) {
    const raw = pull(out, [key]);
    if (Array.isArray(raw)) {
      for (const page of raw) if (isRecord(page)) bundles.push({ ...page });
    } else if (isRecord(raw)) {
      for (const page of Object.values(raw)) if (isRecord(page)) bundles.push({ ...page });
    }
  }
  for (const key of ["page_2", "page_3", "second_page", "coverage_page"]) {
    const raw = pull(out, [key]);
    if (isRecord(raw)) bundles.push({ ...raw });
  }
  for (const page of bundles) absorbPage(out, page);
}

const VEHICLE_PREMIUMS_KEY = "__ffVehiclePremiums";

function rememberVehiclePremium(out: LooseJson, raw: unknown) {
  if (!hasPrinted(raw)) return;
  const list = Array.isArray(out[VEHICLE_PREMIUMS_KEY]) ? (out[VEHICLE_PREMIUMS_KEY] as unknown[]) : [];
  list.push(raw);
  out[VEHICLE_PREMIUMS_KEY] = list;
}

function moneyNumber(raw: unknown): number | null {
  const match = textOf(raw).replace(/[$,]/g, "").trim().match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Per-vehicle totals only fill the term premium when the policy total was not printed. */
function applyVehiclePremiumSum(out: LooseJson) {
  const list = out[VEHICLE_PREMIUMS_KEY];
  delete out[VEHICLE_PREMIUMS_KEY];
  if (currentPremiumRank(out) > 0 || !Array.isArray(list)) return;
  let cents = 0;
  let count = 0;
  for (const raw of list) {
    const n = moneyNumber(raw);
    if (n == null) continue;
    cents += Math.round(n * 100);
    count += 1;
  }
  if (!count || cents <= 0) return;
  const dollars = cents / 100;
  setPremiumIfBetter(out, Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2), 75);
}

const POLICY_BLOCK_KEYS = new Set([
  "policy_number",
  "policy_no",
  "policy_num",
  "pol_no",
  "pol_number",
  "effective_date",
  "expiration_date",
  "policy_effective_date",
  "policy_expiration_date",
  "policy_period",
  "policy_term",
  "policy_period_from",
  "policy_period_to",
  "full_term_premium",
  "total_premium",
  "total_policy_premium",
  "current_premium",
  "6_month_premium",
  "six_month_premium",
]);

function looksLikePolicyBlock(rec: LooseJson): boolean {
  const keys = Object.keys(rec).map(normKey);
  if (keys.some((key) => POLICY_BLOCK_KEYS.has(key) || rankForPremiumKey(key) >= 50)) return true;
  const set = new Set(keys);
  const hasFrom = set.has("from") || set.has("policy_period_from") || set.has("period_from");
  const hasTo = set.has("to") || set.has("policy_period_to") || set.has("period_to");
  return hasFrom && hasTo;
}

/** Declarations / item-two blocks Gemini nests under a name we did not list as an envelope. */
function absorbLoosePolicyBlocks(out: LooseJson) {
  const skip = new Set<string>([...VEHICLE_LIST_KEYS, ...DRIVER_LIST_KEYS, ...COVERAGE_LIST_KEYS, "pages", "dec_pages"]);
  for (const [key, value] of Object.entries(out)) {
    const norm = normKey(key);
    if (!isRecord(value) || skip.has(norm) || norm === PREMIUM_RANK_KEY) continue;
    if (!looksLikePolicyBlock(value)) continue;
    applyPolicyRecord(out, { ...value });
  }
}

function finalizePolicyDates(out: LooseJson) {
  const effectiveText = textOf(out.effective_date).trim();
  const split = effectiveText ? splitPolicyPeriod(effectiveText) : {};
  if (split.effective && split.expiration) {
    out.effective_date = split.effective;
    const expirationText = textOf(out.expiration_date).trim();
    const expirationSplit = expirationText ? splitPolicyPeriod(expirationText) : {};
    if (!expirationText || expirationSplit.effective) out.expiration_date = split.expiration;
  }
  for (const key of ["effective_date", "expiration_date"] as const) {
    const text = textOf(out[key]).trim();
    if (!text) continue;
    const cleaned = stripPolicyClocks(text);
    if (cleaned) out[key] = cleaned;
  }
}

/** Flatten ACORD / carrier auto-dec JSON onto Auto risk-profile keys. */
export function expandAutoDecLayout(json: LooseJson, shopLine?: string | null): LooseJson {
  const out: LooseJson = { ...unwrapEnvelope(json) };
  if (!looksLikeAuto(out, shopLine)) return out;

  for (const key of VEHICLE_LIST_KEYS) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    asItemList(raw).forEach((item, index) => applyVehicle(out, { ...item }, index));
  }
  repairFlatDriverNames(out);
  for (const key of DRIVER_LIST_KEYS) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    applyDriverList(out, raw);
  }
  for (const key of COVERAGE_LIST_KEYS) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    applyCoverages(out, raw);
  }
  absorbLaterPages(out);

  applyPolicyPeriod(out, pull(out, ["policy_period", "policy_term"]));

  const description = pull(out, ["description", "vehicle_description", "year_make_model"]);
  if (typeof description === "string") {
    const split = splitYearMakeModel(description);
    if (split.year) setIfEmpty(out, "vehicle_year", split.year);
    if (split.make) setIfEmpty(out, "vehicle_make", split.make);
    if (split.model) setIfEmpty(out, "vehicle_model", split.model);
  }

  setIfEmpty(out, "vehicle_year", pull(out, ["year", "model_year"]));
  setIfEmpty(out, "vehicle_make", pull(out, ["make"]));
  setIfEmpty(out, "vehicle_model", pull(out, ["model"]));
  applyLooseVehicle(out);
  setIfEmpty(
    out,
    "vin",
    pull(out, [
      "vehicle_identification_number",
      "vehicle_vin",
      "v_i_n",
      "vin_number",
      "vin_no",
      "vehicle_identification_no",
    ]),
  );
  setIfEmpty(out, "driver_1_name", pull(out, ["driver_name"]));
  setIfEmpty(out, "driver_1_dob", pull(out, ["date_of_birth", "birth_date"]));
  setIfEmpty(
    out,
    "driver_1_license",
    pull(out, ["drivers_license", "driver_license", "dl_number"]),
  );
  absorbBestPremium(out, out);
  setIfEmpty(
    out,
    "current_carrier",
    pull(out, [
      "writing_company",
      "insurer",
      "insurance_company",
      "insurance_name",
      "named_insurer",
      "insurance_carrier",
      "issuing_company",
      "underwriting_company",
      "insurer_name",
      "company",
    ]),
  );
  setIfEmpty(
    out,
    "policy_number",
    pull(out, [
      "current_policy_id",
      "current_policy_number",
      "policy_id_number",
    ]),
  );
  setIfEmpty(
    out,
    "years_with_carrier",
    pull(out, ["years_with_company", "years_insured", "years_with_insurer"]),
  );
  setIfEmpty(out, "aaa_member", pull(out, ["aaa", "aaa_membership"]));
  takePolicyEnvelopes(out);
  repairFlatDriverNames(out);
  dedupeDriverSlots(out);
  applyCoverageEntry(
    out,
    "bodily_injury",
    pull(out, [
      "bodily_injury",
      "bodily_injury_liability",
      "liability_bodily_injury",
      "bi_limits",
      "bi_limit",
    ]),
  );
  applyCoverageEntry(
    out,
    "property_damage",
    pull(out, ["property_damage", "property_damage_liability", "pd_limit"]),
  );
  applyCoverageEntry(
    out,
    "uninsured_motorist",
    pull(out, [
      "uninsured_motorist",
      "uninsured_motorists",
      "underinsured_motorist",
      "uninsured_motorist_bodily_injury",
      "underinsured_motorist_bodily_injury",
    ]),
  );
  applyCoverageEntry(out, "pip", pull(out, ["personal_injury_protection"]));
  applyCoverageEntry(out, "comprehensive", pull(out, ["comprehensive", "other_than_collision", "otc"]));
  applyCoverageEntry(out, "collision", pull(out, ["collision", "collision_coverage"]));
  if (!hasPrinted(out.liability_bi)) {
    const person = pull(out, [
      "bodily_injury_each_person",
      "bi_each_person",
      "bi_per_person",
      "bodily_injury_per_person",
    ]);
    const accident = pull(out, [
      "bodily_injury_each_accident",
      "bi_each_accident",
      "bi_per_accident",
      "bodily_injury_per_accident",
    ]);
    const personText = textOf(person).trim();
    const accidentText = textOf(accident).trim();
    if (personText && accidentText) setIfEmpty(out, "liability_bi", `${personText}/${accidentText}`);
    else if (personText) setIfEmpty(out, "liability_bi", personText);
    else if (accidentText) setIfEmpty(out, "liability_bi", accidentText);
  }

  setIfEmpty(out, "effective_date", pull(out, ["policy_effective_date", "policy_period_from", "from_date"]));
  setIfEmpty(out, "expiration_date", pull(out, ["policy_expiration_date", "policy_period_to", "to_date"]));
  absorbLoosePolicyBlocks(out);
  finalizePolicyDates(out);
  absorbBestPremium(out, out);
  applyVehiclePremiumSum(out);
  stripLosingPremiumKeys(out);
  delete out[PREMIUM_RANK_KEY];
  delete out[VEHICLE_PREMIUMS_KEY];

  if (typeof out.current_premium === "string") {
    const digits = out.current_premium.replace(/[$,]/g, "").trim();
    if (digits) out.current_premium = digits;
  }

  return out;
}
