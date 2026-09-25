import { BUSINESS_ENTITY_TYPE_OPTIONS } from "@/lib/businesses/entity-industry";
import type { DealProductId } from "@/lib/deals/deal-products";
import { parseDealProduct } from "@/lib/deals/deal-products";
import type { ShopLine } from "@/lib/domain";
import type { QuoteFieldDef } from "./applicant-core";
import { CLAIMS_5YR_OPTIONS, PROTECTION_CLASS_OPTIONS, YES_NO_OPTIONS } from "./sheet-defaults";

/** Agent-facing name for commercial master sheets. */
export const COMMERCIAL_RISK_PROFILE_LABEL = "Risk Profile";

export const COMMERCIAL_COVERAGE_KEY = "coverage_lines";

/**
 * Deal Details keys that also live on the commercial shared/general Risk Profile.
 * Same keys so document / COI / policy / Fill-from-Details transfer without remapping.
 * Owner contact (first_name / last_name / date_of_birth / phone / email) stays on Details only.
 */
export const COMMERCIAL_SHARED_DEAL_DETAIL_KEYS = [
  "business_name",
  "dba",
  "entity_type",
  "ein",
  "years_in_business",
  "naics",
  "operations",
  "annual_sales",
  "employee_count",
  "payroll",
  "mailing_address",
  "city",
  "state",
  "zip",
] as const;

/** Incoming aliases → Deal Details / shared sheet keys. Prefer the Details key. */
export const COMMERCIAL_DEAL_KEY_ALIASES: Record<string, readonly string[]> = {
  business_name: ["business_name", "legal_name", "named_insured"],
  ein: ["ein", "fein"],
  operations: ["operations", "business_description", "operations_description"],
  annual_sales: ["annual_sales", "annual_revenue", "sales", "gross_sales", "revenue"],
  employee_count: ["employee_count", "employees"],
  payroll: ["payroll", "annual_payroll", "payroll_w2"],
  mailing_address: ["mailing_address"],
};

/**
 * Existing home / deal / auto / business keys reused on the lean Risk Profile.
 * Relabel in COMMERCIAL_RISK_PROFILE_FIELDS — do not mint square_footage / construction_type /
 * premises_address / premises_owned / alarm / fein / annual_revenue / primary_use / claims_last_5_years.
 */
export const COMMERCIAL_RISK_PROFILE_REUSED_KEYS = [
  ...COMMERCIAL_SHARED_DEAL_DETAIL_KEYS,
  "address1",
  "own_rent",
  "square_feet",
  "year_built",
  "construction",
  "sprinkler",
  "central_alarm",
  "protection_class",
  "class_code",
  "seasonal",
  "current_carrier",
  "building_limit",
  "fleet_size",
  "radius",
  "vehicle_usage",
  "claims_5yr",
] as const;

export const COMMERCIAL_COVERAGE_OPTIONS = [
  "Workers' Comp",
  "General Liability",
  "BOP",
  "Commercial Property",
  "Commercial Auto",
  "Umbrella",
  "Other",
] as const;

export type CommercialCoverageLine = (typeof COMMERCIAL_COVERAGE_OPTIONS)[number];

export const COMMERCIAL_SHEET_LINES: readonly ShopLine[] = [
  "workers_comp",
  "general_liability",
  "bop",
];

export function isCommercialSheetLine(line: string | null | undefined): boolean {
  return COMMERCIAL_SHEET_LINES.includes(String(line ?? "").trim() as ShopLine);
}

export const COMMERCIAL_YES_NO = ["Yes", "No"] as const;
export const COMMERCIAL_OWNED_LEASED = ["Owned", "Leased"] as const;
export const COMMERCIAL_CONSTRUCTION_OPTIONS = ["Frame", "Masonry", "Steel", "Concrete"] as const;
export const COMMERCIAL_CUSTOMER_TYPE_OPTIONS = ["B2B", "B2C", "Both"] as const;
export const COMMERCIAL_AUTO_USE_OPTIONS = ["Service", "Delivery", "Sales", "Commute", "Other"] as const;

