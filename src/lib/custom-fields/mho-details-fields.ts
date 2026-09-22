import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { quotingFormIsManufacturedHome } from "@/lib/quote-sheet/home-address-fill";
import {
  DISTANCE_TO_HYDRANT_OPTIONS,
  DISTANCE_TO_STATION_OPTIONS,
  EXTERIOR_OPTIONS,
  FOUNDATION_OPTIONS,
  GARAGE_TYPE_OPTIONS,
  MONTHS_OCCUPIED_OPTIONS,
  SCREEN_ENCLOSURE_OPTIONS,
  USAGE_OPTIONS,
  WATER_BACKUP_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/quote-sheet/sheet-defaults";

/** Manufactured / mobile home. Never label this HMO. */
export const MHO_STRUCTURE_TYPE = "Manufactured Home" as const;
export const MHO_MOBILE_HOME_TYPE = "Mobile Home" as const;
/** Structure type choices on the MHO Deal Details section only. */
export const MHO_STRUCTURE_TYPE_OPTIONS = [MHO_STRUCTURE_TYPE, MHO_MOBILE_HOME_TYPE] as const;

export const MHO_DETAILS_SECTION_ID = "mho";

const YES_NO = [...YES_NO_OPTIONS];

export type MhoDetailsGroupId =
  | "dwelling"
  | "flood"
  | "coverage"
  | "hazards"
  | "protection"
  | "personal";

export const MHO_DETAILS_GROUPS: ReadonlyArray<{ id: MhoDetailsGroupId; title: string }> = [
  { id: "dwelling", title: "Dwelling" },
  { id: "flood", title: "Flood / Coastal" },
  { id: "coverage", title: "Coverage" },
  { id: "hazards", title: "Hazards" },
  { id: "protection", title: "Protection" },
  { id: "personal", title: "Personal" },
];

export type MhoDetailsField = CustomFieldDef & {
  group: MhoDetailsGroupId;
  /** Risk Profile key written on Fill. */
  sheetKey: string;
  /** Reserved — structure type is no longer locked (Manufactured Home | Mobile Home). */
  locked?: boolean;
  /** Show only when this Deal Details yes/no key is yes. */
  showWhenKey?: string;
};

function field(
  key: string,
  label: string,
  group: MhoDetailsGroupId,
  type: CustomFieldDef["type"],
  extra?: Partial<MhoDetailsField>,
): MhoDetailsField {
  return {
    key,
    label,
    type,
    group,
    sheetKey: extra?.sheetKey ?? key,
    ...extra,
  };
}

/**
 * Agent-entered MHO facts. Dropdowns reuse Risk Profile option constants.
 * No extract keys — liability-only Gemini must not invent these.
 */
export const MHO_DETAILS_FIELDS: readonly MhoDetailsField[] = [
  field("tie_downs", "Tie-downs", "dwelling", "picklist", { options: YES_NO }),
  field("hud_label", "HUD label", "dwelling", "single_line"),
  field("mh_make", "Make (unit)", "dwelling", "single_line"),
  field("mh_model", "Model (unit)", "dwelling", "single_line"),
  field("mh_year", "Year (unit)", "dwelling", "number"),
  field("year_purchased", "Year purchased", "dwelling", "number"),
  field("structure_type", "Structure type", "dwelling", "picklist", {
    options: [...MHO_STRUCTURE_TYPE_OPTIONS],
    defaultValue: MHO_STRUCTURE_TYPE,
  }),
  field("square_feet", "Sq ft", "dwelling", "number"),
  field("beds", "Beds", "dwelling", "number"),
  field("baths", "Baths", "dwelling", "number"),
  field("living_units", "Living units", "dwelling", "number"),
  field("basement", "Basement", "dwelling", "picklist", { options: YES_NO }),
  field("exterior", "Exterior", "dwelling", "picklist", { options: [...EXTERIOR_OPTIONS] }),
  field("foundation", "Foundation", "dwelling", "picklist", { options: [...FOUNDATION_OPTIONS] }),
  field("garage_spaces", "Garage spaces", "dwelling", "number"),
  field("garage_type", "Garage type", "dwelling", "picklist", { options: [...GARAGE_TYPE_OPTIONS] }),
  field("carport", "Carport", "dwelling", "picklist", { options: YES_NO }),
  field("bfe", "Base flood elevation", "flood", "number"),
  field("elevation", "Elevation", "flood", "single_line"),
  field("within_city_limits", "Within city limits", "flood", "picklist", { options: YES_NO }),
  field("usage", "Usage", "flood", "picklist", { options: [...USAGE_OPTIONS] }),
  field("screen_enclosure", "Screen enclosure", "coverage", "picklist", {
    options: [...SCREEN_ENCLOSURE_OPTIONS],
  }),
  field("water_backup", "Water backup", "coverage", "picklist", {
    options: [...WATER_BACKUP_OPTIONS],
  }),
  field("pool", "Pool", "hazards", "picklist", { options: YES_NO }),
  field("trampoline", "Trampoline", "hazards", "picklist", { options: YES_NO }),
  field("animals", "Animals", "hazards", "picklist", { options: YES_NO }),
  field("hydrant", "Distance to hydrant", "protection", "picklist", {
    options: [...DISTANCE_TO_HYDRANT_OPTIONS],
  }),
  field("miles_to_fire_station", "Distance to station", "protection", "picklist", {
    options: [...DISTANCE_TO_STATION_OPTIONS],
  }),
  field("fire_alarm", "Fire alarm", "protection", "picklist", { options: YES_NO }),
  field("smoke_detectors", "Smoke detectors", "protection", "picklist", {
    options: YES_NO,
    defaultValue: "yes",
  }),
  field("resided_under_2_years", "Resides under two years", "personal", "picklist", {
    options: YES_NO,
  }),
  field("prior_residence_address", "Prior residence address", "personal", "single_line", {
    showWhenKey: "resided_under_2_years",
  }),
  field("prior_residence_city", "Prior residence city", "personal", "single_line", {
    showWhenKey: "resided_under_2_years",
  }),
  field("prior_residence_state", "Prior residence state", "personal", "single_line", {
    showWhenKey: "resided_under_2_years",
  }),
  field("prior_residence_zip", "Prior residence ZIP", "personal", "single_line", {
    showWhenKey: "resided_under_2_years",
  }),
  field("months_occupied", "Months occupied", "personal", "picklist", {
    options: [...MONTHS_OCCUPIED_OPTIONS],
  }),
];

export const MHO_DETAILS_FIELD_KEYS = MHO_DETAILS_FIELDS.map((row) => row.key);

const PRIOR_RESIDENCE_KEYS = new Set([
  "prior_residence_address",
  "prior_residence_city",
  "prior_residence_state",
  "prior_residence_zip",
]);

export function dealPolicyFormIsMho(...ids: Array<string | null | undefined>): boolean {
  return quotingFormIsManufacturedHome(...ids);
}

export function mhoYes(raw: string | null | undefined): boolean {
  const text = (raw ?? "").trim().toLowerCase();
  return text === "yes" || text === "y" || text === "true";
}

export function mhoDetailsFieldsForGroup(group: MhoDetailsGroupId): MhoDetailsField[] {
  return MHO_DETAILS_FIELDS.filter((row) => row.group === group);
}

/** Catalog rows so Deal Details save persists these keys. */
export function mhoDetailsCatalogFields(): CustomFieldDef[] {
  return MHO_DETAILS_FIELDS.map((row) => ({
    key: row.key,
    label: row.label,
    type: row.type,
    options: row.options,
    defaultValue: row.defaultValue,
  }));
}

export type MhoDetailSheetWrite = {
  sheetKey: string;
  value: string;
};

/**
 * Deal Details → Risk Profile writes for an MHO form.
 * Prior residence is included only when resides-under-two-years is yes.
 * Smoke detectors default yes. Structure type defaults to Manufactured Home.
 */
export function mhoDetailSheetWrites(
  stored: Record<string, string | null | undefined>,
): MhoDetailSheetWrite[] {
  const read = (key: string) => (stored[key] ?? "").trim();
  const underTwoYears = mhoYes(read("resided_under_2_years"));
  const writes: MhoDetailSheetWrite[] = [
    { sheetKey: "mobile_home", value: "yes" },
  ];
  for (const row of MHO_DETAILS_FIELDS) {
    if (row.showWhenKey && !mhoYes(read(row.showWhenKey))) continue;
    let value = row.locked ? row.defaultValue?.trim() || MHO_STRUCTURE_TYPE : read(row.key);
    if (!value && row.key === "structure_type") value = row.defaultValue?.trim() || MHO_STRUCTURE_TYPE;
    if (!value && row.key === "smoke_detectors") value = row.defaultValue?.trim() || "yes";
    if (!value) continue;
    writes.push({ sheetKey: row.sheetKey, value });
  }
  if (!underTwoYears) {
    return writes.filter((row) => !PRIOR_RESIDENCE_KEYS.has(row.sheetKey));
  }
  return writes;
}

export const MHO_PRIOR_RESIDENCE_SHEET_KEYS = [...PRIOR_RESIDENCE_KEYS];
