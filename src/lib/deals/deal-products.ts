import {
  LOB_TO_SHOP_LINE,
  SHOP_LINE_TO_LOB,
  isShopLine,
  type LineOfBusiness,
  type ShopLine,
} from "@/lib/domain";
import { quotingFormForProduct, sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import { isSheetProduct, type SheetProduct } from "@/lib/quote-sheet/products";
import { pipelineSlugForLine } from "@/lib/lifecycle/shop";

/**
 * Picker / chip identity. One deal can mix families.
 * Homeowners + landlord share the `home` shop line (one quote_sheet);
 * chips switch the product overlay on that sheet. Other products map 1:1
 * to an existing shop line.
 */
export const DEAL_PRODUCTS = [
  "homeowners",
  "landlord",
  "renters",
  "auto",
  "motorcycle",
  "flood",
  "rv",
  "boat",
  "umbrella",
  "gl",
  "workers_comp",
  "bop",
  "commercial_auto",
  "life_term",
  "life_whole",
  "life_iul",
  "life_final",
  "health_marketplace",
  "health_ma",
  "health_med_ab",
  "health_supplemental",
] as const;

export type DealProductId = (typeof DEAL_PRODUCTS)[number];

export type DealProductGroupId = "personal" | "commercial" | "life" | "health";

export type DealProductDef = {
  id: DealProductId;
  label: string;
  group: DealProductGroupId;
  shopLine: ShopLine;
  sheetProduct: SheetProduct;
  quotingForm: string;
  lob: LineOfBusiness;
  commercial: boolean;
};

export const DEAL_PRODUCT_DEFS: readonly DealProductDef[] = [
  {
    id: "homeowners",
    label: "Home (HO)",
    group: "personal",
    shopLine: "home",
    sheetProduct: "homeowners",
    quotingForm: "HO3",
    lob: "HO",
    commercial: false,
  },
  {
    id: "landlord",
    label: "Landlord / DP",
    group: "personal",
    shopLine: "home",
    sheetProduct: "landlord",
    quotingForm: "DP3",
    lob: "HO",
    commercial: false,
  },
  {
    id: "renters",
    label: "Renters",
    group: "personal",
    shopLine: "home",
    sheetProduct: "renters",
    quotingForm: "HO4",
    lob: "HO",
    commercial: false,
  },
  {
    id: "auto",
    label: "Auto",
    group: "personal",
    shopLine: "auto",
    sheetProduct: "auto",
    quotingForm: "PA",
    lob: "AUTO",
    commercial: false,
  },
  {
    id: "motorcycle",
    label: "Motorcycle",
    group: "personal",
    shopLine: "auto",
    sheetProduct: "motorcycle",
    quotingForm: "MOTORCYCLE",
    lob: "AUTO",
    commercial: false,
  },
  {
    id: "flood",
    label: "Flood",
    group: "personal",
    shopLine: "flood",
    sheetProduct: "flood",
    quotingForm: "FLOOD",
    lob: "FLOOD",
    commercial: false,
  },
  {
    id: "rv",
    label: "Recreational / RV",
    group: "personal",
    shopLine: "rec_rv",
    sheetProduct: "rv",
    quotingForm: "RV",
    lob: "RV",
    commercial: false,
  },
  {
    id: "boat",
    label: "Boat",
    group: "personal",
    shopLine: "rec_rv",
    sheetProduct: "boat",
    quotingForm: "BOAT",
    lob: "RV",
    commercial: false,
  },
  {
    id: "umbrella",
    label: "Umbrella",
    group: "personal",
    shopLine: "umbrella",
    sheetProduct: "umbrella",
    quotingForm: "UMBRELLA",
    lob: "UMBRELLA",
    commercial: false,
  },
  {
    id: "gl",
    label: "General liability",
    group: "commercial",
    shopLine: "general_liability",
    sheetProduct: "gl",
    quotingForm: "GL",
    lob: "GL",
    commercial: true,
  },
  {
    id: "workers_comp",
    label: "Workers' comp",
    group: "commercial",
    shopLine: "workers_comp",
    sheetProduct: "workers_comp",
    quotingForm: "WC",
    lob: "WC",
    commercial: true,
  },
  {
    id: "bop",
    label: "BOP",
    group: "commercial",
    shopLine: "bop",
    sheetProduct: "bop",
    quotingForm: "BOP",
    lob: "BOP",
    commercial: true,
  },
  {
    id: "commercial_auto",
    label: "Commercial Auto",
    group: "commercial",
    shopLine: "auto",
    sheetProduct: "commercial_auto",
    quotingForm: "CA",
    lob: "AUTO",
    commercial: true,
  },
  {
    id: "life_term",
    label: "Term Life",
    group: "life",
    shopLine: "life",
    sheetProduct: "life",
    quotingForm: "Term Life",
    lob: "LIFE",
    commercial: false,
  },
  {
    id: "life_whole",
    label: "Whole Life",
    group: "life",
    shopLine: "life",
    sheetProduct: "life",
    quotingForm: "Whole Life",
    lob: "LIFE",
    commercial: false,
  },
  {
    id: "life_iul",
    label: "IUL",
    group: "life",
    shopLine: "life",
    sheetProduct: "life",
    quotingForm: "IUL",
    lob: "LIFE",
    commercial: false,
  },
  {
    id: "life_final",
    label: "Final Expense",
    group: "life",
    shopLine: "life",
    sheetProduct: "life",
    quotingForm: "Final Expense",
    lob: "LIFE",
    commercial: false,
  },
  {
    id: "health_marketplace",
    label: "Marketplace",
    group: "health",
    shopLine: "health",
    sheetProduct: "health",
    quotingForm: "Marketplace",
    lob: "HEALTH",
    commercial: false,
  },
  {
    id: "health_ma",
    label: "Medicare Advantage",
    group: "health",
    shopLine: "health",
    sheetProduct: "health",
    quotingForm: "Medicare Advantage",
    lob: "HEALTH",
    commercial: false,
  },
  {
    id: "health_med_ab",
    label: "Medicare A&B",
    group: "health",
    shopLine: "health",
    sheetProduct: "health",
    quotingForm: "Medicare A&B",
    lob: "HEALTH",
    commercial: false,
  },
  {
    id: "health_supplemental",
    label: "Supplemental",
    group: "health",
    shopLine: "health",
    sheetProduct: "health",
    quotingForm: "Supplemental",
    lob: "HEALTH",
    commercial: false,
  },
];

export const DEAL_PRODUCT_GROUPS: { id: DealProductGroupId; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "commercial", label: "Commercial" },
  { id: "life", label: "Life" },
  { id: "health", label: "Health" },
];

