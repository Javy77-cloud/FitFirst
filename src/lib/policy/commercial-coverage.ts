/**
 * Shared commercial Fill schedule for Workers' Comp, General Liability,
 * and a thin Professional Liability / E&O certificate.
 * One alias list. No per-carrier parser. Absent rows stay absent.
 */

import { formatHomeDollarAmount } from "@/lib/extraction/gemini/home-dollar";

export type CommercialExtractRow = {
  fieldKey: string;
  normalizedValue?: string | null;
  rawValue?: string | null;
};

/** Desk coverage_limits keys. Identity keys are not schedule rows. */
export const COMMERCIAL_SCHEDULE_KEYS = [
  "wc_per_statute",
  "el_each_accident",
  "el_disease_each_employee",
  "el_disease_policy_limit",
  "gl_each_occurrence",
  "gl_general_aggregate",
  "gl_products_completed_ops",
  "gl_personal_advertising_injury",
  "gl_damage_to_premises_rented",
  "gl_medical_expenses",
  "gl_deductible",
  "pl_per_claim",
  "pl_aggregate",
  "pl_per_claim_deductible",
  "pl_claims_made",
] as const;

export type CommercialScheduleKey = (typeof COMMERCIAL_SCHEDULE_KEYS)[number];

const SCHEDULE_KEY_SET = new Set<string>(COMMERCIAL_SCHEDULE_KEYS);

/** Printed on the page, stored for the policy card. Not coverage rows. */
export const COMMERCIAL_IDENTITY_LIMIT_KEYS = ["insurer_name", "named_insured"] as const;

/** Fill field name → coverage_limits key. */
export const COMMERCIAL_FILL_PAIRS: Array<[string, string]> = [
  ["elEachAccident", "el_each_accident"],
  ["elDiseaseEachEmployee", "el_disease_each_employee"],
  ["elDiseasePolicyLimit", "el_disease_policy_limit"],
  ["wcPerStatute", "wc_per_statute"],
  ["glEachOccurrence", "gl_each_occurrence"],
  ["glGeneralAggregate", "gl_general_aggregate"],
  ["glProductsCompletedOps", "gl_products_completed_ops"],
  ["glPersonalAdvertisingInjury", "gl_personal_advertising_injury"],
  ["glDamageToPremisesRented", "gl_damage_to_premises_rented"],
  ["glMedicalExpenses", "gl_medical_expenses"],
  ["glDeductible", "gl_deductible"],
  ["plPerClaim", "pl_per_claim"],
  ["plAggregate", "pl_aggregate"],
  ["plPerClaimDeductible", "pl_per_claim_deductible"],
  ["plClaimsMade", "pl_claims_made"],
  ["insurerName", "insurer_name"],
  ["namedInsured", "named_insured"],
];

const WC_SUMMARY_KEYS = new Set<string>([
  "wc_per_statute",
  "el_each_accident",
  "el_disease_each_employee",
  "el_disease_policy_limit",
]);

const GL_SUMMARY_KEYS = new Set<string>([
  "gl_each_occurrence",
  "gl_general_aggregate",
  "gl_products_completed_ops",
  "gl_personal_advertising_injury",
  "gl_damage_to_premises_rented",
  "gl_medical_expenses",
  "gl_deductible",
]);

const PL_MONEY_KEYS = new Set<string>(["pl_per_claim", "pl_aggregate"]);

/** HO3 rows a commercial Fill must not leave behind. */
const HOME_LIMIT_KEYS_ON_COMMERCIAL = [
  "coverage_a",
  "coverage_a_premium",
  "coverage_b",
  "coverage_b_premium",
  "coverage_c",
  "coverage_c_premium",
  "coverage_d",
  "coverage_d_premium",
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
  "screen_enclosure",
] as const;

export function isCommercialShopLine(shopLine?: string | null): boolean {
  const line = (shopLine ?? "").trim().toLowerCase();
  return line === "workers_comp" || line === "general_liability" || line === "commercial";
}

