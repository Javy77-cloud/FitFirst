/**
 * Durable Home/HO3/MHO property & protection snapshot on the policy.
 * Copied from Risk Profile (+ Gemini DEC extract) at mint / issued-DEC transfer.
 * Fill-blanks only — never overwrite a non-empty agent-confirmed snapshot value.
 */

import {
  FOUR_POINT_FIELD_KEYS,
  FOUR_POINT_INSPECTION_KEY,
  WIND_MIT_FIELD_KEYS,
  WIND_MIT_INSPECTION_KEY,
} from "@/lib/quote-sheet/home-inspections";

export type PropertyProtectionValues = Record<string, string>;

export type PropertyProtectionSnapshot = {
  /** Sheet-style keys → string values. Home property/protection only. */
  values: PropertyProtectionValues;
  /** ISO time of last fill-blank merge (mint / DEC transfer). */
  updatedAt?: string | null;
  /** Where the last merge pulled from. */
  source?: "mint" | "dec_transfer" | "sheet" | "gemini" | "merge" | null;
};

export type PropertyProtectionFieldDef = {
  key: string;
  label: string;
  group: "wind" | "four_point" | "protection";
};

/** Protection / alarms — Home RP Protection group (not Auto BI/PD). */
export const PROTECTION_FIELD_KEYS = [
  "protection_class",
  "bceg_grade",
  "fire_district",
  "hydrant",
  "miles_to_fire_station",
  "central_alarm",
  "burglar_alarm",
  "fire_alarm",
  "sprinkler",
  "smoke_detectors",
  "deadbolts",
] as const;

const LABELS: Record<string, string> = {
  [WIND_MIT_INSPECTION_KEY]: "Wind mitigation inspection on file",
  [FOUR_POINT_INSPECTION_KEY]: "Four-Point inspection on file",
  roof_year: "Roof year",
  roof_covering: "Roof covering",
  roof_shape: "Roof shape",
  roof_deck: "Roof deck",
  roof_deck_attachment: "Roof deck attachment",
  roof_to_wall: "Roof-to-wall connection",
  opening_protection: "Opening protection",
  secondary_water: "Secondary water resistance",
  terrain: "Terrain",
  wind_speed: "Design wind speed",
  wind_mit_form: "Wind mit form",
  wind_mit_date: "Wind mit date",
  wind_mit_inspector: "Wind mit inspector",
  inspection_company: "Inspection company",
  license_or_certificate_number: "License or certificate #",
  building_code: "Building code",
  date_inspected: "Date inspected",
  four_point_date: "Four-Point date",
  four_point_result: "Four-Point result",
  plumbing_year: "Plumbing year",
  electrical_year: "Electrical year",
  electrical_updated: "Electrical last updated",
  electrical_update_type: "Electrical update type",
  electrical_circuit_amps: "Electrical Circuit Amps",
  primary_plumbing_type: "Primary plumbing type",
  plumbing_update_type: "Plumbing update type",
  water_heater_year: "Water heater year",
  water_heater_location: "Water heater location",
  primary_heat: "Primary heat",
  heat_update_type: "Heat update type",
  hvac_year: "HVAC year",
  roof_condition: "Roof condition (Four-Point)",
  roof_update_type: "Roof update type",
  protection_class: "Protection class",
  bceg_grade: "BCEG",
  fire_district: "Fire district",
  hydrant: "Distance to hydrant",
  miles_to_fire_station: "Distance to station",
  central_alarm: "Central alarm",
  burglar_alarm: "Burglar",
  fire_alarm: "Fire alarm",
  sprinkler: "Sprinkler",
  smoke_detectors: "Smoke detectors",
  deadbolts: "Deadbolts",
};

/** Ordered field defs for snapshot + UI. Home only — no Auto BI/PD. */
export const PROPERTY_PROTECTION_FIELDS: PropertyProtectionFieldDef[] = [
  { key: WIND_MIT_INSPECTION_KEY, label: LABELS[WIND_MIT_INSPECTION_KEY], group: "wind" },
  ...WIND_MIT_FIELD_KEYS.map((key) => ({
    key,
    label: LABELS[key] ?? key.replace(/_/g, " "),
    group: "wind" as const,
  })),
  { key: FOUR_POINT_INSPECTION_KEY, label: LABELS[FOUR_POINT_INSPECTION_KEY], group: "four_point" },
  ...FOUR_POINT_FIELD_KEYS.map((key) => ({
    key,
    label: LABELS[key] ?? key.replace(/_/g, " "),
    group: "four_point" as const,
  })),
  ...PROTECTION_FIELD_KEYS.map((key) => ({
    key,
    label: LABELS[key] ?? key.replace(/_/g, " "),
    group: "protection" as const,
  })),
];

const ALLOWED = new Set(PROPERTY_PROTECTION_FIELDS.map((f) => f.key));

/** Gemini / extract aliases → sheet keys. */
const GEMINI_ALIASES: Record<string, string> = {
  roof_age: "roof_year",
  year_roof: "roof_year",
  swr: "secondary_water",
  design_wind_speed: "wind_speed",
  four_point: "four_point_result",
  "4_point_date": "four_point_date",
  "4point_date": "four_point_date",
  electrical_amps: "electrical_circuit_amps",
  circuit_amps: "electrical_circuit_amps",
  plumbing_type: "primary_plumbing_type",
  heat_type: "primary_heat",
  hvac: "hvac_year",
  distance_to_hydrant: "hydrant",
  distance_to_station: "miles_to_fire_station",
  fire_station: "miles_to_fire_station",
  burglar: "burglar_alarm",
  burglar_alarm: "burglar_alarm",
};

export function propertyProtectionLabel(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ");
}

export function isPropertyProtectionKey(key: string): boolean {
  return ALLOWED.has(key);
}

