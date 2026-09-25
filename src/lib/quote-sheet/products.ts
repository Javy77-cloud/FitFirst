import type { ShopLine } from "@/lib/domain";

/** Master-sheet product catalog. Personal PC can package Home + Auto + Flood on one deal. */
export const SHEET_PRODUCTS = [
  "homeowners",
  "renters",
  "landlord",
  "auto",
  "motorcycle",
  "commercial_auto",
  "rv",
  "boat",
  "flood",
  "gl",
  "eo",
  "bop",
  "workers_comp",
  "umbrella",
  "life",
  "health",
] as const;
export type SheetProduct = (typeof SHEET_PRODUCTS)[number];

export const SHEET_PRODUCT_LABELS: Record<SheetProduct, string> = {
  homeowners: "Homeowners",
  renters: "Renters",
  landlord: "Landlord",
  auto: "Auto",
  motorcycle: "Motorcycle",
  commercial_auto: "Commercial auto",
  rv: "RV",
  boat: "Boat/Watercraft",
  flood: "Flood",
  gl: "General liability",
  eo: "E&O",
  bop: "Businessowners (BOP)",
  workers_comp: "Workers' comp",
  umbrella: "Umbrella",
  life: "Life",
  health: "Health",
};

const LINE_PRODUCTS: Record<ShopLine, SheetProduct[]> = {
  home: ["homeowners", "renters", "landlord"],
  auto: ["auto", "motorcycle", "commercial_auto"],
  rec_rv: ["rv", "boat"],
  flood: ["flood"],
  umbrella: ["umbrella"],
  life: ["life"],
  health: ["health"],
  workers_comp: ["workers_comp"],
  general_liability: ["gl", "eo"],
  bop: ["bop"],
};

export function defaultProductForLine(line: ShopLine): SheetProduct {
  return LINE_PRODUCTS[line]?.[0] ?? "homeowners";
}

export function productsForLine(line: ShopLine): SheetProduct[] {
  return LINE_PRODUCTS[line] ?? [defaultProductForLine(line)];
}

export function isSheetProduct(value: string | null | undefined): value is SheetProduct {
  return Boolean(value && (SHEET_PRODUCTS as readonly string[]).includes(value));
}

export function parseSheetProduct(
  value: string | null | undefined,
  line: ShopLine,
): SheetProduct {
  if (isSheetProduct(value) && productsForLine(line).includes(value)) return value;
  return defaultProductForLine(line);
}
