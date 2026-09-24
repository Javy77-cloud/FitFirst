import { isShopLine, type ShopLine } from "@/lib/domain";
import {
  dealProductDef,
  dealFamilyFromHints,
  inferDealProducts,
  parseDealProduct,
  type DealProductId,
} from "@/lib/deals/deal-products";

/**
 * One deal can hold the same product more than once (two HO3 homes).
 * The first copy keeps the plain product id so existing rows stay valid.
 * Another copy is `homeowners~k7f3a2`. Shop sheets for a copy use
 * `home~homeowners~k7f3a2`, which fits the existing (deal, line) unique index.
 */
export const PRODUCT_INSTANCE_SEPARATOR = "~";

export type ProductInstance = {
  key: string;
  productId: DealProductId;
};

const SUFFIX_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function newInstanceSuffix(): string {
  const bytes = new Uint8Array(6);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (const byte of bytes) out += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
  return out;
}

export function newDuplicateInstanceKey(productId: DealProductId): string {
  return `${productId}${PRODUCT_INSTANCE_SEPARATOR}${newInstanceSuffix()}`;
}

export function parseProductInstanceToken(raw: string | null | undefined): ProductInstance | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const sep = value.indexOf(PRODUCT_INSTANCE_SEPARATOR);
  const head = sep === -1 ? value : value.slice(0, sep);
  const productId = parseDealProduct(head);
  if (!productId) return null;
  if (sep === -1) return { key: productId, productId };
  const suffix = value.slice(sep + 1).trim().toLowerCase();
  if (!/^[a-z0-9]{4,24}$/.test(suffix) || suffix.includes(PRODUCT_INSTANCE_SEPARATOR)) return null;
  return { key: `${productId}${PRODUCT_INSTANCE_SEPARATOR}${suffix}`, productId };
}

export function productIdFromInstanceKey(key: string | null | undefined): DealProductId | null {
  return parseProductInstanceToken(key)?.productId ?? null;
}

export function isDuplicateInstance(instance: ProductInstance | null | undefined): boolean {
  return Boolean(instance && instance.key !== instance.productId);
}

/** Keep order. A repeated plain product id becomes a new copy. */
export function normalizeProductInstanceList(
  selected: readonly string[] | null | undefined,
): ProductInstance[] {
  const out: ProductInstance[] = [];
  const seen = new Set<string>();
  for (const raw of selected ?? []) {
    const parsed = parseProductInstanceToken(raw);
    if (!parsed) continue;
    if (!seen.has(parsed.key)) {
      seen.add(parsed.key);
      out.push(parsed);
      continue;
    }
    if (parsed.key === parsed.productId) {
      const dup: ProductInstance = {
        key: newDuplicateInstanceKey(parsed.productId),
        productId: parsed.productId,
      };
      seen.add(dup.key);
      out.push(dup);
    }
  }
  return out;
}

export function addProductInstance(
  existing: readonly string[] | null | undefined,
  productId: DealProductId,
): ProductInstance[] {
  const current = normalizeProductInstanceList(existing);
  const has = current.some((row) => row.productId === productId);
  const next: ProductInstance = has
    ? { key: newDuplicateInstanceKey(productId), productId }
    : { key: productId, productId };
  return [...current, next];
}

export function removeProductInstance(
  existing: readonly string[] | null | undefined,
  key: string,
): ProductInstance[] {
  const wanted = parseProductInstanceToken(key)?.key ?? key;
  return normalizeProductInstanceList(existing).filter((row) => row.key !== wanted);
}

export type StorageLine = {
  shopLine: ShopLine;
  storageLine: string;
  instanceKey: string | null;
};

/**
 * Quote-sheet line for one product tab.
 * Without peers, the first plain id keeps the shop line (`home`) and a `~suffix`
 * copy gets `home~homeowners~k7f3a2` — existing rows stay valid.
 * With peers, only the first product on that shop line keeps the plain line.
 * Homeowners and landlord are different houses, so landlord stores `home~landlord`
 * instead of sharing the homeowners sheet.
 */
export function storageLineForInstance(
  instance: ProductInstance,
  peers?: readonly ProductInstance[],
): string {
  const shopLine = dealProductDef(instance.productId).shopLine;
  if (!peers?.length) {
    if (instance.key === instance.productId) return shopLine;
    return `${shopLine}${PRODUCT_INSTANCE_SEPARATOR}${instance.key}`;
  }
  const first = peers.find((row) => dealProductDef(row.productId).shopLine === shopLine);
  if (first?.key === instance.key) return shopLine;
  return `${shopLine}${PRODUCT_INSTANCE_SEPARATOR}${instance.key}`;
}