const BY_ID = new Map(DEAL_PRODUCT_DEFS.map((row) => [row.id, row]));
const PRODUCT_SET = new Set<string>(DEAL_PRODUCTS);

const ALIAS_TO_PRODUCT: Record<string, DealProductId> = {
  home: "homeowners",
  ho: "homeowners",
  ho3: "homeowners",
  ho5: "homeowners",
  ho6: "homeowners",
  ho8: "homeowners",
  mho: "homeowners",
  mh: "homeowners",
  homeowners: "homeowners",
  landlord: "landlord",
  dp3: "landlord",
  dp1: "landlord",
  renters: "renters",
  ho4: "renters",
  mdp: "renters",
  auto: "auto",
  pa: "auto",
  motorcycle: "motorcycle",
  flood: "flood",
  rv: "rv",
  rec_rv: "rv",
  boat: "boat",
  umbrella: "umbrella",
  gl: "gl",
  general_liability: "gl",
  workers_comp: "workers_comp",
  wc: "workers_comp",
  bop: "bop",
  commercial_auto: "commercial_auto",
  ca: "commercial_auto",
  life: "life_term",
  life_term: "life_term",
  term: "life_term",
  "term life": "life_term",
  term_life: "life_term",
  life_whole: "life_whole",
  whole: "life_whole",
  "whole life": "life_whole",
  whole_life: "life_whole",
  life_iul: "life_iul",
  iul: "life_iul",
  life_final: "life_final",
  "final expense": "life_final",
  final_expense: "life_final",
  health: "health_marketplace",
  health_marketplace: "health_marketplace",
  marketplace: "health_marketplace",
  health_ma: "health_ma",
  "medicare advantage": "health_ma",
  medicare_advantage: "health_ma",
  health_med_ab: "health_med_ab",
  "medicare a&b": "health_med_ab",
  medicare_ab: "health_med_ab",
  health_supplemental: "health_supplemental",
  supplemental: "health_supplemental",
};

export function isDealProductId(value: string | null | undefined): value is DealProductId {
  return Boolean(value && PRODUCT_SET.has(value));
}

export function dealProductDef(id: DealProductId): DealProductDef {
  return BY_ID.get(id)!;
}

