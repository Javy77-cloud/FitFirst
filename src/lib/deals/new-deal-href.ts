import { isUuid } from "@/lib/ids";
import { packageCreateDraft } from "@/lib/deals/package-lines";
import {
  normalizeDealProducts,
  productsFromFormOrUndefined,
  type DealProductId,
} from "@/lib/deals/deal-products";

export type NewDealCreateQuery = {
  shopLines: DealProductId[];
  contactId: string | null;
  sourceDealId: string | null;
};

type Searchish = {
  getAll?: (name: string) => unknown[];
  get?: (name: string) => unknown;
};

function paramList(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
  key: string,
): string[] {
  if (params instanceof URLSearchParams) {
    return params.getAll(key).flatMap((item) => String(item).split(","));
  }
  const raw = params[key];
  const many = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  return many.flatMap((item) => String(item).split(","));
}

function paramOne(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
  key: string,
): string {
  if (params instanceof URLSearchParams) return String(params.get(key) ?? "").trim();
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value ?? "").trim();
}

function uuidOrNull(value: string): string | null {
  return isUuid(value) ? value : null;
}

/** Add New Deal dialog → create form. Never inserts a deals row. */
export function newDealCreateHref(input: {
  shopLines?: readonly string[] | null;
  contactId?: string | null;
  sourceDealId?: string | null;
}): string {
  const params = new URLSearchParams();
  for (const product of normalizeDealProducts(input.shopLines)) {
    params.append("shopLines", product);
    params.append("shopProducts", product);
  }
  if (uuidOrNull(input.contactId ?? "")) params.set("contactId", input.contactId as string);
  if (uuidOrNull(input.sourceDealId ?? "")) params.set("sourceDealId", input.sourceDealId as string);
  const query = params.toString();
  return query ? `/deals/new?${query}` : "/deals/new";
}

export function parseNewDealSearchParams(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): NewDealCreateQuery {
  const fromProducts = paramList(params, "shopProducts");
  const fromLines = paramList(params, "shopLines");
  return {
    shopLines: normalizeDealProducts(fromProducts.length ? fromProducts : fromLines),
    contactId: uuidOrNull(paramOne(params, "contactId")),
    sourceDealId: uuidOrNull(paramOne(params, "sourceDealId")),
  };
}

export function mergeNewDealFormValues(
  base: Record<string, string>,
  seed: Record<string, string>,
): Record<string, string> {
  return { ...base, ...seed };
}

/** True when Save Deal must insert a new row (never reopen a prior converted deal). */
export function forceNewShopOnSave(form?: Searchish | null): boolean {
  if (!form?.get) return false;
  const intent = String(form.get("intent") ?? "").trim();
  if (intent === "new-shop") return true;
  const contactId = String(form.get("contactId") ?? "").trim();
  const sourceDealId = String(form.get("sourceDealId") ?? "").trim();
  return isUuid(contactId) || isUuid(sourceDealId);
}

/** Product picker collected on the create form — persist these on Save. */
export function shopLinesForNewDealSave(form?: Searchish | null): DealProductId[] | undefined {
  const products = productsFromFormOrUndefined(form);
  return products?.length ? products : undefined;
}

export function packageDraftForNewDealSave(form?: Searchish | null) {
  const products = shopLinesForNewDealSave(form);
  return products ? packageCreateDraft(products) : null;
}
