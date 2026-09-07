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
  { value: "workers_comp", label: "Workers' Comp" },
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
  workers_comp: "workers_comp",
  umbrella: "umbrella",
  life: "life",
  health: "health",
};

const PRODUCT_TO_FORM: Partial<Record<SheetProduct, string>> = {
  homeowners: "HO3",
  renters: "HO3",
  landlord: "DP3",
  auto: "PA",
  motorcycle: "PA",
  commercial_auto: "PA",
  flood: "FLOOD",
  gl: "GL",
  workers_comp: "WC",
};

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
}): SheetProduct {
  if (isSheetProduct(input.productParam)) return input.productParam;
  if (isSheetProduct(input.sheetProduct)) return input.sheetProduct;
  if (isSheetProduct(input.policySubType)) return input.policySubType;
  const picked = Boolean(
    input.lineOfBusiness?.trim() || input.quotingLine?.trim() || input.sheetProduct || input.policySubType,
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
