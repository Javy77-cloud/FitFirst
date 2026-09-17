import type { CustomFieldDef, FieldLayout, LayoutSection } from "@/lib/custom-fields/types";
import {
  defaultCommercialDealLayout,
  isCommercialDealSection,
} from "@/lib/custom-fields/business-identity-fields";
import { isDealDetailsLandlordFieldKey } from "@/lib/custom-fields/deal-details-landlord";
import {
  CONSTRUCTION_OPTIONS,
  FLOOD_ZONE_OPTIONS,
  HEALTH_PLAN_TYPE_OPTIONS,
  LIFE_PRODUCT_TYPE_OPTIONS,
  PRIMARY_HEAT_OPTIONS,
} from "@/lib/quote-sheet/sheet-defaults";
import { dealProductDef, parseDealProduct, type DealProductId } from "./deal-products";

/**
 * One Deal Details page per deal — not a full personal layout per product.
 * Shared identity (contact / applicant / co-applicant / addresses) is asked once
 * and reused by Home, Auto, Flood, and later Life/Health.
 *
 * Product-only catalogs live below (Home property, Auto vehicle, Flood zone, …)
 * and must not repeat applicant/contact keys. This PR does not overlay those
 * catalogs on Details; they stay for chip completion and the sheet follow-up.
 */
export const SHARED_DEAL_SECTION_IDS = [
  "contact",
  "applicant",
  "co_applicant",
  "insured_address",
  "mailing_address",
] as const;

export const PRODUCT_SECTION_PREFIX = "product_";

export function isSharedDealSection(section: { id?: string; label?: string }): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim().toLowerCase();
  if ((SHARED_DEAL_SECTION_IDS as readonly string[]).includes(id)) return true;
  if (id === "details" || label === "details") return false;
  if (/^contact$/.test(id) || /^contact$/.test(label)) return true;
  if (/^applicant$/.test(id) || /^applicant$/.test(label)) return true;
  if (id === "co_applicant" || /^co[- ]?applicant/.test(label)) return true;
  if (id === "insured_address" || label.includes("insured address") || label.includes("business address")) {
    return true;
  }
  if (id === "mailing_address" || label.includes("mailing address")) return true;
  if (isCommercialDealSection(section)) return true;
  return false;
}

export function isProductDealSection(section: { id?: string }): boolean {
  return (section.id ?? "").startsWith(PRODUCT_SECTION_PREFIX);
}

export function productSectionId(product: DealProductId): string {
  return `${PRODUCT_SECTION_PREFIX}${product}`;
}

function field(
  key: string,
  label: string,
  type: CustomFieldDef["type"] = "single_line",
  extra?: Partial<CustomFieldDef>,
): CustomFieldDef {
  return { key, label, type, ...extra };
}

const HOME_CORE: CustomFieldDef[] = [
  field("year_built", "Year built", "number"),
  field("roof_year", "Roof year", "number"),
  field("construction", "Construction", "picklist", { options: [...CONSTRUCTION_OPTIONS] }),
  field("coverage_a", "Coverage A", "currency"),
  field("stories", "Stories", "number"),
  field("primary_heat", "Primary heat", "picklist", { options: [...PRIMARY_HEAT_OPTIONS] }),
  field("animals", "Animals on premises", "picklist", { options: ["yes", "no"] }),
  field("business_on_premises", "Business on premises", "picklist", { options: ["yes", "no"] }),
];

const LANDLORD_EXTRA: CustomFieldDef[] = [
  field("lease_term", "Lease term"),
  field("tenant_name", "Tenant name"),
  field("landlord_liability", "Landlord liability", "currency"),
  field("loss_of_rents", "Loss of rents", "currency"),
];

const AUTO_CORE: CustomFieldDef[] = [
  field("vin", "VIN"),
  field("vehicle_year", "Year", "number"),
  field("make", "Make"),
  field("model", "Model"),
];

