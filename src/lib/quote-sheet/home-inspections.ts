import { QUOTING_FORMS, type ShopLine } from "@/lib/domain";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";

/** Sheet keys. Unchecked is empty — never a truthy default. */
export const WIND_MIT_INSPECTION_KEY = "has_wind_mitigation_inspection";
export const FOUR_POINT_INSPECTION_KEY = "has_four_point_inspection";

export const WIND_MIT_INSPECTION_LABEL = "I have a wind mitigation inspection";
export const FOUR_POINT_INSPECTION_LABEL = "I have a four-point inspection";

/** Agent-visible section titles. Field keys stay on the old names. */
export const WIND_MIT_SECTION = "Wind Mitigation";
export const FOUR_POINT_SECTION = "Four-Point Inspection";
export const COST_SECTION = "Cost";
export const CURRENT_POLICY_SECTION = "Current Policy";

/** Roof / wind catalog keys. Data keys are unchanged. */
export const WIND_MIT_FIELD_KEYS = [
  "roof_year",
  "roof_covering",
  "roof_shape",
  "roof_deck",
  "roof_deck_attachment",
  "roof_to_wall",
  "opening_protection",
  "secondary_water",
  "terrain",
  "wind_speed",
  "wind_mit_form",
  "wind_mit_date",
  "wind_mit_inspector",
  "inspection_company",
  "license_or_certificate_number",
  "building_code",
] as const;

export const FOUR_POINT_FIELD_KEYS = [
  "date_inspected",
  "four_point_date",
  "four_point_result",
  "plumbing_year",
  "electrical_year",
  "electrical_updated",
  "electrical_update_type",
  "electrical_circuit_amps",
  "primary_plumbing_type",
  "plumbing_update_type",
  "water_heater_year",
  "water_heater_location",
  "primary_heat",
  "heat_update_type",
  "hvac_year",
  "roof_condition",
  "roof_update_type",
] as const;

const WIND_KEYS = new Set<string>(WIND_MIT_FIELD_KEYS);
const FOUR_KEYS = new Set<string>(FOUR_POINT_FIELD_KEYS);

export function isWindMitFieldKey(key: string): boolean {
  return WIND_KEYS.has(key);
}

export function isFourPointFieldKey(key: string): boolean {
  return FOUR_KEYS.has(key);
}

export function isInspectionFieldKey(key: string): boolean {
  return isWindMitFieldKey(key) || isFourPointFieldKey(key);
}

export function isInspectionSectionGroup(group: string): boolean {
  return inspectionKindForSection(group) != null;
}

/**
 * Relative order of Home Risk Profile sections. Other lines keep catalog order.
 * Javy’s lock is consecutive. Dwelling and Coastal / flood are still required
 * by the sheet, so they follow Current Policy and stay ahead of the product tails.
 */
export const HOME_SECTION_ORDER = [
  "Property",
  "Protection",
  COST_SECTION,
  WIND_MIT_SECTION,
  FOUR_POINT_SECTION,
  "Hazards",
  "Coverages",
  CURRENT_POLICY_SECTION,
  "Dwelling",
  "Coastal / flood",
  "Mortgagee",
  "Landlord",
  "Renters",
  "Authorizations",
  "Notes",
] as const;

const HOME_FORM_IDS = new Set(
  QUOTING_FORMS.filter((form) => form.shopLine === "home").map((form) => form.id.toUpperCase()),
);

/**
 * Residential Home forms and the aliases agents type.
 * MMHO / MH share the MHO sheet. Condo is HO6. HO4 is renters.
 */
const HOME_FORM_ALIASES: Record<string, string> = {
  HO3: "HO3",
  HO5: "HO5",
  HO6: "HO6",
  HO8: "HO8",
  HO4: "HO4",
  DP1: "DP1",
  DP3: "DP3",
  MHO: "MHO",
  MH: "MHO",
  MMHO: "MHO",
  MDP: "MDP",
  HOME: "HO3",
  HOMEOWNERS: "HO3",
  RENTERS: "HO4",
  LANDLORD: "DP3",
  CONDO: "HO6",
  "HO6 CONDO": "HO6",
  "MOBILE HOME": "MHO",
  "MOBILE HOME OWNERS": "MHO",
  "MANUFACTURED HOME": "MHO",
  "MANUFACTURED MOBILE": "MHO",
  "MOBILE MANUFACTURED": "MHO",
  "MOBILE HOME DWELLING": "MDP",
};

export const RESIDENTIAL_HOME_FORM_CODES = [
  "HO3",
  "HO5",
  "HO6",
  "HO8",
  "HO4",
  "DP1",
  "DP3",
  "MHO",
  "MDP",
  "MMHO",
] as const;

function aliasKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[_/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .trim();
}

/** Canonical quoting form for a residential Home alias, or null for other lines. */
export function canonicalHomeForm(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const keyed = aliasKey(raw);
  const squeezed = keyed.replace(/\s+/g, "");
  if (HOME_FORM_IDS.has(squeezed)) return squeezed === "MH" || squeezed === "MMHO" ? "MHO" : squeezed;
  if (HOME_FORM_ALIASES[keyed]) return HOME_FORM_ALIASES[keyed];
  if (HOME_FORM_ALIASES[squeezed]) return HOME_FORM_ALIASES[squeezed];
  return null;
}

