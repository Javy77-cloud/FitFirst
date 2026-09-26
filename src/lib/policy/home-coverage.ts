/**
 * Home coverage schedule order.
 * Gemini may read a DEC top to bottom. Fill writes values onto these rows.
 * The schedule never reorders itself to match that read order.
 */
import { formatMoney } from "@/lib/domain";
import type { PolicyCoverageLine } from "@/lib/db/schema";
import {
  displayHomeCoverageLimit,
  displayHomeDeductible,
  formatHomeDollarAmount,
} from "@/lib/extraction/gemini/home-dollar";

/** Coverage A–F. Limit and premium only. No deductible on these rows. */
export const HOME_COVERAGE_CORE_KEYS = [
  "coverage_a",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
] as const;

/**
 * Optionals in desk order.
 * Water Backup, Personal Injury, Ordinance or Law, Theft, personal-property extras,
 * Replacement Cost Dwelling, Replacement Cost Contents, Extended Replacement Cost – Dwelling.
 */
export const HOME_COVERAGE_OPTIONAL_KEYS = [
  "water_backup",
  "personal_injury",
  "ordinance_or_law",
  "theft",
  "home_computer",
  "screen_enclosure",
  "dwelling_replacement_cost",
  "personal_property_replacement_cost",
  "extended_replacement_cost_dwelling",
] as const;

/**
 * DP-3 letter rows printed after Coverage E.
 * Liability and medical stay on the schedule. They are not Coverage E or F.
 */
export const DP_LIABILITY_COVERAGE_KEYS = ["coverage_l", "coverage_m"] as const;

/** Breakdown rows that are coverages. Fees and credits stay off this list. */
export const DP_BREAKDOWN_COVERAGE_KEYS = [
  "limited_fungi_liability",
  "rental_to_others_short_term",
  "replacement_cost_buy_back",
] as const;

/** Exclusion flags. Shown with deductibles, not as premium lines. */
export const HOME_EXCLUSION_FLAG_KEYS = ["water_damage"] as const;

/** Deductibles last. */
export const HOME_COVERAGE_DEDUCTIBLE_KEYS = [
  "aop_deductible",
  "wind_hail_deductible",
  "hurricane_deductible",
  "sinkhole_deductible",
] as const;

/** Quote-sheet Coverages group and the policy schedule share this order. */
export const HOME_COVERAGE_DESK_KEYS = [
  ...HOME_COVERAGE_CORE_KEYS,
  ...HOME_COVERAGE_OPTIONAL_KEYS,
  ...HOME_COVERAGE_DEDUCTIBLE_KEYS,
] as const;

const DEDUCTIBLE_KEYS = new Set<string>(HOME_COVERAGE_DEDUCTIBLE_KEYS);
const EXCLUSION_FLAG_KEYS = new Set<string>(HOME_EXCLUSION_FLAG_KEYS);

const LABELS: Record<string, string> = {
  coverage_a: "Coverage A",
  coverage_b: "Coverage B",
  coverage_c: "Coverage C",
  coverage_d: "Coverage D",
  coverage_e: "Coverage E",
  coverage_f: "Coverage F",
  coverage_l: "Coverage L - Liability",
  coverage_m: "Coverage M - Medical Payments",
  limited_fungi_liability: "Limited Fungi, Wet or Dry Rot, or Bacteria - Liability",
  rental_to_others_short_term: "Rental to Others (Short Term Exclusions) - Property",
  replacement_cost_buy_back: "Replacement Cost Buy Back",
  water_damage: "Water Damage",
  water_backup: "Water Back Up and Sump Overflow",
  personal_injury: "Personal Injury",
  ordinance_or_law: "Ordinance or Law",
  theft: "Theft",
  home_computer: "Home Computer",
  screen_enclosure: "Screen enclosure",
  dwelling_replacement_cost: "Replacement Cost Dwelling",
  personal_property_replacement_cost: "Replacement Cost Contents",
  extended_replacement_cost_dwelling: "Extended Replacement Cost - Dwelling",
  loss_assessment: "Loss Assessment",
  limited_fungi: "Limited Fungi, Wet or Dry Rot, or Bacteria",
  unit_owners_coverage_a: "Unit-Owners Coverage A - Special Coverage",
  catastrophic_ground_cover_collapse: "Catastrophic Ground Cover Collapse",
  aop_deductible: "All Other Perils (AOP)",
  wind_hail_deductible: "Windstorm or Hail (Other Than Hurricane)",
  hurricane_deductible: "Hurricane (% of Cov A)",
  sinkhole_deductible: "Sinkhole",
  type_of_residence: "Type of residence",
  months_occupied: "Months occupied",
  face: "Face amount",
};