const PRODUCT_FIELDS: Record<DealProductId, { label: string; fields: CustomFieldDef[] }> = {
  homeowners: { label: "Home (HO)", fields: HOME_CORE },
  landlord: { label: "Landlord / DP", fields: [...HOME_CORE, ...LANDLORD_EXTRA] },
  renters: {
    label: "Renters",
    fields: [
      field("coverage_c", "Coverage C (contents)", "currency"),
      field("lease_term", "Lease term"),
    ],
  },
  auto: { label: "Auto", fields: AUTO_CORE },
  motorcycle: {
    label: "Motorcycle",
    fields: [
      field("vin", "VIN"),
      field("vehicle_year", "Year", "number"),
      field("make", "Make"),
      field("model", "Model"),
    ],
  },
  flood: {
    label: "Flood",
    fields: [
      field("flood_zone", "Flood zone", "picklist", { options: [...FLOOD_ZONE_OPTIONS] }),
      field("elevation", "Elevation", "number"),
      field("year_built", "Year built", "number"),
    ],
  },
  rv: {
    label: "Recreational / RV",
    fields: [
      field("rv_year", "Year", "number"),
      field("rv_make", "Make"),
      field("length_ft", "Length (ft)", "number"),
    ],
  },
  boat: {
    label: "Boat",
    fields: [
      field("vehicle_year", "Year", "number"),
      field("make", "Make"),
      field("model", "Model"),
      field("length_ft", "Length (ft)", "number"),
    ],
  },
  umbrella: {
    label: "Umbrella",
    fields: [
      field("umbrella_limit", "Umbrella limit", "currency"),
      field("underlying", "Underlying carriers", "multi_line"),
    ],
  },
  gl: {
    label: "General liability",
    fields: [
      field("legal_name", "Legal name"),
      field("class_code", "Class code"),
      field("employees", "Employees", "number"),
      field("operations", "Operations", "multi_line"),
      field("sqft", "Square footage", "number"),
    ],
  },
  workers_comp: {
    label: "Workers' comp",
    fields: [
      field("legal_name", "Legal name"),
      field("payroll", "Payroll", "currency"),
      field("class_code", "Class code"),
      field("employees", "Employees", "number"),
    ],
  },
  bop: {
    label: "BOP",
    fields: [
      field("legal_name", "Legal name"),
      field("class_code", "Class code"),
      field("employees", "Employees", "number"),
      field("sales", "Annual sales", "currency"),
    ],
  },
  commercial_auto: {
    label: "Commercial Auto",
    fields: [
      field("legal_name", "Legal name"),
      ...AUTO_CORE,
    ],
  },
  life_term: {
    label: "Term Life",
    fields: [
      field("life_product_type", "Product type", "picklist", { options: [...LIFE_PRODUCT_TYPE_OPTIONS] }),
      field("face_amount", "Face amount", "currency"),
      field("tobacco", "Tobacco", "checkbox"),
      field("beneficiary", "Beneficiary"),
    ],
  },
  life_whole: {
    label: "Whole Life",
    fields: [
      field("life_product_type", "Product type", "picklist", { options: [...LIFE_PRODUCT_TYPE_OPTIONS] }),
      field("face_amount", "Face amount", "currency"),
      field("tobacco", "Tobacco", "checkbox"),
      field("beneficiary", "Beneficiary"),
    ],
  },
  life_iul: {
    label: "IUL",
    fields: [
      field("life_product_type", "Product type", "picklist", { options: [...LIFE_PRODUCT_TYPE_OPTIONS] }),
      field("face_amount", "Face amount", "currency"),
      field("tobacco", "Tobacco", "checkbox"),
      field("beneficiary", "Beneficiary"),
    ],
  },
  life_final: {
    label: "Final Expense",
    fields: [
      field("life_product_type", "Product type", "picklist", { options: [...LIFE_PRODUCT_TYPE_OPTIONS] }),
      field("face_amount", "Face amount", "currency"),
      field("tobacco", "Tobacco", "checkbox"),
      field("beneficiary", "Beneficiary"),
    ],
  },
  health_marketplace: {
    label: "Marketplace",
    fields: [
      field("plan_type", "Coverage type", "picklist", { options: [...HEALTH_PLAN_TYPE_OPTIONS] }),
      field("dependents", "Dependents", "number"),
    ],
  },
  health_ma: {
    label: "Medicare Advantage",
    fields: [
      field("plan_type", "Coverage type", "picklist", { options: [...HEALTH_PLAN_TYPE_OPTIONS] }),
      field("dependents", "Dependents", "number"),
    ],
  },
  health_med_ab: {
    label: "Medicare A&B",
    fields: [
      field("plan_type", "Coverage type", "picklist", { options: [...HEALTH_PLAN_TYPE_OPTIONS] }),
      field("dependents", "Dependents", "number"),
    ],
  },
  health_supplemental: {
    label: "Supplemental",
    fields: [
      field("plan_type", "Coverage type", "picklist", { options: [...HEALTH_PLAN_TYPE_OPTIONS] }),
      field("dependents", "Dependents", "number"),
    ],
  },
};

