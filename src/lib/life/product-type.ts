import { normalizeLifeProductType } from "@/lib/quote-sheet/sheet-defaults";

export const LIFE_CATALOG_PRODUCT_TYPES = [
  "Term",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life",
  "Variable Universal Life",
  "Final Expense",
] as const;

export type LifeCatalogProductType = (typeof LIFE_CATALOG_PRODUCT_TYPES)[number];

const DEAL_PRODUCT_TO_TYPE: Record<string, LifeCatalogProductType> = {
  life_term: "Term",
  life_whole: "Whole Life",
  life_ul: "Universal Life",
  life_iul: "Indexed Universal Life",
  life_vul: "Variable Universal Life",
  life_final: "Final Expense",
};

const WHOLE_LIFE_TOKENS = new Set(["wl", "giwl", "siwl", "whole"]);
const TERM_TOKENS = new Set(["term"]);
const IUL_TOKENS = new Set(["iul", "eiul"]);
const VUL_TOKENS = new Set(["vul"]);
const UL_TOKENS = new Set(["ul"]);
const FINAL_EXPENSE_TOKENS = new Set(["fe"]);

function catalogTokens(name: string, slug = ""): string[] {
  return `${name} ${slug}`
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Infer MATRIX catalog product types from the product name/slug.
 * Mixed labels (Term & Express UL/IUL) keep every matching type so a Term
 * request still sees the term sleeve and an IUL request still sees IUL.
 */
export function lifeCatalogProductTypes(
  productName: string,
  productSlug = "",
): LifeCatalogProductType[] {
  const types = new Set<LifeCatalogProductType>();
  const text = `${productName} ${productSlug}`.trim();
  if (!text) return [];

  const fromLabel = normalizeLifeProductType(text);
  if (fromLabel && (LIFE_CATALOG_PRODUCT_TYPES as readonly string[]).includes(fromLabel)) {
    types.add(fromLabel as LifeCatalogProductType);
  }

  const tokens = catalogTokens(productName, productSlug);
  const joined = tokens.join(" ");
  if (joined.includes("final expense") || (tokens.includes("final") && tokens.includes("expense"))) {
    types.add("Final Expense");
  }
  if (joined.includes("whole life") || tokens.some((token) => WHOLE_LIFE_TOKENS.has(token))) {
    types.add("Whole Life");
  }
  if (tokens.some((token) => TERM_TOKENS.has(token))) types.add("Term");
  if (tokens.some((token) => IUL_TOKENS.has(token)) || joined.includes("indexed")) {
    types.add("Indexed Universal Life");
  }
  if (tokens.some((token) => VUL_TOKENS.has(token)) || joined.includes("variable")) {
    types.add("Variable Universal Life");
  }
  if (tokens.some((token) => UL_TOKENS.has(token)) || joined.includes("universal life")) {
    types.add("Universal Life");
  }
  if (tokens.some((token) => FINAL_EXPENSE_TOKENS.has(token))) types.add("Final Expense");

  return LIFE_CATALOG_PRODUCT_TYPES.filter((type) => types.has(type));
}

export function lifeProductMatchesRequestedType(
  product: { productName: string; productSlug?: string },
  requestedType: string | null | undefined,
): boolean {
  const requested = normalizeLifeProductType(requestedType);
  if (!requested) return true;
  return lifeCatalogProductTypes(product.productName, product.productSlug ?? "").includes(
    requested as LifeCatalogProductType,
  );
}

export function filterLifeProductsByRequestedType<T extends { productName: string; productSlug?: string }>(
  products: readonly T[],
  requestedType: string | null | undefined,
): T[] {
  const requested = normalizeLifeProductType(requestedType);
  if (!requested) return [...products];
  return products.filter((product) => lifeProductMatchesRequestedType(product, requested));
}

/**
 * Resolve the Life product type the deal is shopping.
 * Deal pipeline / policy form / product chip win over a sheet default of Term
 * so a Whole Life deal is not filtered as Term just because the blank sheet
 * seeds `product_type: Term`.
 */
export function resolveDealLifeProductType(input: {
  productId?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeProductType?: string | null;
  sheetProductType?: string | null;
}): string {
  const fromDeal = [
    input.lifeProductType,
    input.quotingForm,
    input.policySubType,
    DEAL_PRODUCT_TO_TYPE[String(input.productId ?? "").trim()] ?? "",
  ]
    .map((value) => normalizeLifeProductType(value))
    .find(Boolean);
  if (fromDeal) return fromDeal;
  return normalizeLifeProductType(input.sheetProductType);
}
