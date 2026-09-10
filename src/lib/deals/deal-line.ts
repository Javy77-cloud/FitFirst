import {
  LOB_TO_SHOP_LINE,
  SHOP_LINE_TO_LOB,
  parseShopLine,
  type LineOfBusiness,
  type ShopLine,
} from "@/lib/domain";
import {
  defaultProductForLine,
  isSheetProduct,
  type SheetProduct,
} from "@/lib/quote-sheet/products";

/** One deal, one product. Default Homeowners when nothing is picked. */
export const DEAL_LINE_OPTIONS: { value: SheetProduct; label: string }[] = [
  { value: "homeowners", label: "Homeowners" },
  { value: "renters", label: "Renters" },
  { value: "landlord", label: "Landlord" },
  { value: "auto", label: "Auto" },
  { value: "rv", label: "RV" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "flood", label: "Flood" },
  { value: "gl", label: "GL" },
  { value: "bop", label: "BOP" },
  { value: "workers_comp", label: "Workers Comp" },
  { value: "commercial_auto", label: "Commercial Auto" },
  { value: "umbrella", label: "Umbrella" },
  { value: "life", label: "Life" },
  { value: "health", label: "Health" },
];

const PRODUCT_TO_LINE: Record<SheetProduct, ShopLine> = {
  homeowners: "home",
  renters: "home",
  landlord: "home",
  auto: "auto",
  motorcycle: "auto",
  commercial_auto: "auto",
  rv: "rec_rv",
  flood: "flood",
  gl: "general_liability",
  bop: "bop",
  workers_comp: "workers_comp",
  umbrella: "umbrella",
  life: "life",
  health: "health",
};

const PRODUCT_TO_FORM: Partial<Record<SheetProduct, string>> = {
  homeowners: "HO3",
  renters: "HO4",
  landlord: "DP3",
  auto: "PA",
  motorcycle: "PA",
  commercial_auto: "PA",
  flood: "FLOOD",
  gl: "GL",
  bop: "BOP",
  workers_comp: "WC",
  rv: "RV",
  umbrella: "UMBRELLA",
};

/** Master-sheet product catalog driven by quoting form / insurance subtype. */
const FORM_TO_PRODUCT: Record<string, SheetProduct> = {
  HO3: "homeowners",
  HO5: "homeowners", // stub → home catalog like HO3
  HO6: "homeowners",
  DP1: "landlord",
  DP3: "landlord",
  HO4: "renters",
  PA: "auto",
  RV: "rv",
  UMBRELLA: "umbrella",
  FLOOD: "flood",
  GL: "gl",
  WC: "workers_comp",
  BOP: "bop",
};

export function sheetProductForQuotingForm(formId: string | null | undefined): SheetProduct | null {
  if (!formId) return null;
  return FORM_TO_PRODUCT[formId] ?? null;
}

export function shopLineForProduct(product: SheetProduct): ShopLine {
  return PRODUCT_TO_LINE[product];
}

export function lobForProduct(product: SheetProduct): LineOfBusiness {
  return SHOP_LINE_TO_LOB[shopLineForProduct(product)];
}

export function quotingFormForProduct(product: SheetProduct): string | undefined {
  return PRODUCT_TO_FORM[product];
}

export function resolveDealProduct(input: {
  productParam?: string | null;
  sheetProduct?: string | null;
  policySubType?: string | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
}): SheetProduct {
  if (isSheetProduct(input.productParam)) return input.productParam;
  const fromForm = sheetProductForQuotingForm(input.quotingForm);
  if (fromForm) return fromForm;
  if (isSheetProduct(input.sheetProduct)) return input.sheetProduct;
  if (isSheetProduct(input.policySubType)) return input.policySubType;
  const picked = Boolean(
    input.lineOfBusiness?.trim() ||
      input.quotingLine?.trim() ||
      input.sheetProduct ||
      input.policySubType ||
      input.quotingForm,
  );
  if (!picked) return "homeowners";
  const line = parseShopLine(
    input.quotingLine,
    LOB_TO_SHOP_LINE[input.lineOfBusiness ?? ""] ?? "home",
  );
  return defaultProductForLine(line);
}

export function resolveDealSheetLine(input: {
  lineParam?: string | null;
  quotingLine?: string | null;
  lineOfBusiness?: string | null;
}): ShopLine {
  return parseShopLine(
    input.lineParam,
    parseShopLine(input.quotingLine, LOB_TO_SHOP_LINE[input.lineOfBusiness ?? ""] ?? "home"),
  );
}
