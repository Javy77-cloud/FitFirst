export const FLASH_PARAM = "flash";
export const FLASH_KIND_PARAM = "flashKind";
export const FLASH_EVENT = "ff-flash";
export const FLASH_DISMISS_MS = 2500;
/** sessionStorage key so ActionToastHost survives Suspense remount after ?flash= strip. */
export const FLASH_STORAGE_KEY = "ff-action-toast";

export type FlashKind = "success" | "error";

/** Stable keys used by server actions. Host resolves these to on-screen copy. */
export const FLASH_COPY = {
  "deal-details-saved": "Deal details saved",
  "sheet-saved": "Sheet saved",
  "sheet-filled": "Sheet filled from source",
  "field-confirmed": "Field confirmed",
  "tags-saved": "Tags saved",
  "tag-added": "Tag added",
  "tag-created": "Tag created",
  "tag-color-saved": "Tag color saved",
  "document-deleted": "Document deleted",
  "document-replaced": "Document replaced",
  "document-uploaded": "Document uploaded",
  "image-uploaded": "Image uploaded",
  "market-added": "Market added",
  "deal-updated": "Deal updated",
  "quotes-requested": "Quotes requested",
} as const;

export type FlashKey = keyof typeof FLASH_COPY;

export type FlashPayload = {
  message: string;
  kind: FlashKind;
};

function storage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Persist flash copy before router.replace so a remount can restore the toast. */
export function persistFlash(payload: FlashPayload): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(FLASH_STORAGE_KEY, JSON.stringify({ message: payload.message, kind: payload.kind }));
  } catch {
    // quota / private mode — toast still paints from in-memory state when it can
  }
}

/** Read a durable flash. Survives ActionToastHost remount after query strip. */
export function readPersistedFlash(): FlashPayload | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(FLASH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { message?: unknown; kind?: unknown };
    const message = resolveFlashMessage(typeof parsed.message === "string" ? parsed.message : null);
    if (!message) return null;
    return { message, kind: parsed.kind === "error" ? "error" : "success" };
  } catch {
    return null;
  }
}

export function clearPersistedFlash(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(FLASH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Land Save Deal Details on the details tab; keep line/product when the form sent them. */
export function dealDetailsSavedHref(
  dealId: string,
  extras?: { line?: string | null; product?: string | null },
): string {
  const query = new URLSearchParams({ tab: "details" });
  const line = extras?.line?.trim();
  const product = extras?.product?.trim();
  if (line) query.set("line", line);
  if (product) query.set("product", product);
  return `/deals/${dealId}?${query.toString()}`;
}

const FLASH_ORIGIN = "https://fitfirst.local";

function splitHash(href: string) {
  const index = href.indexOf("#");
  if (index < 0) return { path: href, hash: "" };
  return { path: href.slice(0, index), hash: href.slice(index) };
}

/** Decode `?flash=` (known key or a short raw phrase) into toast copy. */
export function resolveFlashMessage(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed in FLASH_COPY) return FLASH_COPY[trimmed as FlashKey];
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed.replace(/\+/g, " ")).trim();
  } catch {
    decoded = trimmed;
  }
  if (!decoded) return null;
  return decoded.length > 80 ? decoded.slice(0, 80) : decoded;
}

export function withFlash(href: string, message: string, kind: FlashKind = "success"): string {
  const { path, hash } = splitHash(href);
  const url = new URL(path, FLASH_ORIGIN);
  url.searchParams.set(FLASH_PARAM, message);
  if (kind === "error") url.searchParams.set(FLASH_KIND_PARAM, "error");
  else url.searchParams.delete(FLASH_KIND_PARAM);
  return `${url.pathname}${url.search}${hash}`;
}

export function stripFlash(href: string): string {
  const { path, hash } = splitHash(href);
  const url = new URL(path, FLASH_ORIGIN);
  url.searchParams.delete(FLASH_PARAM);
  url.searchParams.delete(FLASH_KIND_PARAM);
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${hash}`;
}