export function parseDealProduct(raw: string | null | undefined): DealProductId | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (isDealProductId(value)) return value;
  const alias = ALIAS_TO_PRODUCT[value.toLowerCase()];
  if (alias) return alias;
  const fromForm = sheetProductForQuotingForm(value);
  if (fromForm === "homeowners") return "homeowners";
  if (fromForm === "landlord") return "landlord";
  if (fromForm === "renters") return "renters";
  if (fromForm === "auto") return "auto";
  if (fromForm === "motorcycle") return "motorcycle";
  if (fromForm === "flood") return "flood";
  if (fromForm === "rv") return "rv";
  if (fromForm === "boat") return "boat";
  if (fromForm === "umbrella") return "umbrella";
  if (fromForm === "gl") return "gl";
  if (fromForm === "workers_comp") return "workers_comp";
  if (fromForm === "bop") return "bop";
  if (fromForm === "commercial_auto") return "commercial_auto";
  if (fromForm === "life") return "life_term";
  if (fromForm === "health") return "health_marketplace";
  return null;
}

/** Default Home (HO) when nothing is picked. Catalog order is picker order. */
export function normalizeDealProducts(
  selected: readonly string[] | null | undefined,
): DealProductId[] {
  const picked = new Set<DealProductId>();
  for (const raw of selected ?? []) {
    const id = parseDealProduct(raw);
    if (id) picked.add(id);
  }
  const ordered = DEAL_PRODUCTS.filter((id) => picked.has(id));
  return ordered.length ? ordered : ["homeowners"];
}

export function productsFromForm(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): DealProductId[] {
  if (!form) return ["homeowners"];
  const names = ["shopProducts", "shopLines"];
  const raw: string[] = [];
  for (const name of names) {
    const many = typeof form.getAll === "function" ? form.getAll(name) : [];
    raw.push(...(many ?? []).map((value) => String(value ?? "").trim()).filter(Boolean));
    if (raw.length) break;
  }
  if (!raw.length && typeof form.get === "function") {
    const single = String(form.get("shopProducts") ?? form.get("shopLines") ?? "").trim();
    if (single) raw.push(...single.split(","));
  }
  if (!raw.length) return ["homeowners"];
  return normalizeDealProducts(raw);
}

export function productsFromFormOrUndefined(
  form?: { getAll?: (name: string) => unknown[]; get?: (name: string) => unknown } | null,
): DealProductId[] | undefined {
  if (!form) return undefined;
  const names = ["shopProducts", "shopLines"];
  const raw: string[] = [];
  for (const name of names) {
    const many = typeof form.getAll === "function" ? form.getAll(name) : [];
    raw.push(...(many ?? []).map((value) => String(value ?? "").trim()).filter(Boolean));
    if (raw.length) break;
  }
  if (!raw.length && typeof form.get === "function") {
    const single = String(form.get("shopProducts") ?? form.get("shopLines") ?? "").trim();
    if (single) raw.push(...single.split(","));
  }
  if (!raw.length) return undefined;
  return normalizeDealProducts(raw);
}

