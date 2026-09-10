/**
 * Auto premium-learning datasheet — parallel to Home Appetite Log.
 * Home = decline / don’t-write (roof, water, coast).
 * Auto = premiums higher/lower by vehicle, driver, city, driving record.
 * Site developers only (FF_SITE_DEVELOPER_EMAILS / is_site_developer).
 */
import type { AutoFeatureSnapshot, Carrier, Deal, Quote, QuoteAttemptLog, Risk } from "@/lib/db/schema";
import type { QuoteSheetFieldValue } from "@/lib/domain";

export const AUTO_PREMIUM_LINE_VALUES = ["AUTO", "PA", "PERSONAL_AUTO"] as const;

export function isAutoPremiumLine(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const upper = raw.trim().toUpperCase();
  return (AUTO_PREMIUM_LINE_VALUES as readonly string[]).includes(upper);
}

export type AutoPremiumLearningRow = {
  log: QuoteAttemptLog;
  carrier: Carrier;
  deal: Deal;
  risk: Risk | null;
  quote: Quote | null;
};

export type AutoPremiumDatasheetFilters = {
  carrierId?: string;
  city?: string;
  vehicleYearMin?: number;
  vehicleYearMax?: number;
};

export const AUTO_PREMIUM_DATASHEET_HEADERS = [
  "Date",
  "Carrier",
  "Premium",
  "Result",
  "Bindable",
  "Quote #",
  "State",
  "City",
  "ZIP",
  "Driver age",
  "Gender",
  "Vehicle year",
  "Make",
  "Model",
  "VIN",
  "Ownership",
  "Annual miles",
  "Usage",
  "Rideshare",
  "Commute days",
  "Accidents 3yr",
  "Violations 3yr",
  "Deal",
] as const;

/** Keys pulled from Auto master sheet into the learning snapshot. */
export const AUTO_SNAPSHOT_SHEET_KEYS = [
  "driver_1_gender",
  "driver_1_dob",
  "applicant_dob",
  "applicant_gender",
  "gender",
  "state",
  "city",
  "zip",
  "county",
  "garaging_zip",
  "vin",
  "vehicle_year",
  "vehicle_make",
  "vehicle_model",
  "vehicle_ownership",
  "vehicle_ownership_length",
  "annual_miles",
  "vehicle_usage",
  "rideshare",
  "commute_days_week",
  "accidents_3yr",
  "violations_3yr",
  "clean_record",
  "own_rent",
] as const;

export function sheetCell(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
  key: string,
): string | null {
  const raw = values?.[key]?.value?.trim();
  return raw ? raw : null;
}