export function parseStorageLine(raw: string | null | undefined): StorageLine | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (isShopLine(value)) return { shopLine: value, storageLine: value, instanceKey: null };
  const sep = value.indexOf(PRODUCT_INSTANCE_SEPARATOR);
  if (sep <= 0) return null;
  const shopLine = value.slice(0, sep);
  if (!isShopLine(shopLine)) return null;
  const instance = parseProductInstanceToken(value.slice(sep + 1));
  if (!instance) return null;
  return {
    shopLine,
    instanceKey: instance.key,
    storageLine: `${shopLine}${PRODUCT_INSTANCE_SEPARATOR}${instance.key}`,
  };
}

/**
 * Quote-sheet lines whose product copy is not on the deal anymore.
 * Rosa's `home~homeowners~wwr8p9` is one of these. Keep the row.
 */
export function orphanQuoteSheetLines(
  lines: readonly string[],
  instances: readonly ProductInstance[],
): string[] {
  const owned = new Set(instances.map((row) => storageLineForInstance(row, instances)));
  return lines.filter((line) => {
    const parsed = parseStorageLine(line);
    if (!parsed) return false;
    return !owned.has(parsed.storageLine);
  });
}

export function requireStorageLine(raw: string | null | undefined): StorageLine {
  const parsed = parseStorageLine(raw);
  if (!parsed) throw new Error("Unknown line");
  return parsed;
}

export function instanceKeyFromShopLine(shopLine: string | null | undefined): string | null {
  return parseStorageLine(shopLine)?.instanceKey ?? null;
}

const INSTANCE_WHY_RE = /\[\[ff-instance:([a-z0-9_~]+)\]\]/gi;

export function instanceKeyFromAttemptWhy(why: string | null | undefined): string | null {
  const match = INSTANCE_WHY_RE.exec(why ?? "");
  INSTANCE_WHY_RE.lastIndex = 0;
  const token = match?.[1]?.trim();
  return parseProductInstanceToken(token)?.key ?? null;
}

export function displayAttemptWhy(why: string | null | undefined): string {
  return (why ?? "").replace(INSTANCE_WHY_RE, "").replace(/\s+/g, " ").trim();
}

export function tagAttemptWhy(why: string, instanceKey: string | null | undefined): string {
  const clean = displayAttemptWhy(why);
  const instance = parseProductInstanceToken(instanceKey);
  if (!instance || instance.key === instance.productId) return clean;
  return `${clean} [[ff-instance:${instance.key}]]`.trim();
}

/** Untagged history stays on the first copy. A tagged attempt belongs to that copy only. */
export function attemptLogMatchesInstance(
  why: string | null | undefined,
  instanceKey: string | null | undefined,
): boolean {
  const instance = parseProductInstanceToken(instanceKey);
  const tagged = instanceKeyFromAttemptWhy(why);
  if (!instance) return !tagged;
  if (tagged) return tagged === instance.key;
  return instance.key === instance.productId;
}

export function resolveVisibleProductInstances(input: {
  shopProducts?: readonly string[] | null;
  shopLines?: readonly string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): ProductInstance[] {
  const family = dealFamilyFromHints(input);
  const stored = (input.shopProducts ?? [])
    .map((row) => parseProductInstanceToken(row))
    .filter((row): row is ProductInstance => Boolean(row));
  if (stored.length) {
    const staleHome =
      (family === "life" || family === "health") &&
      stored.every((row) => dealProductDef(row.productId).shopLine === "home");
    if (!staleHome) return stored;
  }
  return inferDealProducts(input).map((productId) => ({ key: productId, productId }));
}

export function resolveActiveProductInstance(input: {
  productParam?: string | null;
  lineParam?: string | null;
  instances: readonly ProductInstance[];
  quotingLine?: string | null;
  quotingForm?: string | null;
}): ProductInstance {
  const instances = input.instances.length
    ? input.instances
    : [{ key: "homeowners" as const, productId: "homeowners" as const }];
  const fromProduct = parseProductInstanceToken(input.productParam);
  if (fromProduct) {
    const hit = instances.find((row) => row.key === fromProduct.key);
    if (hit) return hit;
  }
  const fromLine = parseStorageLine(input.lineParam);
  if (fromLine?.instanceKey) {
    const hit = instances.find((row) => row.key === fromLine.instanceKey);
    if (hit) return hit;
  }
  if (fromLine && !fromLine.instanceKey) {
    const onLine = instances.find(
      (row) =>
        row.key === row.productId && dealProductDef(row.productId).shopLine === fromLine.shopLine,
    );
    if (onLine) return onLine;
  }
  const fromForm = parseDealProduct(input.quotingForm);
  if (fromForm) {
    const hit = instances.find((row) => row.key === fromForm);
    if (hit) return hit;
  }
  return instances[0]!;
}
