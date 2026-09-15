import { isUuid } from "@/lib/ids";
import {
  normalizeSelectedPackageLines,
  packageCreateDraft,
  packageLinesFromFormOrUndefined,
  type PackageLine,
} from "@/lib/deals/package-lines";

export type NewDealCreateQuery = {
  shopLines: PackageLine[];
  /** True when the URL listed shopLines — do not invent a package for bare /deals/new. */
  explicitShopLines: boolean;
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
  for (const line of normalizeSelectedPackageLines(input.shopLines)) {
    params.append("shopLines", line);
  }
  if (uuidOrNull(input.contactId ?? "")) params.set("contactId", input.contactId as string);
  if (uuidOrNull(input.sourceDealId ?? "")) params.set("sourceDealId", input.sourceDealId as string);
  const query = params.toString();
  return query ? `/deals/new?${query}` : "/deals/new";
}

export function parseNewDealSearchParams(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): NewDealCreateQuery {
  const listed = paramList(params, "shopLines").map((item) => item.trim()).filter(Boolean);
  return {
    shopLines: normalizeSelectedPackageLines(listed),
    explicitShopLines: listed.length > 0,
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

/** Package checkboxes collected on the create form — persist these on Save. */
export function shopLinesForNewDealSave(form?: Searchish | null): PackageLine[] | undefined {
  const lines = packageLinesFromFormOrUndefined(form);
  return lines?.length ? packageCreateDraft(lines).shopLines : undefined;
}

export function packageDraftForNewDealSave(form?: Searchish | null) {
  const lines = shopLinesForNewDealSave(form);
  return lines ? packageCreateDraft(lines) : null;
}
