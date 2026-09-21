/**
 * Gemini vision on a phone photo of an auto dec often ignores the flat key list and
 * returns either bare strings or a nested ACORD-style object (vehicles[], drivers[],
 * coverages{}). Bare strings used to land at confidence 0.5, under the 0.8 fill
 * threshold, and nested blocks were dropped — so Fill Risk Profile wrote nothing.
 * This flattens that shape onto the real Auto risk-profile keys before mapping.
 */

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

export function splitPolicyPeriod(text: string): { effective?: string; expiration?: string } {
  const match = text.match(
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:to|through|-|–|—)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
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

function applyDriver(out: LooseJson, item: LooseJson, index: number) {
  if (index > 3) return;
  const n = index + 1;
  const prefix = `driver_${n}_`;
  setIfEmpty(out, `${prefix}name`, pull(item, ["name", "driver_name", "full_name"]));
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
  const inner = raw.value ?? raw.text;
  if (typeof inner === "string" || typeof inner === "number") return String(inner);
  return "";
}

function applyCoverages(out: LooseJson, raw: unknown) {
  const items = Array.isArray(raw) ? raw : isRecord(raw) ? [raw] : [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const label = textOf(pull(item, ["name", "coverage", "type", "label"]));
    const limit = pull(item, ["limit", "value", "amount", "deductible"]);
    if (label && Object.keys(item).length === 0) {
      applyCoverageEntry(out, label, limit ?? label);
      continue;
    }
    if (label && limit != null) applyCoverageEntry(out, label, limit);
    for (const [key, value] of Object.entries(item)) {
      applyCoverageEntry(out, key, value);
    }
  }
}

function applyCoverageEntry(out: LooseJson, label: string, raw: unknown) {
  const key = normKey(label);
  const target =
    key === "bodily_injury" ||
    key === "bodily_injury_liability" ||
    key === "bi" ||
    key === "bi_limits" ||
    key === "bi_limit" ||
    key === "liability_bi"
      ? "liability_bi"
      : key === "property_damage" ||
          key === "property_damage_liability" ||
          key === "pd" ||
          key === "pd_limit" ||
          key === "liability_pd"
        ? "liability_pd"
        : key === "uninsured_motorist" ||
            key === "uninsured_motorists" ||
            key === "underinsured_motorist" ||
            key === "underinsured_motorists" ||
            key === "um" ||
            key === "uim" ||
            key === "um_uim" ||
            key === "umbi"
          ? "um_uim"
          : key === "personal_injury_protection" || key === "pip" || key === "pip_limit"
            ? "pip"
            : key === "comprehensive" ||
                key === "comprehensive_deductible" ||
                key === "other_than_collision" ||
                key === "otc" ||
                key === "comp_deductible"
              ? "comp_deductible"
              : key === "collision" || key === "collision_deductible"
                ? "collision_deductible"
                : null;
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

/** Flatten ACORD / carrier auto-dec JSON onto Auto risk-profile keys. */
export function expandAutoDecLayout(json: LooseJson, shopLine?: string | null): LooseJson {
  const out: LooseJson = { ...unwrapEnvelope(json) };
  if (!looksLikeAuto(out, shopLine)) return out;

  for (const key of VEHICLE_LIST_KEYS) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    asItemList(raw).forEach((item, index) => applyVehicle(out, { ...item }, index));
  }
  for (const key of DRIVER_LIST_KEYS) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    asItemList(raw).forEach((item, index) => applyDriver(out, { ...item }, index));
  }
  for (const key of COVERAGE_LIST_KEYS) {
    const raw = pull(out, [key]);
    if (raw == null) continue;
    applyCoverages(out, raw);
  }

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
  setIfEmpty(out, "vin", pull(out, ["vehicle_identification_number", "vehicle_vin"]));
  setIfEmpty(out, "driver_1_name", pull(out, ["driver_name"]));
  setIfEmpty(out, "driver_1_dob", pull(out, ["date_of_birth", "birth_date"]));
  setIfEmpty(
    out,
    "driver_1_license",
    pull(out, ["drivers_license", "driver_license", "dl_number"]),
  );
  setIfEmpty(out, "current_premium", pull(out, ["total_policy_premium", "six_month_premium", "premium_total"]));
  setIfEmpty(out, "current_carrier", pull(out, ["writing_company", "insurer", "insurance_company"]));
  applyCoverageEntry(out, "bodily_injury", pull(out, ["bodily_injury", "bodily_injury_liability", "bi_limits", "bi_limit"]));
  applyCoverageEntry(out, "property_damage", pull(out, ["property_damage", "property_damage_liability", "pd_limit"]));
  applyCoverageEntry(
    out,
    "uninsured_motorist",
    pull(out, ["uninsured_motorist", "uninsured_motorists", "underinsured_motorist"]),
  );
  applyCoverageEntry(out, "pip", pull(out, ["personal_injury_protection"]));
  applyCoverageEntry(out, "comprehensive", pull(out, ["comprehensive", "other_than_collision", "otc"]));
  applyCoverageEntry(out, "collision", pull(out, ["collision"]));

  const effective = out.effective_date;
  if (typeof effective === "string" && !hasPrinted(out.expiration_date)) {
    const split = splitPolicyPeriod(effective);
    if (split.effective && split.expiration) {
      out.effective_date = split.effective;
      out.expiration_date = split.expiration;
    }
  }

  if (typeof out.current_premium === "string") {
    const digits = out.current_premium.replace(/[$,]/g, "").trim();
    if (digits) out.current_premium = digits;
  }

  return out;
}