const PRODUCT_TO_COVERAGE: Partial<Record<DealProductId, CommercialCoverageLine>> = {
  workers_comp: "Workers' Comp",
  gl: "General Liability",
  eo: "General Liability",
  bop: "BOP",
  commercial_auto: "Commercial Auto",
};

const LINE_TO_COVERAGE: Partial<Record<ShopLine, CommercialCoverageLine>> = {
  workers_comp: "Workers' Comp",
  general_liability: "General Liability",
  bop: "BOP",
  auto: "Commercial Auto",
};

function whenCoverage(line: CommercialCoverageLine): QuoteFieldDef["visibleWhen"] {
  return { field: COMMERCIAL_COVERAGE_KEY, includes: line };
}

function whenYes(field: string): QuoteFieldDef["visibleWhen"] {
  return { field, equals: ["Yes", "yes"] };
}

function yn(key: string, label: string, group: string, extra?: Partial<QuoteFieldDef>): QuoteFieldDef {
  return {
    key,
    label,
    group,
    input: "select",
    options: [...COMMERCIAL_YES_NO],
    ...extra,
  };
}

/** Lean Commercial Risk Profile — shared WC / GL / BOP catalog with coverage-chip cascades. */
export const COMMERCIAL_RISK_PROFILE_FIELDS: QuoteFieldDef[] = [
  {
    key: COMMERCIAL_COVERAGE_KEY,
    label: "Coverage lines",
    group: "Coverage",
    input: "chips",
    options: [...COMMERCIAL_COVERAGE_OPTIONS],
  },

  {
    key: "business_name",
    label: "Business name",
    group: "Business",
    extractKey: "business_name",
  },
  { key: "dba", label: "DBA", group: "Business", extractKey: "dba" },
  {
    key: "entity_type",
    label: "Entity type",
    group: "Business",
    input: "select",
    options: [...BUSINESS_ENTITY_TYPE_OPTIONS],
    extractKey: "entity_type",
  },
  { key: "ein", label: "FEIN", group: "Business", extractKey: "ein" },
  {
    key: "years_in_business",
    label: "Years in business",
    group: "Business",
    input: "number",
    extractKey: "years_in_business",
  },
  { key: "naics", label: "NAICS code", group: "Business", extractKey: "naics" },
  {
    key: "operations",
    label: "Business description",
    group: "Business",
    input: "textarea",
    extractKey: "operations",
  },
  {
    key: "annual_sales",
    label: "Annual revenue",
    group: "Business",
    input: "number",
    extractKey: "annual_sales",
  },
  {
    key: "employee_count",
    label: "Number of employees",
    group: "Business",
    input: "number",
    extractKey: "employee_count",
  },
  {
    key: "payroll",
    label: "Payroll",
    group: "Business",
    input: "number",
    extractKey: "payroll",
  },
  {
    key: "mailing_address",
    label: "Business address",
    group: "Business",
    extractKey: "mailing_address",
  },
  { key: "city", label: "City", group: "Business", extractKey: "city" },
  { key: "state", label: "State", group: "Business", extractKey: "state" },
  { key: "zip", label: "ZIP", group: "Business", extractKey: "zip" },

  yn("premises_same_as_business", "Same as business address?", "Location / premises"),
  {
    key: "address1",
    label: "Premises address",
    group: "Location / premises",
    extractKey: "address",
    visibleWhen: { field: "premises_same_as_business", equals: ["No", "no"] },
  },
  {
    key: "own_rent",
    label: "Owned or leased",
    group: "Location / premises",
    input: "select",
    options: [...COMMERCIAL_OWNED_LEASED],
  },
  {
    key: "square_feet",
    label: "Square footage",
    group: "Location / premises",
    input: "number",
    extractKey: "square_feet",
  },
  { key: "year_built", label: "Year built", group: "Location / premises", input: "number" },
  {
    key: "construction",
    label: "Construction",
    group: "Location / premises",
    input: "select",
    options: [...COMMERCIAL_CONSTRUCTION_OPTIONS],
    extractKey: "construction",
  },
  {
    key: "sprinkler",
    label: "Sprinkler",
    group: "Location / premises",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "central_alarm",
    label: "Alarm",
    group: "Location / premises",
    input: "select",
    options: [...YES_NO_OPTIONS],
  },
  {
    key: "protection_class",
    label: "Protection class",
    group: "Location / premises",
    input: "select",
    options: [...PROTECTION_CLASS_OPTIONS],
  },

  yn("subcontractors", "Uses subcontractors", "Operations"),
  {
    key: "pct_subbed",
    label: "% subcontracted",
    group: "Operations",
    input: "number",
    visibleWhen: whenYes("subcontractors"),
  },
  {
    key: "sub_cois",
    label: "COIs from subcontractors",
    group: "Operations",
    input: "select",
    options: [...COMMERCIAL_YES_NO],
    visibleWhen: whenYes("subcontractors"),
  },
  yn("seasonal", "Seasonal operations", "Operations"),

  {
    key: "class_code",
    label: "Class codes",
    group: "Workers' Comp",
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    key: "employees_ft",
    label: "Full-time employees",
    group: "Workers' Comp",
    input: "number",
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    key: "employees_pt",
    label: "Part-time employees",
    group: "Workers' Comp",
    input: "number",
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    key: "employees_seasonal",
    label: "Seasonal employees",
    group: "Workers' Comp",
    input: "number",
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    ...yn("owners_included", "Owner inclusion", "Workers' Comp"),
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    key: "prior_carrier",
    label: "Prior WC carrier",
    group: "Workers' Comp",
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    ...yn("wc_prior_claims", "Prior WC claims", "Workers' Comp"),
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    key: "wc_claims_count",
    label: "WC claim count",
    group: "Workers' Comp",
    input: "number",
    visibleWhen: whenYes("wc_prior_claims"),
  },
  {
    key: "wc_claims_paid",
    label: "WC total paid",
    group: "Workers' Comp",
    input: "number",
    visibleWhen: whenYes("wc_prior_claims"),
  },
  {
    ...yn("safety_program", "Safety program", "Workers' Comp"),
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    ...yn("drug_testing", "Drug testing", "Workers' Comp"),
    visibleWhen: whenCoverage("Workers' Comp"),
  },
  {
    ...yn("return_to_work", "Return-to-work program", "Workers' Comp"),
    visibleWhen: whenCoverage("Workers' Comp"),
  },

  {
    key: "products_services",
    label: "Products / services",
    group: "General Liability",
    input: "textarea",
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    key: "customer_type",
    label: "Customer type",
    group: "General Liability",
    input: "select",
    options: [...COMMERCIAL_CUSTOMER_TYPE_OPTIONS],
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    ...yn("premises_open_to_public", "Premises open to public", "General Liability"),
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    ...yn("liquor_liability", "Liquor liability", "General Liability"),
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    key: "current_carrier",
    label: "Prior GL carrier",
    group: "General Liability",
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    ...yn("gl_prior_claims", "Prior GL claims", "General Liability"),
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    key: "gl_claims_count",
    label: "GL claim count",
    group: "General Liability",
    input: "number",
    visibleWhen: whenYes("gl_prior_claims"),
  },
  {
    key: "gl_claims_paid",
    label: "GL total paid",
    group: "General Liability",
    input: "number",
    visibleWhen: whenYes("gl_prior_claims"),
  },
  {
    ...yn("additional_insureds", "Additional insureds required", "General Liability"),
    visibleWhen: whenCoverage("General Liability"),
  },
  {
    ...yn("waiver_of_subrogation", "Waiver of subrogation", "General Liability"),
    visibleWhen: whenCoverage("General Liability"),
  },

  {
    key: "building_limit",
    label: "Building limit",
    group: "BOP",
    input: "number",
    visibleWhen: whenCoverage("BOP"),
  },
  {
    key: "bpp_limit",
    label: "BPP limit",
    group: "BOP",
    input: "number",
    visibleWhen: whenCoverage("BOP"),
  },
  {
    ...yn("business_income", "Business income / extra expense", "BOP"),
    visibleWhen: whenCoverage("BOP"),
  },
  {
    key: "business_income_limit",
    label: "Business income / EE limit",
    group: "BOP",
    input: "number",
    visibleWhen: whenYes("business_income"),
  },
  {
    key: "property_deductible",
    label: "Deductible",
    group: "BOP",
    visibleWhen: whenCoverage("BOP"),
  },
  {
    ...yn("equipment_breakdown", "Equipment breakdown", "BOP"),
    visibleWhen: whenCoverage("BOP"),
  },

  {
    key: "property_building_limit",
    label: "Building limit",
    group: "Commercial Property",
    input: "number",
    visibleWhen: whenCoverage("Commercial Property"),
  },
  {
    key: "property_bpp_limit",
    label: "BPP limit",
    group: "Commercial Property",
    input: "number",
    visibleWhen: whenCoverage("Commercial Property"),
  },
  {
    key: "property_only_deductible",
    label: "Deductible",
    group: "Commercial Property",
    visibleWhen: whenCoverage("Commercial Property"),
  },

  {
    key: "fleet_size",
    label: "Number of units",
    group: "Commercial Auto",
    input: "number",
    visibleWhen: whenCoverage("Commercial Auto"),
  },
  {
    key: "radius",
    label: "Radius",
    group: "Commercial Auto",
    visibleWhen: whenCoverage("Commercial Auto"),
  },
  {
    key: "vehicle_usage",
    label: "Primary use",
    group: "Commercial Auto",
    input: "select",
    options: [...COMMERCIAL_AUTO_USE_OPTIONS],
    visibleWhen: whenCoverage("Commercial Auto"),
  },

  {
    key: "claims_5yr",
    label: "Claims in last 5 years",
    group: "Claims",
    input: "select",
    options: [...CLAIMS_5YR_OPTIONS],
  },
  {
    key: "claims_details",
    label: "Claim details",
    group: "Claims",
    input: "textarea",
    visibleWhen: { field: "claims_5yr", equals: ["1", "2", "3", "4+"] },
  },
  yn("open_claims_lawsuits", "Open claims / lawsuits", "Claims"),
];