export function parseSheetNumber(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Age in whole years from DOB string (M/D/YYYY or ISO). */
export function ageFromDob(dob: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!dob?.trim()) return null;
  const cleaned = dob.trim();
  let y: number;
  let m: number;
  let d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(cleaned);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else if (us) {
    m = Number(us[1]);
    d = Number(us[2]);
    y = Number(us[3]);
  } else {
    const dt = new Date(cleaned);
    if (Number.isNaN(dt.getTime())) return null;
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }
  if (!y || !m || !d) return null;
  let age = asOf.getFullYear() - y;
  const beforeBirthday =
    asOf.getMonth() + 1 < m || (asOf.getMonth() + 1 === m && asOf.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

/** ±3 year band label for similarity matching. */
export function vehicleYearBand(year: number | null | undefined): string | null {
  if (year == null || !Number.isFinite(year)) return null;
  const base = Math.floor(year / 3) * 3;
  return `${base}-${base + 2}`;
}

/** Decade age band (20s, 30s, …). */
export function ageBand(age: number | null | undefined): string | null {
  if (age == null || !Number.isFinite(age) || age < 0) return null;
  const decade = Math.floor(age / 10) * 10;
  return `${decade}s`;
}

export function buildAutoFeatureSnapshot(input: {
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  risk?: Partial<Risk> | null;
  capturedAt?: Date;
}): AutoFeatureSnapshot {
  const values = input.sheetValues ?? {};
  const risk = input.risk ?? null;
  const capturedAt = input.capturedAt ?? new Date();
  const driverDob =
    sheetCell(values, "driver_1_dob") ||
    sheetCell(values, "applicant_dob") ||
    null;
  const driverGender =
    sheetCell(values, "driver_1_gender") ||
    sheetCell(values, "applicant_gender") ||
    sheetCell(values, "gender") ||
    null;
  const vehicleYear =
    parseSheetNumber(sheetCell(values, "vehicle_year")) ?? risk?.vehicleYear ?? null;

  return {
    schemaVersion: 1,
    capturedAt: capturedAt.toISOString(),
    driverGender,
    driverDob,
    driverAge: ageFromDob(driverDob, capturedAt),
    state: sheetCell(values, "state") || risk?.state || null,
    city: sheetCell(values, "city") || risk?.city || null,
    zip: sheetCell(values, "zip") || risk?.zip || null,
    county: sheetCell(values, "county") || risk?.county || null,
    garagingZip:
      sheetCell(values, "garaging_zip") || risk?.garagingZip || null,
    vin: sheetCell(values, "vin") || risk?.vin || null,
    vehicleYear,
    vehicleMake: sheetCell(values, "vehicle_make") || risk?.vehicleMake || null,
    vehicleModel: sheetCell(values, "vehicle_model") || risk?.vehicleModel || null,
    ownership: sheetCell(values, "vehicle_ownership"),
    ownershipLength: sheetCell(values, "vehicle_ownership_length"),
    annualMiles: sheetCell(values, "annual_miles"),
    usage: sheetCell(values, "vehicle_usage") || risk?.vehicleUsage || null,
    rideshare: sheetCell(values, "rideshare"),
    commuteDaysWeek: sheetCell(values, "commute_days_week"),
    accidents3yr: sheetCell(values, "accidents_3yr"),
    violations3yr: sheetCell(values, "violations_3yr"),
    cleanRecord: sheetCell(values, "clean_record"),
    ownRent: sheetCell(values, "own_rent"),
  };
}

/** Snapshot shape contract for tests / writers. */
export function assertAutoFeatureSnapshotShape(snap: AutoFeatureSnapshot): string[] {
  const errors: string[] = [];
  if (snap.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!snap.capturedAt || Number.isNaN(Date.parse(snap.capturedAt))) {
    errors.push("capturedAt must be ISO date");
  }
  return errors;
}

export function parseAutoPremiumDatasheetFilters(
  query: Record<string, string | string[] | undefined>,
): AutoPremiumDatasheetFilters {
  const one = (key: string) => {
    const v = query[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const num = (key: string) => {
    const raw = one(key);
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    carrierId: one("carrier"),
    city: one("city"),
    vehicleYearMin: num("yearMin"),
    vehicleYearMax: num("yearMax"),
  };
}

export function filtersToSearchParams(filters: AutoPremiumDatasheetFilters): string {
  const params = new URLSearchParams();
  if (filters.carrierId) params.set("carrier", filters.carrierId);
  if (filters.city) params.set("city", filters.city);
  if (filters.vehicleYearMin != null) params.set("yearMin", String(filters.vehicleYearMin));
  if (filters.vehicleYearMax != null) params.set("yearMax", String(filters.vehicleYearMax));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function snapFromLog(log: QuoteAttemptLog): AutoFeatureSnapshot | null {
  const snap = log.autoFeatureSnapshot;
  if (!snap || typeof snap !== "object") return null;
  return snap;
}

export function datasheetDisplay(row: AutoPremiumLearningRow) {
  const snap = snapFromLog(row.log);
  return {
    date: row.log.attemptedAt.toISOString().slice(0, 10),
    carrier: row.carrier.name,
    premium: row.log.premium,
    result: row.log.result.replaceAll("_", " "),
    bindable: row.log.bindable ? "Y" : "N",
    quoteNumber: row.log.quoteNumber?.trim() || "",
    state: snap?.state || row.risk?.state || "",
    city: snap?.city || row.log.snapCity || row.risk?.city || "",
    zip: snap?.zip || row.risk?.zip || "",
    driverAge: snap?.driverAge != null ? String(snap.driverAge) : "",
    gender: snap?.driverGender || "",
    vehicleYear: snap?.vehicleYear != null ? String(snap.vehicleYear) : "",
    make: snap?.vehicleMake || "",
    model: snap?.vehicleModel || "",
    vin: snap?.vin || "",
    ownership: snap?.ownership || "",
    annualMiles: snap?.annualMiles || "",
    usage: snap?.usage || "",
    rideshare: snap?.rideshare || "",
    commuteDays: snap?.commuteDaysWeek || "",
    accidents: snap?.accidents3yr || "",
    violations: snap?.violations3yr || "",
    dealHref: `/deals/${row.deal.id}`,
    dealTitle: row.deal.title,
  };
}

export function summarizeAutoPremiumRows(rows: AutoPremiumLearningRow[]) {
  const carriers = new Set<string>();
  const deals = new Set<string>();
  let withPremium = 0;
  let withSnapshot = 0;
  for (const row of rows) {
    carriers.add(row.carrier.id);
    deals.add(row.deal.id);
    if (row.log.premium != null && String(row.log.premium).trim() !== "") withPremium += 1;
    if (snapFromLog(row.log)) withSnapshot += 1;
  }
  return {
    total: rows.length,
    distinctCarriers: carriers.size,
    distinctDeals: deals.size,
    withPremium,
    withSnapshot,
  };
}

export type AutoPremiumHistoryRow = {
  carrierId: string;
  carrierName: string;
  premium: number;
  snapshot: AutoFeatureSnapshot;
};

export type RankedAutoCarrier = {
  carrierId: string;
  carrierName: string;
  medianPremium: number | null;
  sampleSize: number;
  /** Always shadow until sample size grows — stub ranking. */
  mode: "shadow";
  similarity: "state+yearBand+ageBand" | "state+yearBand" | "state" | "none";
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function similarEnough(
  target: AutoFeatureSnapshot,
  candidate: AutoFeatureSnapshot,
): RankedAutoCarrier["similarity"] | null {
  const tState = target.state?.trim().toUpperCase();
  const cState = candidate.state?.trim().toUpperCase();
  if (!tState || !cState || tState !== cState) return null;
  const tYear = vehicleYearBand(target.vehicleYear);
  const cYear = vehicleYearBand(candidate.vehicleYear);
  const tAge = ageBand(target.driverAge);
  const cAge = ageBand(candidate.driverAge);
  if (tYear && cYear && tYear === cYear && tAge && cAge && tAge === cAge) {
    return "state+yearBand+ageBand";
  }
  if (tYear && cYear && tYear === cYear) return "state+yearBand";
  return "state";
}

/**
 * Shadow/stub ranking: carriers sorted by historical median premium among similar risks
 * (same state + vehicle year band + age band when available). Marked shadow until N grows.
 */
export function rankCarriersByHistoricalMedianPremium(
  target: AutoFeatureSnapshot,
  history: AutoPremiumHistoryRow[],
  opts?: { minSample?: number },
): RankedAutoCarrier[] {
  const minSample = opts?.minSample ?? 3;
  const byCarrier = new Map<
    string,
    { name: string; premiums: number[]; bestSim: RankedAutoCarrier["similarity"] }
  >();

  for (const row of history) {
    if (!Number.isFinite(row.premium) || row.premium <= 0) continue;
    const sim = similarEnough(target, row.snapshot);
    if (!sim) continue;
    const cur = byCarrier.get(row.carrierId) ?? {
      name: row.carrierName,
      premiums: [],
      bestSim: sim,
    };
    cur.premiums.push(row.premium);
    // Prefer tighter similarity label when present
    if (sim === "state+yearBand+ageBand") cur.bestSim = sim;
    else if (sim === "state+yearBand" && cur.bestSim === "state") cur.bestSim = sim;
    byCarrier.set(row.carrierId, cur);
  }

  const ranked: RankedAutoCarrier[] = [...byCarrier.entries()].map(([carrierId, v]) => ({
    carrierId,
    carrierName: v.name,
    medianPremium: median(v.premiums),
    sampleSize: v.premiums.length,
    mode: "shadow" as const,
    similarity: v.premiums.length >= minSample ? v.bestSim : "none",
  }));

  ranked.sort((a, b) => {
    if (a.medianPremium == null && b.medianPremium == null) return a.carrierName.localeCompare(b.carrierName);
    if (a.medianPremium == null) return 1;
    if (b.medianPremium == null) return -1;
    if (a.medianPremium !== b.medianPremium) return a.medianPremium - b.medianPremium;
    return b.sampleSize - a.sampleSize;
  });
  return ranked;
}
