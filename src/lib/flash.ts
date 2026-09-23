export const FLASH_PARAM = "flash";
export const FLASH_KIND_PARAM = "flashKind";
export const FLASH_EVENT = "ff-flash";
export const FLASH_DISMISS_MS = 2500;
/** sessionStorage key so ActionToastHost survives Suspense remount after ?flash= strip. */
export const FLASH_STORAGE_KEY = "ff-action-toast";
/** Cookie set when a same-page save toasts without redirecting. */
export const FLASH_COOKIE = "ff-action-flash";

export type FlashKind = "success" | "error";

/** Stable keys used by server actions. Host resolves these to on-screen copy. */
export const FLASH_COPY = {
  "deal-details-saved": "Deal details saved",
  "layout-saved": "Deal layout saved",
  "home-layout-saved": "Layout saved",
  "list-saved": "List saved",
  "pick-list-saved": "Pick list saved",
  "global-list-saved": "Global list saved",
  "list-item-deleted": "List item deleted",
  "list-deleted": "List deleted",
  "colors-cleared": "Colors cleared",
  "lead-saved": "Lead saved",
  "contact-saved": "Contact saved",
  "business-saved": "Account saved",
  "policy-saved": "Policy saved",
  "settings-saved": "Settings saved",
  "calendar-settings-saved": "Calendar settings saved",
  "agent-toggles-saved": "Agent access saved",
  "brand-saved": "Brand saved",
  "template-saved": "Template saved",
  "signature-saved": "Signature saved",
  "signature-test-queued": "Test close queued to you. Vendor send waits on a connected inbox.",
  "desk-saved": "Desk saved",
  "columns-saved": "Columns saved",
  "widgets-saved": "Widgets saved",
  "line-settings-saved": "Line settings saved",
  "orphan-lob-adopted": "Unlisted line added to the catalog",
  "orphan-lob-mapped": "Stored records mapped to a catalog line",
  "agency-lobs-normalized": "Stored lines remapped to the catalog",
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
  "credentials-cleared": "App keys cleared",
  "gmail-sent": "Gmail smoke-test sent",
  "gmail-read": "Gmail inbox readable",
  "busy-synced": "Calendar events synced",
  "busy-sync-failed": "Calendar sync failed. Try Sync now, or reconnect in Settings.",
  "inbox-sent": "Message sent from agency Gmail",
  "inbox-logged": "Thread logged to activity",
  "inbox-need-reply": "Add a reply and a To address",
  "inbox-need-send": "Add a To address and message",
  "inbox-need-record": "Link a contact or deal before logging",
  "inbox-need-agent": "Pick an agent to assign this thread",
  "inbox-assigned": "Thread assigned — agent notified in Inbox",
  "docusign-ping": "DocuSign sandbox reachable",
  "yahoo-ping": "Yahoo identity confirmed",
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
  "sheet-saved": "Risk Profile saved",
  "sheet-filled": "Risk Profile filled from source",
  "property-records-filled": "Filled empty fields from property records",
  "property-records-needs-key": "GetParcelData API key is not configured. Set GETPARCELDATA_API_KEY.",
  "gemini-needs-key": "Gemini API key is not configured. Set GEMINI_API_KEY.",
  "need-dec": "Upload the issued declaration PDF first.",
  "need-dec-file": "Could not read the declaration PDF from storage. Re-upload the file.",
  "dec-extract-failed": "Could not extract the required fields from the policy file. The file stays in the folder.",
  "need-dec-fields": "Could not extract the policy number, premium, or effective date. The file stays in the folder.",
  "property-records-no-address": "Add a property address on the quote sheet first.",
  "property-records-not-found": "No parcel matched that address.",
  "property-records-error": "GetParcelData did not return fields. Empty cells were left alone.",
  "field-confirmed": "Field confirmed",
  "tags-saved": "Tags saved",
  "tag-added": "Tag added",
  "tag-created": "Tag created",
  "tag-color-saved": "Tag color saved",
  "document-deleted": "Document deleted",
  "document-unlinked-from-product": "Removed from this product (file stays on the deal)",
  "document-linked-to-product": "Linked to this product",
  "document-replaced": "Document replaced",
  "document-renamed": "Document renamed",
  "document-type-updated": "Document type updated",
  "document-term-role-updated": "Term role updated",
  "documents-saved": "Documents saved",
  "choose-file": "Choose a file to upload.",
  "documents-save-failed": "Could not save that file. Nothing was stored.",
  "documents-too-large": "That file is over the upload cap. Insurance PDFs save up to 45 MB.",
  "document-uploaded": "Files saved",
  "image-uploaded": "Image uploaded",
  "market-added": "Market added",
  "deal-updated": "Deal updated",
  "gap-dismissed": "Coverage gap dismissed",
  "product-added-to-package": "Product added to package",
  "product-already-on-package": "Already on this package",
  "deal-archived": "Deal archived",
  "quotes-requested": "Quotes requested",
  "manual-quote-recorded": "Manual quote recorded",
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
  "healthsherpa-medicare-vault-saved": "HealthSherpa Medicare key saved",
  "healthsherpa-medicare-vault-cleared": "HealthSherpa Medicare key cleared",
  "healthsherpa-aca-vault-saved": "HealthSherpa Marketplace key saved",
  "healthsherpa-aca-vault-cleared": "HealthSherpa Marketplace key cleared",
  "healthsherpa-inbound-vault-saved": "HealthSherpa inbound secret saved",
  "healthsherpa-inbound-vault-cleared": "HealthSherpa inbound secret cleared",
  "meta-vault-saved": "Meta app credentials saved",
  "meta-vault-cleared": "Meta app credentials cleared",
  "property-records-no-blanks": "Property records matched, but no blank fields to fill.",
  "policy-minted": "Policy created — confirm the declaration",
  "policy-published": "Policy published",
  "mint-policy-missing": "This policy is missing. Refresh and try again.",
  "mint-confirm-invalid": "That mint request was invalid. Refresh and try again.",
  "need-confirm": "Confirm remaining declaration fields before publishing.",
  "need-policy-number": "Type the real policy number before Policy looks good. Gemini left it blank on this declaration.",
  "need-quote": "Pick a live quote first",
  "declaration-received": "Declaration received",
  "letter-extracting": "Extracting letter fields",
  "letter-needs-review": "Letter ready for review",
  "letter-confirmed": "Letter fields confirmed",
  "letter-filled": "Agency letter filled",
  "letter-need-file": "Choose a source file for this letter job.",
  "letter-extract-failed": "Could not extract letter fields. Review and type values, or re-upload.",
  "letter-need-confirm": "Confirm extracted fields before fill or signature.",
  "letter-send-later": "DocuSign sandbox is identity-only. Envelope send is not wired — never auto-sends.",
  "letter-sent": "Sent to DocuSign sandbox",
  "letter-need-connect": "Connect DocuSign sandbox in Settings → E-sign before send.",
  "letter-sandbox-error": "DocuSign sandbox rejected the envelope. Check the Integration Key and try again.",
  "letter-need-signer": "Deal contact needs an email before send.",
  "letter-status-refreshed": "Envelope status refreshed",
  "client-staying": "Nice work — client staying. Moved to Handled; see you at the next renewal.",
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

export function encodeFlashCookie(message: string, kind: FlashKind = "success"): string {
  return `${encodeURIComponent(message)}|${kind}`;
}

export function decodeFlashCookie(raw: string | null | undefined): FlashPayload | null {
  if (raw == null) return null;
  let value = raw.trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    // already decoded
  }
  const sep = value.lastIndexOf("|");
  const messageRaw = sep >= 0 ? value.slice(0, sep) : value;
  const kindRaw = sep >= 0 ? value.slice(sep + 1) : "success";
  const message = resolveFlashMessage(messageRaw);
  if (!message) return null;
  return { message, kind: kindRaw === "error" ? "error" : "success" };
}

export function readFlashCookie(): FlashPayload | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (!part.startsWith(`${FLASH_COOKIE}=`)) continue;
    return decodeFlashCookie(part.slice(FLASH_COOKIE.length + 1));
  }
  return null;
}

export function clearFlashCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`;
}

/** After Save Deal Details, stay on Details with a success flash; keep line/product. */
/** After Deal Details save — advance to Documents (same product line/product query). */
export function dealDetailsSavedHref(
  dealId: string,
  extras?: { line?: string | null; product?: string | null },
): string {
  const query = new URLSearchParams({ tab: "documents" });
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

/** Mint diagnostics name the missing fields and a sanitized Gemini preview. */
export const FLASH_MESSAGE_MAX = 420;

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
  return decoded.length > FLASH_MESSAGE_MAX ? decoded.slice(0, FLASH_MESSAGE_MAX) : decoded;
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