export function shopLinesFromProducts(products: readonly DealProductId[]): ShopLine[] {
  const lines: ShopLine[] = [];
  for (const id of normalizeDealProducts(products)) {
    const line = dealProductDef(id).shopLine;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines.length ? lines : ["home"];
}

export function countHomeProducts(products: readonly string[] | null | undefined): number {
  return normalizeDealProducts(products).filter((id) => dealProductDef(id).shopLine === "home").length;
}

export function splitHomeProducts(products: readonly string[] | null | undefined): boolean {
  return countHomeProducts(products) > 1;
}

export function lobsFromProducts(products: readonly DealProductId[]): string[] {
  const lobs: string[] = [];
  for (const id of normalizeDealProducts(products)) {
    const lob = dealProductDef(id).lob;
    if (!lobs.includes(lob)) lobs.push(lob);
  }
  return lobs.length ? lobs : ["HO"];
}

export function hasCommercialProduct(products: readonly string[] | null | undefined): boolean {
  return normalizeDealProducts(products).some((id) => dealProductDef(id).commercial);
}

export function pipelineSlugForProducts(products: readonly DealProductId[]): string {
  const groups = new Set(normalizeDealProducts(products).map((id) => dealProductDef(id).group));
  const hasPc = [...groups].some((group) => group === "personal" || group === "commercial");
  if (hasPc) return "p-c";
  if (groups.has("life") && !groups.has("health")) return "life";
  if (groups.has("health") && !groups.has("life")) return "health";
  if (groups.has("life")) return "life";
  return "p-c";
}

export function primaryDealProduct(products: readonly DealProductId[]): DealProductId {
  return normalizeDealProducts(products)[0] ?? "homeowners";
}

export type DealProductDraft = {
  products: DealProductId[];
  shopLines: ShopLine[];
  primary: DealProductId;
  lineOfBusiness: LineOfBusiness;
  quotingLine: ShopLine;
  quotingForm: string;
  sheetProduct: SheetProduct;
  riskType: "property" | "auto";
  accountKind: "personal" | "commercial";
  bindTarget: "contact" | "account";
  pipelineSlug: string;
};

export function productCreateDraft(
  selected: readonly string[] | null | undefined,
): DealProductDraft {
  const products = normalizeDealProducts(selected);
  const primary = primaryDealProduct(products);
  const def = dealProductDef(primary);
  const shopLines = shopLinesFromProducts(products);
  const commercial = hasCommercialProduct(products);
  return {
    products,
    shopLines,
    primary,
    lineOfBusiness: def.lob,
    quotingLine: def.shopLine,
    quotingForm: def.quotingForm,
    sheetProduct: def.sheetProduct,
    riskType: def.shopLine === "auto" && shopLines.length === 1 ? "auto" : "property",
    accountKind: commercial ? "commercial" : "personal",
    bindTarget: commercial && products.every((id) => dealProductDef(id).commercial)
      ? "account"
      : "contact",
    pipelineSlug: pipelineSlugForProducts(products),
  };
}

export function productMatchesFamily(
  product: DealProductId,
  family: "pc" | "life" | "health",
): boolean {
  const group = dealProductDef(product).group;
  if (family === "life") return group === "life";
  if (family === "health") return group === "health";
  return group === "personal" || group === "commercial";
}

/**
 * Life/Health LOB or quoting_line wins over leftover HO3 / home shop_lines.
 * Tyler-style rows: title Term Life, shop_lines still ["home"].
 */
export function dealFamilyFromHints(input: {
  shopProducts?: readonly string[] | null;
  shopLines?: readonly string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): "pc" | "life" | "health" {
  const lob = (input.lineOfBusiness ?? "").trim().toUpperCase();
  const quoting = (input.quotingLine ?? "").trim().toLowerCase();
  if (lob === "LIFE" || quoting === "life") return "life";
  if (lob === "HEALTH" || quoting === "health") return "health";
  const formProduct = parseDealProduct(input.quotingForm) ?? parseDealProduct(input.policySubType);
  if (formProduct) {
    const group = dealProductDef(formProduct).group;
    if (group === "life") return "life";
    if (group === "health") return "health";
  }
  return "pc";
}

function defaultProductForFamily(family: "life" | "health"): DealProductId {
  return family === "life" ? "life_term" : "health_marketplace";
}

function onlyStaleHomeProducts(products: readonly DealProductId[]): boolean {
  return (
    products.length > 0 &&
    products.every((id) => dealProductDef(id).shopLine === "home")
  );
}

/** Infer chips from stored shop_lines + quoting form when shop_products is empty. */
export function inferDealProducts(input: {
  shopProducts?: readonly string[] | null;
  shopLines?: readonly string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): DealProductId[] {
  const family = dealFamilyFromHints(input);
  const stored = (input.shopProducts ?? [])
    .map(parseDealProduct)
    .filter((id): id is DealProductId => Boolean(id));
  if (stored.length) {
    const staleHomeOnLifeHealth =
      (family === "life" || family === "health") && onlyStaleHomeProducts(stored);
    if (!staleHomeOnLifeHealth) return normalizeDealProducts(stored);
  }

  const formProduct = parseDealProduct(input.quotingForm) ?? parseDealProduct(input.policySubType);
  if (family === "life" || family === "health") {
    if (formProduct && productMatchesFamily(formProduct, family)) return [formProduct];
    const fromQuoting = parseDealProduct(input.quotingLine);
    if (fromQuoting && productMatchesFamily(fromQuoting, family)) return [fromQuoting];
    const fromLob = parseDealProduct(LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()] ?? "");
    if (fromLob && productMatchesFamily(fromLob, family)) return [fromLob];
    return [defaultProductForFamily(family)];
  }

  const fromShop = (input.shopLines ?? [])
    .map((value) => parseDealProduct(value))
    .filter((id): id is DealProductId => Boolean(id));
  if (fromShop.length) {
    if (formProduct && dealProductDef(fromShop[0]!).shopLine === dealProductDef(formProduct).shopLine) {
      fromShop[0] = formProduct;
    }
    return normalizeDealProducts(fromShop);
  }
  if (formProduct) return [formProduct];
  const fromQuoting = parseDealProduct(input.quotingLine);
  if (fromQuoting) return [fromQuoting];
  const fromLob = LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()];
  const fromLobProduct = parseDealProduct(fromLob);
  if (fromLobProduct) return [fromLobProduct];
  return ["homeowners"];
}

/** Persist patch when Life/Health still carries leftover home shop_lines. */
export function lifeHealthShopRepair(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): { shopLines: ShopLine[]; shopProducts: DealProductId[] } | null {
  const family = dealFamilyFromHints(input);
  if (family !== "life" && family !== "health") return null;
  const shopProducts = inferDealProducts(input);
  const shopLines = shopLinesFromProducts(shopProducts);
  const currentLines = (input.shopLines ?? []).map((line) => String(line).trim().toLowerCase());
  const currentProducts = (input.shopProducts ?? []).map((row) => String(row).trim()).filter(Boolean);
  const staleHome = currentLines.includes("home") && !shopLines.includes("home");
  const missingFamilyLine = !currentLines.includes(family);
  const missingProducts = currentProducts.length === 0;
  if (!staleHome && !missingFamilyLine && !missingProducts) return null;
  return { shopLines, shopProducts };
}

export function resolveVisibleDealProducts(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): DealProductId[] {
  return inferDealProducts(input);
}

export function resolveActiveDealProduct(input: {
  productParam?: string | null;
  lineParam?: string | null;
  products: readonly DealProductId[];
  quotingLine?: string | null;
  quotingForm?: string | null;
  lineOfBusiness?: string | null;
}): DealProductId {
  const products = normalizeDealProducts(input.products);
  const fromProduct = parseDealProduct(input.productParam);
  if (fromProduct && products.includes(fromProduct)) return fromProduct;
  const fromLine = parseDealProduct(input.lineParam);
  if (fromLine && products.includes(fromLine)) return fromLine;
  if (fromLine) {
    const onLine = products.find((id) => dealProductDef(id).shopLine === dealProductDef(fromLine).shopLine);
    if (onLine) return onLine;
  }
  const fromForm = parseDealProduct(input.quotingForm);
  if (fromForm && products.includes(fromForm)) return fromForm;
  const quoting = parseDealProduct(input.quotingLine);
  if (quoting && products.includes(quoting)) return quoting;
  const fromLob = parseDealProduct(LOB_TO_SHOP_LINE[(input.lineOfBusiness ?? "").toUpperCase()] ?? "");
  if (fromLob && products.includes(fromLob)) return fromLob;
  return products[0] ?? "homeowners";
}

export function dealProductSwitcherHref(input: {
  dealId: string;
  product: DealProductId;
  tab?: string | null;
}): string {
  const def = dealProductDef(input.product);
  const query = new URLSearchParams();
  if (input.tab) query.set("tab", input.tab);
  query.set("line", def.shopLine);
  query.set("product", def.sheetProduct);
  return `/deals/${input.dealId}?${query.toString()}`;
}

export function mergeDealProducts(
  existing: readonly string[] | null | undefined,
  next: readonly string[] | null | undefined,
): DealProductId[] {
  return normalizeDealProducts([...(existing ?? []), ...(next ?? [])]);
}

export function sheetLineForProduct(product: DealProductId): ShopLine {
  return dealProductDef(product).shopLine;
}

export function quotingFormForDealProduct(product: DealProductId): string {
  return dealProductDef(product).quotingForm;
}

export function sheetProductForDealProduct(product: DealProductId): SheetProduct {
  return dealProductDef(product).sheetProduct;
}

export function defaultFormForShopLineFromProducts(line: ShopLine): string {
  const hit = DEAL_PRODUCT_DEFS.find((row) => row.shopLine === line);
  if (hit) return hit.quotingForm;
  return quotingFormForProduct(isSheetProduct(line) ? line : "homeowners") ?? "HO3";
}

export function productsForShopLine(line: ShopLine): DealProductId[] {
  return DEAL_PRODUCT_DEFS.filter((row) => row.shopLine === line).map((row) => row.id);
}

export function familyForProducts(
  products: readonly DealProductId[],
): "pc" | "life" | "health" {
  const slug = pipelineSlugForProducts(products);
  if (slug === "life") return "life";
  if (slug === "health") return "health";
  return "pc";
}

export function pipelineSlugForDealLine(line: string): string {
  return pipelineSlugForLine(line);
}

export function shopLineToDefaultProduct(line: ShopLine): DealProductId {
  return parseDealProduct(line) ?? "homeowners";
}

export function uniqueLobsToBind(input: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
}): string[] {
  const products = inferDealProducts(input);
  if (products.length) return lobsFromProducts(products);
  const fromShop = (input.shopLines ?? []).filter(isShopLine).map((line) => SHOP_LINE_TO_LOB[line]);
  if (fromShop.length) return [...new Set(fromShop)];
  const lob = (input.lineOfBusiness ?? "HO").toUpperCase();
  return [lob || "HO"];
}
