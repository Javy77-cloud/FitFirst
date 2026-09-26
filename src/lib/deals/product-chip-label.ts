import { dealProductDef, parseDealProduct, type DealProductId } from "@/lib/deals/deal-products";
import { parseProductInstanceToken, parseStorageLine } from "@/lib/deals/product-instances";

const PC_FORM_LEFTOVER = /^(ho[1-8]?|mho|dp[13]|pa|flood|homeowners|landlord)$/i;

/** Use the sheet form only when it belongs to this product (HO3 ≠ DP3 on a shared home sheet). */
export function sheetFormForProduct(
  product: DealProductId,
  sheetForm?: string | null,
): string | null {
  const form = (sheetForm ?? "").trim();
  if (!form || form.includes("~")) return null;
  const group = dealProductDef(product).group;
  if (group === "life" || group === "health") {
    return PC_FORM_LEFTOVER.test(form) ? null : form;
  }
  if (product === "homeowners") return /^ho|^mho/i.test(form) ? form : null;
  if (product === "landlord") return /^dp/i.test(form) ? form : null;
  if (product === "renters") return /^ho4$/i.test(form) ? form : null;
  if (product === "auto" || product === "motorcycle") return /auto|pa|moto/i.test(form) ? form : null;
  if (product === "flood") return /flood/i.test(form) ? form : null;
  return form;
}

/** HO3 / DP3 / Auto / Flood — never cryptic PA / FLOT. */
export function productChipLabel(input: {
  product: DealProductId;
  quotingForm?: string | null;
  sheetForm?: string | null;
}): string {
  const def = dealProductDef(input.product);
  const raw = (input.sheetForm || input.quotingForm || "").trim();
  const scoped = sheetFormForProduct(input.product, raw);
  if (def.group === "life" || def.group === "health") {
    return scoped || def.label;
  }
  const form = (scoped || def.quotingForm || "").trim();
  if (form.includes("~")) return productChipLabel({ product: input.product });
  if (input.product === "homeowners") {
    if (/^ho[3568]$/i.test(form) || /^mho$/i.test(form)) return form.toUpperCase();
    return form && form !== "Homeowners" ? form : "HO3";
  }
  if (input.product === "landlord") {
    if (/^dp[13]$/i.test(form)) return form.toUpperCase();
    return form && !/landlord/i.test(form) ? form : "DP3";
  }
  if (input.product === "renters") return /^ho4$/i.test(form) ? "HO4" : form || "HO4";
  if (input.product === "auto") {
    if (!form || /^pa$/i.test(form) || /^auto$/i.test(form) || /personal\s*auto/i.test(form)) {
      return "Auto";
    }
    return form;
  }
  if (input.product === "flood") return "Flood";
  if (input.product === "eo") return "E&O";
  return form || def.label;
}

/** Storage keys (`home~homeowners~88uvyj`) are not labels. */
export function looksLikeRawProductKey(value: string | null | undefined): boolean {
  return String(value ?? "").includes("~");
}

const STANDALONE_FORM = /^(?:HO[1-8]|MHO|DP[13]|WC|GL|BOP|CA)$/i;

/**
 * Form/product label for any shop line, product id, or storage key.
 * `home~homeowners~88uvyj` and `homeowners~88uvyj` are HO3. `home~landlord` is DP3.
 * A form code already on the screen (HO6, DP1, WC) stays that code.
 */
export function displayProductLabel(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (STANDALONE_FORM.test(value)) return value.toUpperCase();
  if (/^(?:pa|auto)$/i.test(value)) return "Auto";
  if (/^flood$/i.test(value)) return "Flood";
  const storage = parseStorageLine(value);
  if (storage?.instanceKey) {
    const instance = parseProductInstanceToken(storage.instanceKey);
    if (instance) return productChipLabel({ product: instance.productId });
  }
  if (storage) {
    const product = parseDealProduct(storage.shopLine);
    if (product) return productChipLabel({ product });
  }
  const instance = parseProductInstanceToken(value);
  if (instance) return productChipLabel({ product: instance.productId });
  const product = parseDealProduct(value);
  if (product) return productChipLabel({ product });
  if (looksLikeRawProductKey(value)) return "";
  return value;
}

const RAW_PRODUCT_TOKEN = /\b([a-z][a-z0-9_]*(?:~[a-z0-9_]+)+)\b/gi;

/** Replace raw shopLine / productKey tokens inside a sentence. Leaves HO3-style text alone. */
export function scrubRawProductKeys(text: string): string {
  if (!text.includes("~")) return text;
  return text
    .replace(RAW_PRODUCT_TOKEN, (token) => displayProductLabel(token) || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+·\s*$/g, "")
    .trim();
}

/** Desk heading or chip. A pure storage key becomes HO3 / DP3 / Auto / WC. Address labels stay. */
export function presentProductLabel(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (looksLikeRawProductKey(value)) {
    if (/^[a-z0-9_~]+$/i.test(value)) return displayProductLabel(value);
    return scrubRawProductKeys(value);
  }
  if (/^[a-z0-9_]+$/i.test(value)) return displayProductLabel(value) || value;
  return value;
}

/** Shop-lines column and deal lists. One human label per storage key, no duplicates. */
export function formatShopLinesForDesk(lines: readonly string[] | null | undefined): string {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const line of lines ?? []) {
    const label = displayProductLabel(line);
    if (!label || looksLikeRawProductKey(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.join(", ");
}
