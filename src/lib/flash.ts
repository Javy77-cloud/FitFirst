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
  "layout-saved": "Deal layout saved",
  "home-layout-saved": "Layout saved",
  "list-saved": "List saved",
  "colors-cleared": "Colors cleared",
  "lead-saved": "Lead saved",
  "contact-saved": "Contact saved",
  "business-saved": "Business saved",
  "policy-saved": "Policy saved",
  "settings-saved": "Settings saved",
  "brand-saved": "Brand saved",
  "template-saved": "Template saved",
  "signature-saved": "Signature saved",
  "desk-saved": "Desk saved",
  "columns-saved": "Columns saved",
  "widgets-saved": "Widgets saved",
  "line-settings-saved": "Line settings saved",
  "office-saved": "Office saved",
  "territory-saved": "Territory saved",
  "rule-saved": "Rule saved",
  "phone-saved": "Phone line saved",
  "esign-saved": "E-sign preference saved",
  "trigger-saved": "Trigger saved",
  "privileges-saved": "Privileges saved",
  "changes-saved": "Changes saved",
  "profile-saved": "Profile saved",
  "password-saved": "Password saved",
  "communications-saved": "Communications saved",
  "carrier-saved": "Carrier saved",
  "function-saved": "Function saved",
  "webhook-saved": "Webhook saved",
  "connector-saved": "Connector saved",
  "macro-saved": "Macro saved",
  "button-saved": "Button saved",
  "script-saved": "Script saved",
  "widget-saved": "Widget saved",
  "campaign-saved": "Campaign saved",
  "draft-saved": "Draft saved",
  "task-saved": "Task saved",
  "claim-saved": "Claim saved",
  "fnol-saved": "FNOL saved",
  "commission-saved": "Commission saved",
  "notes-saved": "Notes saved",
  "automation-saved": "Automation saved",
  "credentials-saved": "Credentials saved",
  "owner-saved": "Owner saved",
  "nurture-saved": "Nurture saved",
  "worksheet-saved": "Worksheet saved",
  "location-saved": "Location saved",
  "vehicle-saved": "Vehicle saved",
  "driver-saved": "Driver saved",
  "term-saved": "Term saved",
  "interest-saved": "Interest saved",
  "holder-saved": "Holder saved",
  "lost-reason-saved": "Lost reason saved",
  "video-saved": "Link saved",
  "sheet-saved": "Sheet saved",
  "sheet-filled": "Sheet filled from source",
  "property-records-filled": "Filled empty fields from property records",
  "property-records-needs-key": "GetParcelData API key is not configured. Set GETPARCELDATA_API_KEY.",
  "gemini-needs-key": "Gemini API key is not configured. Set GEMINI_API_KEY.",
  "property-records-no-address": "Add a property address on the quote sheet first.",
  "property-records-not-found": "No parcel matched that address.",
  "property-records-error": "GetParcelData did not return fields. Empty cells were left alone.",
  "field-confirmed": "Field confirmed",
  "tags-saved": "Tags saved",
  "tag-added": "Tag added",
  "tag-created": "Tag created",
  "tag-color-saved": "Tag color saved",
  "document-deleted": "Document deleted",
  "document-replaced": "Document replaced",
  "documents-saved": "Documents saved",
  "document-uploaded": "Files saved",
  "image-uploaded": "Image uploaded",
  "market-added": "Market added",
  "deal-updated": "Deal updated",
  "deal-archived": "Deal archived",
  "quotes-requested": "Quotes requested",
  "meeting-saved": "Meeting saved",
  "outcome-saved": "Outcome saved",
  "consent-saved": "Consent saved",
  "filter-saved": "Filter saved",
  "fedex-vault-saved": "FedEx credentials saved",
  "fedex-vault-cleared": "FedEx credentials cleared",
  "getparceldata-vault-saved": "GetParcelData API key saved",
  "getparceldata-vault-cleared": "GetParcelData API key cleared",
  "permitstack-vault-saved": "PermitStack API key saved",
  "permitstack-vault-cleared": "PermitStack API key cleared",
  "property-records-no-blanks": "Property records matched, but no blank fields to fill.",
  "policy-minted": "Policy created — confirm the declaration",
  "policy-published": "Policy published",
  "declaration-reread": "Declaration re-read — confirm the proposed values",
  "need-quote": "Pick a live quote first",
  "need-dec": "Need the declaration PDF to re-read",
  "declaration-received": "Declaration received",
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

/** After Save Deal Details, stay on Details with a success flash; keep line/product. */
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

/** Markets Request quotes must land on Quotes for that product — never a bare /deals/:id. */
export function quotesRequestedHref(
  dealId: string,
  extras?: { line?: string | null; product?: string | null },
): string {
  const query = new URLSearchParams({ tab: "quotes" });
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
