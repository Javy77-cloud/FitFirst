/**
 * Flood coverage and rating for Selective / NFIP and private flood (Neptune).
 * Building is the dwelling amount. Contents is personal property.
 * Those are not HO3 Coverage A–F.
 * Each printed schedule row is kept, including a zero limit. Included stays
 * Included. "No" stays No. A deductible credit stays negative.
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

type ScheduleSpec = {
  key: string;
  label: string;
  limitKeys: string[];
  premiumKeys: string[];
  deductibleKeys: string[];
};

/**
 * Selective prints Building, Contents, and sometimes loss of use plus ICC or
 * debris. Neptune prints the whole premises table. The group heading
 * "Other Coverages" is not a row. Letter J is not on that table.
 */
const FLOOD_SCHEDULE_SPECS: ScheduleSpec[] = [
  {
    key: "building",
    label: "Building",
    limitKeys: [
      "flood_building",
      "building_limit",
      "building",
      "building_coverage",
      "building_property",
      "coverage_a",
      "dwelling",
      "dwelling_limit",
    ],
    premiumKeys: ["flood_building_premium", "building_premium", "coverage_a_premium", "dwelling_premium"],
    deductibleKeys: ["flood_building_deductible", "building_deductible", "coverage_a_deductible"],
  },
  {
    key: "contents",
    label: "Contents",
    limitKeys: ["flood_contents", "contents_limit", "contents", "coverage_c", "personal_property"],
    premiumKeys: [
      "flood_contents_premium",
      "contents_premium",
      "coverage_c_premium",
      "personal_property_premium",
    ],
    deductibleKeys: ["flood_contents_deductible", "contents_deductible", "coverage_c_deductible"],
  },
  {
    key: "loss_of_use",
    label: "Loss of use",
    limitKeys: ["flood_loss_of_use", "loss_of_use", "additional_living_expense", "ale", "coverage_d"],
    premiumKeys: ["flood_loss_of_use_premium", "loss_of_use_premium", "coverage_d_premium"],
    deductibleKeys: ["flood_loss_of_use_deductible", "loss_of_use_deductible"],
  },
  {
    key: "debris",
    label: "Debris removal",
    limitKeys: ["flood_debris", "debris_removal", "debris"],
    premiumKeys: ["flood_debris_premium", "debris_removal_premium"],
    deductibleKeys: [],
  },
  {
    key: "sandbags",
    label: "Sandbags, supplies, and labor",
    limitKeys: [
      "flood_sandbags",
      "sandbags_supplies_labor",
      "sandbags_supplies_and_labor",
      "sandbags",
    ],
    premiumKeys: ["flood_sandbags_premium", "sandbags_supplies_labor_premium"],
    deductibleKeys: [],
  },
  {
    key: "property_removed",
    label: "Property removed to safety",
    limitKeys: ["flood_property_removed", "property_removed_to_safety", "property_removed"],
    premiumKeys: ["flood_property_removed_premium", "property_removed_to_safety_premium"],
    deductibleKeys: [],
  },
  {
    key: "icc",
    label: "Increased cost of compliance",
    limitKeys: ["flood_icc", "increased_cost_of_compliance", "icc"],
    premiumKeys: ["flood_icc_premium", "increased_cost_of_compliance_premium", "icc_premium"],
    deductibleKeys: [],
  },
  {
    key: "replacement_cost_contents",
    label: "Replacement cost on contents",
    limitKeys: ["flood_replacement_cost_contents", "replacement_cost_on_contents"],
    premiumKeys: ["flood_replacement_cost_contents_premium", "replacement_cost_on_contents_premium"],
    deductibleKeys: [],
  },
  {
    key: "basement_contents",
    label: "Basement contents",
    limitKeys: ["flood_basement_contents", "basement_contents"],
    premiumKeys: ["flood_basement_contents_premium", "basement_contents_premium"],
    deductibleKeys: [],
  },
  {
    key: "pool_repair",
    label: "Pool repair and refill",
    limitKeys: ["flood_pool_repair", "pool_repair_and_refill", "pool_repair_refill", "pool_repair"],
    premiumKeys: ["flood_pool_repair_premium", "pool_repair_and_refill_premium"],
    deductibleKeys: [],
  },
  {
    key: "unattached_structures",
    label: "Unattached structures",
    limitKeys: ["flood_unattached_structures", "unattached_structures"],
    premiumKeys: ["flood_unattached_structures_premium", "unattached_structures_premium"],
    deductibleKeys: [],
  },
  {
    key: "temporary_living",
    label: "Temporary living expenses",
    limitKeys: ["flood_temporary_living", "temporary_living_expenses", "temporary_living_expense"],
    premiumKeys: ["flood_temporary_living_premium", "temporary_living_expenses_premium"],
    deductibleKeys: [],
  },
  {
    key: "replacement_cost_building",
    label: "Replacement cost on building",
    limitKeys: ["flood_replacement_cost_building", "replacement_cost_on_building"],
    premiumKeys: ["flood_replacement_cost_building_premium", "replacement_cost_on_building_premium"],
    deductibleKeys: [],
  },
  {
    key: "deductible",
    label: "Deductible",
    limitKeys: [],
    premiumKeys: ["flood_deductible_premium", "deductible_premium"],
    deductibleKeys: ["flood_deductible", "deductible"],
  },
];

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[%$#]+/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
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

function rememberLimit(values: Map<string, string>, key: string, value: string) {
  const norm = normalizeKey(key);
  const trimmed = value.trim();
  if (!norm || !trimmed || trimmed === "—") return;
  if (norm.startsWith("flood_") || !values.has(norm)) values.set(norm, trimmed);
}

function firstShown(
  values: Map<string, string>,
  keys: string[],
  format: (raw: string) => string,
): string {
  for (const key of keys) {
    const raw = values.get(key);
    if (!raw) continue;
    const shown = format(raw);
    if (shown) return shown;
  }
  return "";
}

/**
 * One row per printed flood coverage. Building and Contents stay first.
 * Neptune's later rows stay on the desk, including a printed $0.
 * The deductible row carries the credit. It is not a limit of liability.
 */
export function floodCoverageSchedule(input: {
  coverageA?: number | null;
  coverageLimits?: Record<string, string> | null;
  coverages?: PolicyCoverageLine[] | Record<string, string> | null;
}): FloodCoverageScheduleRow[] {
  const values = new Map<string, string>();
  for (const [key, value] of Object.entries(input.coverageLimits ?? {})) {
    if (value?.trim()) rememberLimit(values, key, value);
  }

  const coverages = input.coverages;
  if (Array.isArray(coverages)) {
    for (const row of coverages) {
      const key = normalizeKey(row.key || "") || normalizeKey(row.label || "");
      if (!key) continue;
      if (row.value?.trim()) rememberLimit(values, key, row.value);
      if (row.premium?.trim()) rememberLimit(values, `${key}_premium`, row.premium);
      if (row.deductible?.trim()) rememberLimit(values, `${key}_deductible`, row.deductible);
    }
  } else if (coverages) {
    for (const [key, value] of Object.entries(coverages)) {
      if (value?.trim()) rememberLimit(values, key, value);
    }
  }

  const buildingLimitKeys = FLOOD_SCHEDULE_SPECS[0]?.limitKeys ?? [];
  if (input.coverageA != null && !buildingLimitKeys.some((key) => values.has(key))) {
    rememberLimit(values, "flood_building", String(input.coverageA));
  }

  const rows: FloodCoverageScheduleRow[] = [];
  for (const spec of FLOOD_SCHEDULE_SPECS) {
    const limit = firstShown(values, spec.limitKeys, showMoney);
    const premium = firstShown(values, spec.premiumKeys, showPremium);
    const deductible = firstShown(values, spec.deductibleKeys, showDeductible);
    if (!limit && !premium && !deductible) continue;
    rows.push({
      key: spec.key,
      label: spec.label,
      limit: limit || "—",
      deductible: deductible || "—",
      premium: premium || "—",
    });
  }
  return rows;
}
