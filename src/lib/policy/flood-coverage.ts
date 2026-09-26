/**
 * Selective Flood / NFIP coverage and rating.
 * Building is the NFIP "Coverage A" amount. Contents is "Coverage C".
 * Those are not HO3 Coverage A–F. Loss of use and one extra row appear only
 * when the declaration prints them.
 */

import { appointmentLine } from "@/lib/domain-ams";
import type { PolicyCoverageLine } from "@/lib/db/schema";
import {
  formatCoverageLinePremium,
  formatHomeDeductibleAmount,
  formatHomeDollarAmount,
} from "@/lib/extraction/gemini/home-dollar";

export type FloodPolicyIdentity = {
  lineOfBusiness?: string | null;
  policyType?: string | null;
  insuranceType?: string | null;
  policySubType?: string | null;
  formType?: string | null;
};

const FLOOD_LINE = new Set(["FLOOD", "NFIP"]);

function cleanToken(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/** FLD when the form or policy number is the Selective / NFIP FLD program. Otherwise Flood. */
export function floodFormCodeFromText(...parts: Array<string | null | undefined>): "FLD" | "Flood" {
  for (const part of parts) {
    const text = cleanToken(part).toUpperCase();
    if (!text) continue;
    if (/\bFLD(?:\d|\b)/.test(text)) return "FLD";
  }
  return "Flood";
}

function isFloodProductToken(raw: string | null | undefined): boolean {
  const text = cleanToken(raw);
  if (!text) return false;
  const upper = text.toUpperCase();
  if (FLOOD_LINE.has(upper) || upper === "FLD") return true;
  if (/^FLOOD$/.test(upper) || /^SELECTIVE FLOOD$/.test(upper)) return true;
  if (/\bNFIP\b/.test(upper) && !/\bHO\b|HOMEOWNER/.test(upper)) return true;
  return false;
}

/** Product or line is flood. An HO3 form is not flood unless the line itself is. */
export function isFloodPolicy(input: FloodPolicyIdentity): boolean {
  const line = appointmentLine(input.lineOfBusiness ?? "");
  if (FLOOD_LINE.has(line)) return true;
  return [input.formType, input.policySubType, input.policyType, input.insuranceType].some(
    isFloodProductToken,
  );
}

export type FloodRatingFacts = {
  buildingOccupancy: string | null;
  numberOfUnits: string | null;
  primaryResidence: string | null;
  propertyDescription: string | null;
  priorNfipClaims: string | null;
  dateOfConstruction: string | null;
  floodZone: string | null;
  firstFloorHeight: string | null;
  ffhMethod: string | null;
  buildingDescription: string | null;
};

function pickLimit(
  limits: Record<string, string> | null | undefined,
  ...keys: string[]
): string | null {
  if (!limits) return null;
  for (const key of keys) {
    const value = limits[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function floodRatingFromLimits(
  limits: Record<string, string> | null | undefined,
): FloodRatingFacts {
  return {
    buildingOccupancy: pickLimit(limits, "flood_building_occupancy", "building_occupancy"),
    numberOfUnits: pickLimit(limits, "flood_number_of_units", "number_of_units"),
    primaryResidence: pickLimit(limits, "flood_primary_residence", "primary_residence"),
    propertyDescription: pickLimit(limits, "flood_property_description", "property_description"),
    priorNfipClaims: pickLimit(limits, "flood_prior_nfip_claims", "prior_nfip_claims"),
    dateOfConstruction: pickLimit(limits, "flood_date_of_construction", "date_of_construction"),
    floodZone: pickLimit(limits, "flood_zone", "current_flood_zone"),
    firstFloorHeight: pickLimit(limits, "flood_first_floor_height", "first_floor_height", "ffh"),
    ffhMethod: pickLimit(
      limits,
      "flood_ffh_method",
      "ffh_method",
      "most_favorable_ffh_method",
    ),
    buildingDescription: pickLimit(
      limits,
      "flood_building_description_detail",
      "building_description_detail",
    ),
  };
}

/** HO3 schedule rows that must not stay on a flood policy after Fill. */
const HOME_TEMPLATE_LIMIT_KEYS = [
  "coverage_b",
  "coverage_b_premium",
  "coverage_e",
  "coverage_e_premium",
  "coverage_f",
  "coverage_f_premium",
  "ordinance_or_law",
  "ordinance_or_law_premium",
  "water_backup",
  "water_backup_premium",
  "personal_injury",
  "personal_injury_premium",
  "home_computer",
  "home_computer_premium",
  "theft",
  "sinkhole_deductible",
  "aop_deductible",
  "hurricane_deductible",
  "wind_hail_deductible",
  "dwelling_replacement_cost",
  "personal_property_replacement_cost",
  "personal_property_replacement_cost_premium",
  "extended_replacement_cost_dwelling",
  "loss_assessment",
  "loss_assessment_premium",
  "limited_fungi",
  "limited_fungi_premium",
  "unit_owners_coverage_a",
  "unit_owners_coverage_a_premium",
  "catastrophic_ground_cover_collapse",
  "catastrophic_ground_cover_collapse_premium",
  "type_of_residence",
  "months_occupied",
  "dwelling_type",
  "number_of_families",
  "screen_enclosure",
] as const;

/**
 * Keep flood rating and flood coverage. Drop HO3 B/E/F and optionals.
 * Legacy Coverage A/C/D keys stay only until the flood row replaced them.
 */
export function floodCoverageLimitsAfterFill(
  existing: Record<string, string> | null | undefined,
  incoming: Record<string, string>,
): Record<string, string> {
  const merged: Record<string, string> = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    const trimmed = value?.trim();
    if (trimmed) merged[key] = trimmed;
  }
  for (const key of HOME_TEMPLATE_LIMIT_KEYS) delete merged[key];
  if (merged.flood_building || merged.flood_building_premium) {
    delete merged.coverage_a;
    delete merged.coverage_a_premium;
  }
  if (merged.flood_contents || merged.flood_contents_premium) {
    delete merged.coverage_c;
    delete merged.coverage_c_premium;
  }
  if (merged.flood_loss_of_use || merged.flood_loss_of_use_premium) {
    delete merged.coverage_d;
    delete merged.coverage_d_premium;
  }
  return merged;
}

export type FloodCoverageScheduleRow = {
  key: string;
  label: string;
  limit: string;
  deductible: string;
  premium: string;
};

type Bucket = "building" | "contents" | "loss_of_use" | "icc" | "debris";

const BUCKET_LABEL: Record<Bucket, string> = {
  building: "Building",
  contents: "Contents",
  loss_of_use: "Loss of use",
  icc: "Increased cost of compliance",
  debris: "Debris removal",
};

type Cell = { limit: string; deductible: string; premium: string };

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[%$#]+/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function bucketFor(key: string): Bucket | null {
  if (
    key === "coverage_a" ||
    key === "building" ||
    key === "flood_building" ||
    key === "building_limit" ||
    key === "building_coverage" ||
    key === "building_property" ||
    key === "dwelling" ||
    key === "dwelling_limit"
  ) {
    return "building";
  }
  if (
    key === "coverage_c" ||
    key === "contents" ||
    key === "flood_contents" ||
    key === "contents_limit" ||
    key === "personal_property"
  ) {
    return "contents";
  }
  if (
    key === "coverage_d" ||
    key === "loss_of_use" ||
    key === "flood_loss_of_use" ||
    key === "additional_living_expense" ||
    key === "ale"
  ) {
    return "loss_of_use";
  }
  if (key === "increased_cost_of_compliance" || key === "icc" || key === "flood_icc") return "icc";
  if (key === "debris_removal" || key === "debris" || key === "flood_debris") return "debris";
  return null;
}

function bucketForLabel(label: string): Bucket | null {
  const key = normalizeKey(label);
  if (!key) return null;
  if (key === "coverage_a" || key === "building" || key === "building_property") return "building";
  if (key === "coverage_c" || key === "contents" || key === "personal_property") return "contents";
  if (key === "coverage_d" || key === "loss_of_use" || key === "additional_living_expense") {
    return "loss_of_use";
  }
  if (key === "icc" || key.includes("increased_cost_of_compliance")) return "icc";
  if (key.includes("debris")) return "debris";
  return null;
}

function showMoney(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return "";
  return formatHomeDollarAmount(trimmed) || trimmed;
}

function showPremium(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return "";
  return formatCoverageLinePremium(trimmed) || trimmed;
}

function showDeductible(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return "";
  return formatHomeDeductibleAmount(trimmed) || trimmed;
}

function blankCell(): Cell {
  return { limit: "", deductible: "", premium: "" };
}

/**
 * At most four rows: Building, Contents, Loss of use when printed, and one
 * extra (increased cost of compliance, else debris removal).
 */
export function floodCoverageSchedule(input: {
  coverageA?: number | null;
  coverageLimits?: Record<string, string> | null;
  coverages?: PolicyCoverageLine[] | Record<string, string> | null;
}): FloodCoverageScheduleRow[] {
  const cells = new Map<Bucket, Cell>();
  const cellFor = (bucket: Bucket): Cell => {
    const existing = cells.get(bucket);
    if (existing) return existing;
    const created = blankCell();
    cells.set(bucket, created);
    return created;
  };

  const setLimit = (bucket: Bucket, value: string) => {
    const shown = showMoney(value);
    if (!shown) return;
    const cell = cellFor(bucket);
    if (!cell.limit) cell.limit = shown;
  };
  const setPremium = (bucket: Bucket, value: string) => {
    const shown = showPremium(value);
    if (!shown) return;
    const cell = cellFor(bucket);
    if (!cell.premium) cell.premium = shown;
  };
  const setDeductible = (bucket: Bucket, value: string) => {
    const shown = showDeductible(value);
    if (!shown) return;
    const cell = cellFor(bucket);
    if (!cell.deductible) cell.deductible = shown;
  };

  const applyKey = (rawKey: string, rawValue: string, label = "") => {
    let key = normalizeKey(rawKey);
    let part: "limit" | "premium" | "deductible" = "limit";
    if (key.endsWith("_premium")) {
      part = "premium";
      key = key.slice(0, -"_premium".length);
    } else if (key.endsWith("_deductible")) {
      part = "deductible";
      key = key.slice(0, -"_deductible".length);
    }
    const bucket = bucketFor(key) ?? bucketForLabel(label);
    if (!bucket) return;
    if (part === "premium") setPremium(bucket, rawValue);
    else if (part === "deductible") setDeductible(bucket, rawValue);
    else setLimit(bucket, rawValue);
  };

  const limits = input.coverageLimits ?? {};
  const entries = Object.entries(limits).sort((a, b) => {
    const rank = (key: string) => (key.startsWith("flood_") ? 0 : 1);
    return rank(a[0]) - rank(b[0]);
  });
  for (const [key, value] of entries) {
    if (!value?.trim()) continue;
    applyKey(key, value);
  }

  const coverages = input.coverages;
  if (Array.isArray(coverages)) {
    for (const row of coverages) {
      const bucket = bucketFor(normalizeKey(row.key || "")) ?? bucketForLabel(row.label || "");
      if (!bucket) continue;
      setLimit(bucket, row.value ?? "");
      if (row.premium?.trim()) setPremium(bucket, row.premium);
      if (row.deductible?.trim()) setDeductible(bucket, row.deductible);
    }
  } else if (coverages) {
    for (const [key, value] of Object.entries(coverages)) {
      if (!value?.trim()) continue;
      applyKey(key, value);
    }
  }

  if (input.coverageA != null && !cells.get("building")?.limit) {
    const shown = showMoney(String(input.coverageA));
    if (shown) setLimit("building", shown);
  }

  const order: Bucket[] = ["building", "contents", "loss_of_use"];
  const extra: Bucket | null = cells.get("icc")?.limit || cells.get("icc")?.premium
    ? "icc"
    : cells.get("debris")?.limit || cells.get("debris")?.premium
      ? "debris"
      : null;
  if (extra) order.push(extra);

  const rows: FloodCoverageScheduleRow[] = [];
  for (const bucket of order) {
    const cell = cells.get(bucket);
    if (!cell || (!cell.limit && !cell.premium)) continue;
    rows.push({
      key: bucket,
      label: BUCKET_LABEL[bucket],
      limit: cell.limit || "—",
      deductible: cell.deductible || "—",
      premium: cell.premium || "—",
    });
  }
  return rows.slice(0, 4);
}
