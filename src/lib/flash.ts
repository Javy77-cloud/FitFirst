export const FLASH_PARAM = "flash";
export const FLASH_KIND_PARAM = "flashKind";
export const FLASH_EVENT = "ff-flash";
export const FLASH_DISMISS_MS = 2500;

export type FlashKind = "success" | "error";

/** Stable keys used by server actions. Host resolves these to on-screen copy. */
export const FLASH_COPY = {
  "deal-details-saved": "Deal details saved",
  "sheet-saved": "Sheet saved",
  "sheet-filled": "Sheet filled from source",
  "field-confirmed": "Field confirmed",
  "tags-saved": "Tags saved",
  "tag-added": "Tag added",
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