/** DEC headings and Gemini aliases → the desk row key. */
const COVERAGE_KEY_ALIASES: Record<string, string> = {
  ordinance_law: "ordinance_or_law",
  building_ordinance_or_law: "ordinance_or_law",
  building_ordinance_law: "ordinance_or_law",
  water_back_up: "water_backup",
  water_back_up_and_sump_overflow: "water_backup",
  water_backup_and_sump_overflow: "water_backup",
  theft_limit: "theft",
  theft_coverage: "theft",
  personal_property_theft: "theft",
  replacement_cost_dwelling: "dwelling_replacement_cost",
  replacement_cost_contents: "personal_property_replacement_cost",
  extended_replacement_cost: "extended_replacement_cost_dwelling",
  extended_replacement_cost_dwelling: "extended_replacement_cost_dwelling",
  all_other_perils: "aop_deductible",
  all_other_perils_deductible: "aop_deductible",
  all_other_perils_aop: "aop_deductible",
  "all_other_perils_(aop)": "aop_deductible",
  windstorm_or_hail: "wind_hail_deductible",
  windstorm_or_hail_other_than_hurricane: "wind_hail_deductible",
  windstorm_or_hail_other_than_hurricane_deductible: "wind_hail_deductible",
  hurricane: "hurricane_deductible",
  sinkhole: "sinkhole_deductible",
  sinkhole_coverage: "sinkhole_deductible",
  sinkhole_loss: "sinkhole_deductible",
  sinkhole_loss_coverage: "sinkhole_deductible",
  loss_assessment_coverage: "loss_assessment",
  limited_fungi_wet_or_dry_rot_or_bacteria: "limited_fungi",
  limited_fungi_wet_or_dry_rot_or_bacteria_coverage: "limited_fungi",
  fungi: "limited_fungi",
  mold: "limited_fungi",
  unit_owners_coverage_a_special: "unit_owners_coverage_a",
  unit_owners_coverage_a_special_coverage: "unit_owners_coverage_a",
  ordinance_or_law_coverage: "ordinance_or_law",
  catastrophic_ground_cover_collapse_coverage: "catastrophic_ground_cover_collapse",
  ground_cover_collapse: "catastrophic_ground_cover_collapse",
  ground_cover_collapse_coverage: "catastrophic_ground_cover_collapse",
  coverage_l_liability: "coverage_l",
  landlord_liability: "coverage_l",
  coverage_m_medical_payments: "coverage_m",
  limited_fungi_liability: "limited_fungi_liability",
  rental_to_others_short_term_exclusions_property: "rental_to_others_short_term",
  replacement_cost_buyback: "replacement_cost_buy_back",
  water_damage_exclusion: "water_damage",
};

export type HomeCoverageScheduleRow = {
  key: string;
  label: string;
  limit: string;
  premium: string;
};

type Cell = { limit: string; premium: string };

function normalizeCoverageKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[%$#]+/g, "")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function canonicalHomeCoverageKey(raw: string): string {
  const normalized = normalizeCoverageKey(raw);
  return COVERAGE_KEY_ALIASES[normalized] ?? normalized;
}

