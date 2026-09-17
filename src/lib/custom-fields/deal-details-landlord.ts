import { parseLayout, type FieldLayout } from "./types";

/**
 * Landlord / rental / 4-point keys that do not belong on Deal Details
 * (personal / general only). They stay on the product catalog for later
 * DP/landlord master-sheet work — do not re-seed them onto Details.
 */
export const DEAL_DETAILS_LANDLORD_FIELD_KEYS = [
  "lease_term",
  "tenant_name",
  "landlord_liability",
  "loss_of_rents",
  "animals",
  "primary_heat",
  "business_on_premises",
] as const;

const LANDLORD_SECTION_IDS = new Set(["landlord", "rental", "product_landlord"]);

export function isDealDetailsLandlordFieldKey(key: string): boolean {
  return (DEAL_DETAILS_LANDLORD_FIELD_KEYS as readonly string[]).includes(key);
}

export function isDealDetailsLandlordSection(section: { id?: string; label?: string }): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim().toLowerCase();
  if (LANDLORD_SECTION_IDS.has(id) || id.startsWith("product_landlord")) return true;
  return /\blandlord\b|\brental\b/.test(id) || /\blandlord\b|\brental\b/.test(label);
}

export function needsDealDetailsLandlordStrip(layout: FieldLayout): boolean {
  for (const column of layout.columns) {
    for (const section of column.sections) {
      if (isDealDetailsLandlordSection(section)) return true;
      if (section.fieldKeys.some((key) => isDealDetailsLandlordFieldKey(key))) return true;
    }
  }
  return false;
}

/** Remove landlord/rental keys and sections. Preserves agency revision — never re-seeds. */
export function stripDealDetailsLandlordFields(layout: FieldLayout): FieldLayout {
  const next = parseLayout(layout);
  return parseLayout({
    ...next,
    columns: next.columns.map((column) => ({
      ...column,
      sections: column.sections
        .filter((section) => !isDealDetailsLandlordSection(section))
        .map((section) => ({
          ...section,
          fieldKeys: section.fieldKeys.filter((key) => !isDealDetailsLandlordFieldKey(key)),
        })),
    })),
  });
}

export function layoutWithoutDealDetailsLandlord(layout: FieldLayout): FieldLayout {
  return needsDealDetailsLandlordStrip(layout) ? stripDealDetailsLandlordFields(layout) : layout;
}