export function coverageLinesFromProducts(
  selected: readonly string[] | null | undefined,
): CommercialCoverageLine[] {
  const picked = new Set<CommercialCoverageLine>();
  for (const raw of selected ?? []) {
    const id = parseDealProduct(raw);
    if (!id) continue;
    const mapped = PRODUCT_TO_COVERAGE[id];
    if (mapped) picked.add(mapped);
  }
  return COMMERCIAL_COVERAGE_OPTIONS.filter((line) => picked.has(line));
}

export function defaultCoverageForLine(line: string | null | undefined): CommercialCoverageLine | "" {
  return LINE_TO_COVERAGE[String(line ?? "").trim() as ShopLine] ?? "";
}

export function coverageLinesValueForDeal(input: {
  line?: string | null;
  products?: readonly string[] | null;
}): string {
  const fromProducts = coverageLinesFromProducts(input.products);
  if (fromProducts.length) return fromProducts.join(",");
  return defaultCoverageForLine(input.line);
}

/** First filled Deal Details / extract value for a shared commercial key (aliases included). */
export function storedValueForCommercialDealKey(
  stored: Record<string, string | null | undefined> | null | undefined,
  key: (typeof COMMERCIAL_SHARED_DEAL_DETAIL_KEYS)[number],
): string {
  const bag = stored ?? {};
  const aliases = COMMERCIAL_DEAL_KEY_ALIASES[key] ?? [key];
  for (const alias of aliases) {
    const value = String(bag[alias] ?? "").trim();
    if (value) return value;
  }
  const fallback = String(bag[key] ?? "").trim();
  return fallback;
}