export function productLayoutFields(product: DealProductId): CustomFieldDef[] {
  return PRODUCT_FIELDS[product]?.fields ?? [];
}

export function productLayoutSection(product: DealProductId): LayoutSection {
  const catalog = PRODUCT_FIELDS[product];
  return {
    id: productSectionId(product),
    label: catalog?.label ?? dealProductDef(product).label,
    fieldKeys: (catalog?.fields ?? []).map((row) => row.key),
  };
}

export function productCompletionKeys(product: DealProductId): string[] {
  return productLayoutFields(product).map((row) => row.key);
}

export function productSectionProgress(
  product: DealProductId,
  values: Record<string, string | null | undefined>,
): { filled: number; total: number; need: number; complete: boolean; pct: number } {
  const keys = productCompletionKeys(product);
  const filled = keys.filter((key) => String(values[key] ?? "").trim()).length;
  const need = keys.length >= 3 ? 2 : 1;
  const total = keys.length || 1;
  return {
    filled,
    total,
    need,
    complete: filled >= need,
    pct: Math.min(100, Math.round((filled / total) * 100)),
  };
}

/** Reasonable “filled enough” — 2+ product keys, or 1 if the catalog is tiny. */
export function productSectionComplete(
  product: DealProductId,
  values: Record<string, string | null | undefined>,
): boolean {
  return productSectionProgress(product, values).complete;
}

export function catalogFieldsForProducts(products: readonly DealProductId[]): CustomFieldDef[] {
  const seen = new Set<string>();
  const out: CustomFieldDef[] = [];
  for (const product of products) {
    for (const field of productLayoutFields(product)) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      out.push(field);
    }
  }
  return out;
}

/**
 * Commercial-only deals (accountKind or Commercial family chips) use business identity.
 * Mixed Personal+Commercial keeps the personal applicant layout.
 */
export function usesBusinessIdentityDetails(input: {
  accountKind?: string | null;
  products?: readonly string[] | null;
  product?: DealProductId | string | null;
}): boolean {
  const products = (input.products ?? [])
    .map((raw) => parseDealProduct(raw))
    .filter((id): id is DealProductId => Boolean(id));
  if (products.length) {
    return products.every((id) => dealProductDef(id).group === "commercial");
  }
  if (String(input.accountKind ?? "").trim().toLowerCase() === "commercial") return true;
  const active = parseDealProduct(input.product);
  return Boolean(active && dealProductDef(active).group === "commercial");
}

/** Live Deal Details: commercial business identity, else shared personal applicant. */
export function layoutForDealDetails(
  layout: FieldLayout,
  input: {
    product?: DealProductId | string | null;
    accountKind?: string | null;
    products?: readonly string[] | null;
  } = {},
): FieldLayout {
  if (usesBusinessIdentityDetails(input)) {
    return defaultCommercialDealLayout();
  }
  return layoutForActiveProduct(layout, parseDealProduct(input.product));
}

/**
 * Live Deal Details = shared identity only (same body for every product chip).
 * Do not append product_* sections here — that would re-ask risk questions on Details.
 */
export function layoutForActiveProduct(
  layout: FieldLayout,
  _product: DealProductId | null,
): FieldLayout {
  const left = layout.columns[0] ?? { id: "left", sections: [] };
  const right = layout.columns[1] ?? { id: "right", sections: [] };
  const sharedLeft = left.sections.filter(isSharedDealSection);
  const sharedRight = right.sections.filter(isSharedDealSection);
  const dropLandlord = (section: LayoutSection): LayoutSection => ({
    ...section,
    fieldKeys: section.fieldKeys.filter((key) => !isDealDetailsLandlordFieldKey(key)),
  });
  return {
    columns: [
      { ...left, sections: sharedLeft.map(dropLandlord) },
      { ...right, sections: sharedRight.map(dropLandlord) },
    ],
  };
}