export function homeCoverageScheduleLabel(key: string): string {
  return LABELS[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function displayPremium(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return "";
  if (/^included$/i.test(trimmed)) return "Included";
  return formatHomeDollarAmount(trimmed) || trimmed;
}

function displayLimit(key: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return "";
  if (DEDUCTIBLE_KEYS.has(key)) return displayHomeDeductible(trimmed) || trimmed;
  const formatted = displayHomeCoverageLimit(key, trimmed);
  return formatted || trimmed;
}

function blankCell(): Cell {
  return { limit: "", premium: "" };
}

export function homeCoverageSchedule(input: {
  coverageA?: number | null;
  coverageLimits?: Record<string, string> | null;
  faceAmount?: string | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  coverages?: PolicyCoverageLine[] | Record<string, string> | null;
}): HomeCoverageScheduleRow[] {
  const cells = new Map<string, Cell>();

  const cellFor = (key: string): Cell => {
    const existing = cells.get(key);
    if (existing) return existing;
    const created = blankCell();
    cells.set(key, created);
    return created;
  };

  const setLimit = (key: string, value: string) => {
    if (!key || !value) return;
    const cell = cellFor(key);
    if (!cell.limit) cell.limit = value;
  };

  const setPremium = (key: string, value: string) => {
    if (!key || !value) return;
    const cell = cellFor(key);
    if (!cell.premium) cell.premium = value;
  };

  const limits = input.coverageLimits ?? {};
  for (const [rawKey, rawValue] of Object.entries(limits)) {
    const value = rawValue?.trim() ?? "";
    if (!value) continue;
    const key = canonicalHomeCoverageKey(rawKey);
    if (key.endsWith("_premium")) {
      const base = canonicalHomeCoverageKey(key.slice(0, -"_premium".length));
      setPremium(base, displayPremium(value));
      continue;
    }
    setLimit(key, displayLimit(key, value));
  }

  const coverages = input.coverages;
  if (Array.isArray(coverages)) {
    for (const row of coverages) {
      const key = canonicalHomeCoverageKey(row.key || row.label || "");
      if (!key) continue;
      setLimit(key, displayLimit(key, row.value ?? ""));
      const premium = (row as PolicyCoverageLine).premium;
      if (premium?.trim()) setPremium(key, displayPremium(premium));
    }
  } else if (coverages) {
    for (const [rawKey, rawValue] of Object.entries(coverages)) {
      if (!rawValue?.trim()) continue;
      const key = canonicalHomeCoverageKey(rawKey);
      setLimit(key, displayLimit(key, rawValue));
    }
  }

  if (input.aopDeductible?.trim()) {
    setLimit("aop_deductible", displayLimit("aop_deductible", input.aopDeductible));
  }
  if (input.hurricaneDeductible?.trim()) {
    setLimit("hurricane_deductible", displayLimit("hurricane_deductible", input.hurricaneDeductible));
  }
  if (input.coverageA != null && !cells.get("coverage_a")?.limit) {
    const shown = formatMoney(input.coverageA);
    if (shown && shown !== "—") setLimit("coverage_a", shown);
  }

  const rows: HomeCoverageScheduleRow[] = [];
  const push = (key: string) => {
    const cell = cells.get(key);
    if (!cell || (!cell.limit && !cell.premium)) return;
    rows.push({
      key,
      label: homeCoverageScheduleLabel(key),
      limit: cell.limit || "—",
      premium: cell.premium || "—",
    });
    cells.delete(key);
  };

  for (const key of HOME_COVERAGE_CORE_KEYS) push(key);
  if (input.faceAmount?.trim()) {
    setLimit("face", formatMoney(input.faceAmount));
    push("face");
  }
  for (const key of DP_LIABILITY_COVERAGE_KEYS) push(key);
  for (const key of HOME_COVERAGE_OPTIONAL_KEYS) push(key);
  for (const key of DP_BREAKDOWN_COVERAGE_KEYS) push(key);

  const extras = [...cells.keys()]
    .filter(
      (key) =>
        !DEDUCTIBLE_KEYS.has(key) &&
        !EXCLUSION_FLAG_KEYS.has(key) &&
        !key.endsWith("_premium"),
    )
    .sort((a, b) => a.localeCompare(b));
  for (const key of extras) push(key);

  for (const key of HOME_EXCLUSION_FLAG_KEYS) push(key);
  for (const key of HOME_COVERAGE_DEDUCTIBLE_KEYS) push(key);

  return rows;
}