export function isResidentialHomeForm(value: string | null | undefined): boolean {
  return canonicalHomeForm(value) != null;
}

export function isResidentialHomeLine(line: ShopLine | string | null | undefined): boolean {
  return line === "home";
}

/** Agent-visible section title. Legacy group strings stay readable. */
export function agentHomeSectionTitle(group: string): string {
  const key = group.trim().toLowerCase().replace(/\s+/g, " ");
  if (key === "roof / wind" || key === "roof wind" || key === "roof/wind") return WIND_MIT_SECTION;
  if (key === "4-point" || key === "4 point" || key === "four point" || key === "four-point") {
    return FOUR_POINT_SECTION;
  }
  if (key === "current policy") return CURRENT_POLICY_SECTION;
  if (key === "costs" || key === "rce" || key === "replacement cost") return COST_SECTION;
  return group.trim();
}

export function inspectionKindForSection(title: string): "wind" | "four" | null {
  const named = agentHomeSectionTitle(title);
  if (named === WIND_MIT_SECTION) return "wind";
  if (named === FOUR_POINT_SECTION) return "four";
  return null;
}

function cellText(
  values: Record<string, { value?: string | null } | string | null | undefined> | null | undefined,
  key: string,
): string {
  const raw = values?.[key];
  if (typeof raw === "string") return raw;
  return raw?.value ?? "";
}

/**
 * Checkbox means the inspection is in hand.
 * Missing, blank, "no", and any other value stay closed. No truthy default.
 */
export function inspectionInHand(
  values: Record<string, { value?: string | null } | string | null | undefined> | null | undefined,
  kind: "wind" | "four",
): boolean {
  const key = kind === "wind" ? WIND_MIT_INSPECTION_KEY : FOUR_POINT_INSPECTION_KEY;
  const normalized = cellText(values, key).trim().toLowerCase();
  return normalized === "yes" || normalized === "y" || normalized === "true" || normalized === "1";
}

/** Inspection sections start closed unless that inspection is in hand. Other sections start open. */
export function inspectionSectionDefaultOpen(
  title: string,
  values: Record<string, { value?: string | null } | string | null | undefined> | null | undefined,
): boolean {
  const kind = inspectionKindForSection(title);
  if (!kind) return true;
  return inspectionInHand(values, kind);
}

export function homeSectionRank(group: string): number {
  const title = agentHomeSectionTitle(group);
  const index = HOME_SECTION_ORDER.indexOf(title as (typeof HOME_SECTION_ORDER)[number]);
  return index === -1 ? HOME_SECTION_ORDER.length : index;
}

export function orderHomeGroups<T extends { group: string }>(groups: readonly T[]): T[] {
  return groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => {
      const rank = homeSectionRank(a.group.group) - homeSectionRank(b.group.group);
      return rank !== 0 ? rank : a.index - b.index;
    })
    .map((row) => ({ ...row.group, group: agentHomeSectionTitle(row.group.group) }));
}

function normalizedDocType(docType: string | null | undefined): string {
  return (docType ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Existence may be set only from a classified wind-mit or four-point document.
 * A dec, liability policy, photo, or generic inspection does not check the box.
 */
export function inspectionExistenceFromDocType(docType?: string | null): {
  windMit: boolean;
  fourPoint: boolean;
} {
  const kind = normalizedDocType(docType);
  const windMit = kind === "wind_mit" || kind === "wind_mitigation" || kind === "windmit";
  const fourPoint = kind === "four_point" || kind === "fourpoint" || kind === "4_point" || kind === "4point";
  return { windMit, fourPoint };
}

export function applyInspectionExistenceFromDoc<T extends Record<string, QuoteSheetFieldValue>>(
  values: T,
  docType: string | null | undefined,
  source: QuoteSheetFieldValue["source"] = "extracted",
): T {
  const existence = inspectionExistenceFromDocType(docType);
  if (!existence.windMit && !existence.fourPoint) return values;
  const next = { ...values };
  if (existence.windMit) {
    next[WIND_MIT_INSPECTION_KEY] = { value: "yes", status: "confirmed", source };
  }
  if (existence.fourPoint) {
    next[FOUR_POINT_INSPECTION_KEY] = { value: "yes", status: "confirmed", source };
  }
  return next;
}

/**
 * Carrier serialize / transfer / rate view.
 * Unchecked inspections are omitted. Stored sheet values are not mutated.
 * The existence flags themselves are not carrier fields.
 */
export function carrierTransferValues(
  values: Record<string, QuoteSheetFieldValue> | null | undefined,
): Record<string, QuoteSheetFieldValue> {
  const source = values ?? {};
  const next: Record<string, QuoteSheetFieldValue> = { ...source };
  if (!inspectionInHand(source, "wind")) {
    for (const key of WIND_MIT_FIELD_KEYS) delete next[key];
  }
  if (!inspectionInHand(source, "four")) {
    for (const key of FOUR_POINT_FIELD_KEYS) delete next[key];
  }
  delete next[WIND_MIT_INSPECTION_KEY];
  delete next[FOUR_POINT_INSPECTION_KEY];
  return next;
}
