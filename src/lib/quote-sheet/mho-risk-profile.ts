import type { QuoteFieldDef } from "./applicant-core";
import { quotingFormIsManufacturedHome } from "./home-address-fill";
import { YES_NO_OPTIONS } from "./sheet-defaults";

/** Home Risk Profile section. Visible only for MHO / MMHO / Manufactured Home. */
export const MANUFACTURED_HOME_SECTION = "Manufactured home";

/**
 * Agent questions with no API. Existing catalog keys stay in their groups on HO3.
 * On MHO they gather here so the agent can find and type them.
 */
export const MHO_SECTION_KEYS = [
  "tie_downs",
  "hud_label",
  "mh_make",
  "mh_model",
  "mh_year",
  "structure_type",
  "garage_spaces",
  "garage_type",
  "carport",
  "basement",
  "within_city_limits",
  "usage",
  "months_occupied",
  "resided_under_2_years",
  "prior_residence_address",
  "prior_residence_city",
  "prior_residence_state",
  "prior_residence_zip",
  "elevation",
  "hydrant",
  "miles_to_fire_station",
  "fire_alarm",
  "smoke_detectors",
  "screen_enclosure",
  "water_backup",
] as const;

/** Catalog keys that are not already on the homeowners sheet. */
export const MHO_ONLY_FIELDS: QuoteFieldDef[] = [
  {
    key: "tie_downs",
    label: "Tie-downs",
    group: MANUFACTURED_HOME_SECTION,
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "hud_label",
    label: "HUD label / data plate",
    group: MANUFACTURED_HOME_SECTION,
  },
  {
    key: "mh_make",
    label: "Make",
    group: MANUFACTURED_HOME_SECTION,
  },
  {
    key: "mh_model",
    label: "Model",
    group: MANUFACTURED_HOME_SECTION,
  },
  {
    key: "mh_year",
    label: "Year",
    group: MANUFACTURED_HOME_SECTION,
    input: "number",
  },
];

export function isManufacturedHomeQuotingForm(
  ...ids: Array<string | null | undefined>
): boolean {
  return quotingFormIsManufacturedHome(...ids);
}

/** Pull listed keys into the Manufactured home section and append any missing ones. */
export function withManufacturedHomeSection(fields: readonly QuoteFieldDef[]): QuoteFieldDef[] {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  for (const extra of MHO_ONLY_FIELDS) {
    if (!byKey.has(extra.key)) byKey.set(extra.key, extra);
  }
  const used = new Set<string>();
  const section: QuoteFieldDef[] = [];
  for (const key of MHO_SECTION_KEYS) {
    const field = byKey.get(key);
    if (!field) continue;
    // The section is already MHO-only. Do not also hide unit identity behind mobile_home.
    const showWhen = field.showWhen?.key === "mobile_home" ? undefined : field.showWhen;
    section.push({ ...field, group: MANUFACTURED_HOME_SECTION, showWhen });
    used.add(key);
  }
  return [...section, ...fields.filter((field) => !used.has(field.key))];
}

export function manufacturedHomeFieldsFor(
  fields: readonly QuoteFieldDef[],
  quotingForm?: string | null,
): QuoteFieldDef[] {
  if (!isManufacturedHomeQuotingForm(quotingForm)) return [...fields];
  return withManufacturedHomeSection(fields);
}