function trimValue(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  return String(raw).trim();
}

function sheetCell(
  sheet: Record<string, { value?: string | null } | undefined> | null | undefined,
  key: string,
): string {
  if (!sheet) return "";
  return trimValue(sheet[key]?.value);
}

/** Pull Home property/protection values from the deal Risk Profile sheet. */
export function propertyProtectionFromSheet(
  sheet: Record<string, { value?: string | null } | undefined> | null | undefined,
): PropertyProtectionValues {
  const out: PropertyProtectionValues = {};
  if (!sheet) return out;
  for (const def of PROPERTY_PROTECTION_FIELDS) {
    const value = sheetCell(sheet, def.key);
    if (value) out[def.key] = value;
  }
  return out;
}

/** Pull matching keys from Gemini DEC / extract rows (Home keys only). */
export function propertyProtectionFromGemini(
  rows: ReadonlyArray<{ fieldKey?: string | null; normalizedValue?: string | null; rawValue?: string | null }>,
): PropertyProtectionValues {
  const out: PropertyProtectionValues = {};
  for (const row of rows) {
    const rawKey = trimValue(row.fieldKey).toLowerCase().replace(/\s+/g, "_");
    if (!rawKey) continue;
    const key = GEMINI_ALIASES[rawKey] ?? rawKey;
    if (!ALLOWED.has(key)) continue;
    const value = trimValue(row.normalizedValue) || trimValue(row.rawValue);
    if (!value) continue;
    if (!out[key]) out[key] = value;
  }
  return out;
}

/**
 * Fill blanks only. Existing non-empty values win (agent-confirmed / prior snapshot).
 * Incoming order: later sources only fill keys still empty after earlier ones.
 */
export function mergePropertyProtection(
  existing: PropertyProtectionValues | null | undefined,
  ...incoming: Array<PropertyProtectionValues | null | undefined>
): PropertyProtectionValues {
  const out: PropertyProtectionValues = {};
  for (const [key, value] of Object.entries(existing ?? {})) {
    if (!ALLOWED.has(key)) continue;
    const trimmed = trimValue(value);
    if (trimmed) out[key] = trimmed;
  }
  for (const source of incoming) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (!ALLOWED.has(key)) continue;
      const trimmed = trimValue(value);
      if (!trimmed) continue;
      if (trimValue(out[key])) continue;
      out[key] = trimmed;
    }
  }
  return out;
}

export function buildPropertyProtectionSnapshot(input: {
  existing?: PropertyProtectionSnapshot | null;
  sheet?: Record<string, { value?: string | null } | undefined> | null;
  gemini?: ReadonlyArray<{
    fieldKey?: string | null;
    normalizedValue?: string | null;
    rawValue?: string | null;
  }> | null;
  source?: PropertyProtectionSnapshot["source"];
  now?: Date;
}): PropertyProtectionSnapshot {
  const fromSheet = propertyProtectionFromSheet(input.sheet);
  const fromGemini = propertyProtectionFromGemini(input.gemini ?? []);
  // Prefer Risk Profile sheet over Gemini for first fill; never overwrite existing.
  const values = mergePropertyProtection(input.existing?.values, fromSheet, fromGemini);
  return {
    values,
    updatedAt: (input.now ?? new Date()).toISOString(),
    source: input.source ?? "merge",
  };
}

export function parsePropertyProtectionSnapshot(
  raw: unknown,
): PropertyProtectionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const blob = raw as { values?: unknown; updatedAt?: unknown; source?: unknown };
  if (!blob.values || typeof blob.values !== "object" || Array.isArray(blob.values)) return null;
  const values: PropertyProtectionValues = {};
  for (const [key, value] of Object.entries(blob.values as Record<string, unknown>)) {
    if (!ALLOWED.has(key)) continue;
    const trimmed = trimValue(value as string | null);
    if (trimmed) values[key] = trimmed;
  }
  return {
    values,
    updatedAt: typeof blob.updatedAt === "string" ? blob.updatedAt : null,
    source: typeof blob.source === "string" ? (blob.source as PropertyProtectionSnapshot["source"]) : null,
  };
}

export function propertyProtectionFilledCount(snapshot: PropertyProtectionSnapshot | null | undefined): number {
  if (!snapshot?.values) return 0;
  return Object.values(snapshot.values).filter((v) => trimValue(v)).length;
}

export function propertyProtectionHasData(snapshot: PropertyProtectionSnapshot | null | undefined): boolean {
  return propertyProtectionFilledCount(snapshot) > 0;
}

export type PropertyProtectionDisplayGroup = {
  id: "wind" | "four_point" | "protection";
  title: string;
  fields: Array<{ key: string; label: string; value: string }>;
};

const GROUP_TITLES: Record<PropertyProtectionDisplayGroup["id"], string> = {
  wind: "Wind mitigation",
  four_point: "Four-Point & systems",
  protection: "Protection & alarms",
};

/** UI groups — only fields with values (collapsed section stays quiet). */
export function buildPropertyProtectionDisplay(
  snapshot: PropertyProtectionSnapshot | null | undefined,
): PropertyProtectionDisplayGroup[] {
  if (!propertyProtectionHasData(snapshot)) return [];
  const values = snapshot!.values;
  const buckets: Record<PropertyProtectionDisplayGroup["id"], PropertyProtectionDisplayGroup["fields"]> = {
    wind: [],
    four_point: [],
    protection: [],
  };
  for (const def of PROPERTY_PROTECTION_FIELDS) {
    const value = trimValue(values[def.key]);
    if (!value) continue;
    buckets[def.group].push({ key: def.key, label: def.label, value });
  }
  return (["wind", "four_point", "protection"] as const)
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, title: GROUP_TITLES[id], fields: buckets[id] }));
}