/** Loose key for a printed label. Ampersands and parentheses do not change the field. */
export function looseCommercialKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[%$#]+/g, "")
    .replace(/[()]/g, " ")
    .replace(/[\s\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Printed label or canonical key → sheet key.
 * `printed_aggregate_limit` is the bare "Aggregate Limit" until the rest of the
 * page says General Liability or Professional Liability.
 * `premium` is never a coverage limit.
 */
export function commercialSheetKey(raw: string): string | null {
  const key = looseCommercialKey(raw);
  if (!key) return null;
  if (SCHEDULE_KEY_SET.has(key)) return key;
  if (
    key === "total_estimated_annual_premium" ||
    key === "estimated_annual_premium" ||
    key === "deposit_premium" ||
    key === "policy_minimum_premium"
  ) {
    return "premium";
  }
  if (key === "writing_company" || key === "insurance_company" || key === "insurer_a") return "current_carrier";
  if (
    /^(el_disease_each_employee|el_disease_ea_employee|e_l_disease_ea_employee|e_l_disease_each_employee|disease_each_employee|disease_ea_employee|bodily_injury_by_disease_each_employee|bodily_injury_by_disease_ea_employee|employers_liability_disease_each_employee)$/.test(
      key,
    )
  ) {
    return "el_disease_each_employee";
  }
  if (
    /^(el_disease_policy_limit|el_disease_policy|e_l_disease_policy_limit|e_l_disease_policy|disease_policy_limit|bodily_injury_by_disease_policy_limit|bodily_injury_by_disease_policy|employers_liability_disease_policy_limit)$/.test(
      key,
    )
  ) {
    return "el_disease_policy_limit";
  }
  if (
    /^(el_each_accident|el_each_accident_limit|e_l_each_accident|e_l_each_accident_limit|employers_liability_each_accident|bodily_injury_by_accident|bodily_injury_by_accident_each_accident|each_accident)$/.test(
      key,
    )
  ) {
    return "el_each_accident";
  }
  if (/^(wc_per_statute|per_statute|employers_liability_per_statute|statutory_limits)$/.test(key)) {
    return "wc_per_statute";
  }
  if (key === "gl_products_completed_ops" || key.startsWith("products_completed") || key === "products_aggregate") {
    return "gl_products_completed_ops";
  }
  if (key.includes("personal") && key.includes("advertising")) return "gl_personal_advertising_injury";
  if (key.includes("premises_rented") || key.startsWith("damage_to_premises")) return "gl_damage_to_premises_rented";
  if (key === "gl_medical_expenses" || key.startsWith("medical_expense")) return "gl_medical_expenses";
  if (
    key === "gl_each_occurrence" ||
    key === "each_occurrence" ||
    key.startsWith("each_occurrence_limit") ||
    key.startsWith("general_liability_each_occurrence")
  ) {
    return "gl_each_occurrence";
  }
  if (
    key === "gl_general_aggregate" ||
    key.startsWith("general_aggregate") ||
    key === "general_liability_aggregate" ||
    key.startsWith("general_liability_annual_aggregate")
  ) {
    return "gl_general_aggregate";
  }
  if (key.includes("per_claim_deductible")) return "pl_per_claim_deductible";
  if (
    key === "pl_per_claim" ||
    key === "per_claim" ||
    key === "per_claim_limit" ||
    key.startsWith("professional_liability_per_claim")
  ) {
    return "pl_per_claim";
  }
  if (key === "pl_claims_made" || key === "claims_made" || key === "claims_made_basis") return "pl_claims_made";
  if (key === "gl_deductible" || key === "deductible_amount" || key === "property_damage_deductible") {
    return "gl_deductible";
  }
  if (key === "aggregate_limit" || key === "printed_aggregate_limit" || key === "aggregate") {
    return "printed_aggregate_limit";
  }
  return null;
}

function rowValue(row: CommercialExtractRow): string {
  return String(row.normalizedValue || row.rawValue || "").replace(/\s+/g, " ").trim();
}

function indexRows(rows: readonly CommercialExtractRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const value = rowValue(row);
    if (!value) continue;
    const sheet = commercialSheetKey(row.fieldKey);
    const keys = [sheet, looseCommercialKey(row.fieldKey)].filter((key): key is string => Boolean(key));
    for (const key of keys) {
      if (!map.has(key)) map.set(key, value);
    }
  }
  return map;
}

function first(map: Map<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = map.get(key)?.trim();
    if (value) return value;
  }
  return "";
}

function moneyLimit(raw: string): string {
  return formatHomeDollarAmount(raw);
}

function markedFlag(raw: string, printed: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (/^(n|no|false|unchecked|occurrence)$/i.test(text)) return "";
  if (/^(x|y|yes|true|checked)$/i.test(text)) return printed;
  if (printed === "Per Statute" && /per\s*statute|statutory/i.test(text)) return "Per Statute";
  if (printed === "Claims-Made" && /claims[-\s]?made/i.test(text)) return "Claims-Made";
  return "";
}

function looksLikeEo(map: Map<string, string>): boolean {
  if (map.has("pl_per_claim") || map.has("pl_per_claim_deductible") || map.has("pl_claims_made")) return true;
  const blob = [...map.keys(), ...map.values()].join(" ");
  return /professional liability|errors (and|&) omissions|\be\s*&\s*o\b|claims[-\s]?made/i.test(blob);
}

function looksLikeGl(map: Map<string, string>): boolean {
  return [
    "gl_each_occurrence",
    "gl_products_completed_ops",
    "gl_personal_advertising_injury",
    "gl_damage_to_premises_rented",
    "gl_medical_expenses",
    "gl_general_aggregate",
    "gl_deductible",
  ].some((key) => map.has(key));
}

export type CommercialExtractedFields = {
  limits: Record<string, string>;
  policyNumber: string;
  insurerName: string;
  namedInsured: string;
  /** Premium text only. Never copied into a limit. */
  premiumRaw: string;
};

export function commercialFieldsFromRows(rows: readonly CommercialExtractRow[]): CommercialExtractedFields {
  const map = indexRows(rows);
  const ambiguous = first(map, "printed_aggregate_limit");
  if (ambiguous && !map.has("gl_general_aggregate") && !map.has("pl_aggregate")) {
    if (looksLikeEo(map) && !looksLikeGl(map)) map.set("pl_aggregate", ambiguous);
    else map.set("gl_general_aggregate", ambiguous);
  }

  const limits: Record<string, string> = {};
  const putMoney = (key: CommercialScheduleKey) => {
    const raw = map.get(key)?.trim() ?? "";
    if (!raw) return;
    const shown = moneyLimit(raw);
    if (shown) limits[key] = shown;
  };
  putMoney("el_each_accident");
  putMoney("el_disease_each_employee");
  putMoney("el_disease_policy_limit");
  putMoney("gl_each_occurrence");
  putMoney("gl_general_aggregate");
  putMoney("gl_products_completed_ops");
  putMoney("gl_personal_advertising_injury");
  putMoney("gl_damage_to_premises_rented");
  putMoney("gl_medical_expenses");
  putMoney("gl_deductible");
  putMoney("pl_per_claim");
  putMoney("pl_aggregate");
  putMoney("pl_per_claim_deductible");

  const statute = markedFlag(map.get("wc_per_statute") ?? "", "Per Statute");
  if (statute) limits.wc_per_statute = statute;
  const claims = markedFlag(map.get("pl_claims_made") ?? "", "Claims-Made");
  if (claims) limits.pl_claims_made = claims;

  const insurer = first(map, "current_carrier", "insurer", "insurer_name", "carrier", "carrier_name", "writing_company");
  const named = first(map, "named_insured", "current_policy_name_insured", "applicant_name", "business_name");
  if (insurer) limits.insurer_name = insurer;
  if (named) limits.named_insured = named;

  return {
    limits,
    policyNumber: first(map, "policy_number", "policy_no", "pol_number", "pol_no"),
    insurerName: insurer,
    namedInsured: named,
    premiumRaw: first(
      map,
      "premium",
      "current_premium",
      "total_premium",
      "total_estimated_annual_premium",
      "estimated_annual_premium",
    ),
  };
}

export function commercialExtractHasSchedule(rows: readonly CommercialExtractRow[]): boolean {
  const extracted = commercialFieldsFromRows(rows);
  return COMMERCIAL_SCHEDULE_KEYS.some((key) => Boolean(extracted.limits[key]?.trim()));
}

type ScheduleKind = "money" | "deductible" | "flag";

const SCHEDULE_SPEC: Array<{ key: CommercialScheduleKey; label: string; kind: ScheduleKind }> = [
  { key: "wc_per_statute", label: "Per statute", kind: "flag" },
  { key: "el_each_accident", label: "EL each accident", kind: "money" },
  { key: "el_disease_each_employee", label: "EL disease each employee", kind: "money" },
  { key: "el_disease_policy_limit", label: "EL disease policy limit", kind: "money" },
  { key: "gl_each_occurrence", label: "Each occurrence", kind: "money" },
  { key: "gl_general_aggregate", label: "General aggregate", kind: "money" },
  { key: "gl_products_completed_ops", label: "Products/completed operations aggregate", kind: "money" },
  { key: "gl_personal_advertising_injury", label: "Personal and advertising injury", kind: "money" },
  { key: "gl_damage_to_premises_rented", label: "Damage to premises rented to you", kind: "money" },
  { key: "gl_medical_expenses", label: "Medical expenses", kind: "money" },
  { key: "gl_deductible", label: "Deductible", kind: "deductible" },
  { key: "pl_per_claim", label: "Per claim", kind: "money" },
  { key: "pl_aggregate", label: "Aggregate", kind: "money" },
  { key: "pl_per_claim_deductible", label: "Per claim deductible", kind: "deductible" },
  { key: "pl_claims_made", label: "Claims-made", kind: "flag" },
];

export type CommercialCoverageScheduleRow = {
  key: string;
  label: string;
  limit: string;
  deductible: string;
  premium: string;
};

export function commercialCoverageSchedule(
  limits: Record<string, string> | null | undefined,
): CommercialCoverageScheduleRow[] {
  if (!limits) return [];
  const rows: CommercialCoverageScheduleRow[] = [];
  for (const spec of SCHEDULE_SPEC) {
    const raw = limits[spec.key]?.trim() ?? "";
    if (!raw) continue;
    if (spec.kind === "deductible") {
      const deductible = moneyLimit(raw);
      if (!deductible) continue;
      rows.push({ key: spec.key, label: spec.label, limit: "—", deductible, premium: "—" });
      continue;
    }
    const limit = spec.kind === "flag" ? raw : moneyLimit(raw);
    if (!limit) continue;
    rows.push({ key: spec.key, label: spec.label, limit, deductible: "—", premium: "—" });
  }
  return rows;
}

export function commercialLimitsSummary(
  limits: Record<string, string> | null | undefined,
  scope: "wc" | "gl" | "pl" | "all" = "all",
): string | null {
  const allow =
    scope === "wc" ? WC_SUMMARY_KEYS : scope === "gl" ? GL_SUMMARY_KEYS : scope === "pl" ? PL_MONEY_KEYS : null;
  const parts = commercialCoverageSchedule(limits)
    .filter((row) => (allow ? allow.has(row.key) : true))
    .map((row) => {
      const value = row.limit !== "—" ? row.limit : row.deductible;
      return `${row.label} ${value}`;
    });
  return parts.length ? parts.join(" · ") : null;
}

export function commercialCoverageLimitsAfterFill(
  existing: Record<string, string> | null | undefined,
  incoming: Record<string, string>,
): Record<string, string> {
  const merged: Record<string, string> = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    const trimmed = value?.trim();
    if (trimmed) merged[key] = trimmed;
  }
  for (const key of HOME_LIMIT_KEYS_ON_COMMERCIAL) delete merged[key];
  return merged;
}

const CACHE_KEYS = new Set<string>(COMMERCIAL_SCHEDULE_KEYS);

/** A homeowners-prompt cache has no WC / GL / E&O schedule key. */
export function commercialDecCacheSupportsFill(rows: readonly CommercialExtractRow[]): boolean {
  return rows.some((row) => {
    const value = rowValue(row);
    if (!value) return false;
    const sheet = commercialSheetKey(row.fieldKey);
    return Boolean(sheet && CACHE_KEYS.has(sheet));
  });
}
