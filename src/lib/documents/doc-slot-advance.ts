import { isDocumentsSourceDoc, shopLineFromSourceDoc } from "@/lib/deals/quote-docs";
import { FLASH_COPY } from "@/lib/flash";

/**
 * Required document tabs on a deal's Documents and Quotes intake.
 * A successful save moves to the next empty required slot.
 * The last filled slot leaves for the real next product task (Markets, Quotes,
 * or the next product that still needs a document).
 * Save rejection (storage, size, filename) stays with the save path — this module
 * only chooses where a finished save goes, and keeps a failed save on its tab.
 */

export type DocSlotDef = {
  docType: string;
  label: string;
  required: boolean;
};

export type DocSlotDoc = {
  docType?: string | null;
  slot?: string | null;
  tags?: string[] | null;
};

export type DocSlotProduct = {
  id: string;
  label: string;
  shopLine: string;
  quotingForm?: string | null;
};

export type DocSaveAdvance =
  | { action: "stay"; error: string }
  | {
      action: "slot";
      docType: string;
      label: string;
      href: string;
      toast: "documents-saved";
    }
  | {
      action: "task";
      tab: "markets" | "quotes" | "documents";
      label: string;
      href: string;
      toast: string;
      productId?: string;
    };

const HOME_PROPERTY: DocSlotDef[] = [
  { docType: "dec", label: "Declaration page", required: true },
  { docType: "wind_mit", label: "Wind mitigation", required: true },
  { docType: "four_point", label: "Four-Point", required: true },
  { docType: "photo", label: "Photos", required: true },
];

const RENTERS: DocSlotDef[] = [
  { docType: "dec", label: "Declaration page", required: true },
  { docType: "photo", label: "Photos", required: true },
];

const AUTO: DocSlotDef[] = [
  { docType: "dec", label: "Current policy", required: true },
  { docType: "photo", label: "Photos", required: true },
];

const FLOOD: DocSlotDef[] = [
  { docType: "dec", label: "Declaration page", required: true },
  { docType: "inspection", label: "Elevation / inspection", required: true },
  { docType: "photo", label: "Photos", required: true },
];

const APPLICATION: DocSlotDef[] = [
  { docType: "other", label: "Application", required: true },
];

const COMMERCIAL: DocSlotDef[] = [
  { docType: "dec", label: "Declaration page", required: true },
  { docType: "photo", label: "Photos", required: true },
  { docType: "report", label: "Reports", required: true },
];

const DEC_AND_PHOTO: DocSlotDef[] = [
  { docType: "dec", label: "Declaration page", required: true },
  { docType: "photo", label: "Photos", required: true },
];

const HOME_FORMS = new Set(["HO3", "HO5", "HO6", "HO8", "MHO", "MDP", "DP1", "DP3"]);

/** MMHO is the desk name for manufactured / mobile home (catalog id MHO). */
export function canonicalQuotingForm(value: string | null | undefined): string {
  const compact = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!compact) return "";
  if (compact === "MMHO" || compact === "MH" || compact === "MHO" || compact === "MANUFACTUREDHOME") {
    return "MHO";
  }
  if (compact === "MOBILEHOME" || compact === "MOBILEHOMEOWNERS") return "MHO";
  if (compact === "MDP") return "MDP";
  if (compact === "HO4" || compact === "RENTERS") return "HO4";
  if (compact === "DP1" || compact === "DP3") return compact;
  if (/^HO[3568]$/.test(compact)) return compact;
  if (compact === "PA" || compact === "AUTO" || compact === "PERSONALAUTO") return "PA";
  if (compact === "FLOOD") return "FLOOD";
  if (compact === "GL" || compact === "WC" || compact === "BOP" || compact === "CA") return compact;
  if (compact === "RV" || compact === "BOAT" || compact === "UMBRELLA") return compact;
  if (compact === "MOTORCYCLE") return "MOTORCYCLE";
  return compact;
}

export function requiredDocSlots(input: {
  product?: string | null;
  quotingForm?: string | null;
  shopLine?: string | null;
}): DocSlotDef[] {
  const product = String(input.product ?? "").trim().toLowerCase();
  const form = canonicalQuotingForm(input.quotingForm);
  const line = String(input.shopLine ?? "").trim().toLowerCase();

  if (product === "renters" || form === "HO4") return RENTERS;
  if (product === "flood" || form === "FLOOD" || line === "flood") return FLOOD;
  if (
    product === "auto" ||
    product === "motorcycle" ||
    product === "commercial_auto" ||
    form === "PA" ||
    form === "MOTORCYCLE" ||
    form === "CA" ||
    line === "auto"
  ) {
    return AUTO;
  }
  if (product.startsWith("life") || product.startsWith("health") || line === "life" || line === "health") {
    return APPLICATION;
  }
  if (
    product === "gl" ||
    product === "workers_comp" ||
    product === "bop" ||
    form === "GL" ||
    form === "WC" ||
    form === "BOP" ||
    line === "general_liability" ||
    line === "workers_comp" ||
    line === "bop"
  ) {
    return COMMERCIAL;
  }
  if (
    product === "rv" ||
    product === "boat" ||
    product === "umbrella" ||
    form === "RV" ||
    form === "BOAT" ||
    form === "UMBRELLA" ||
    line === "rec_rv" ||
    line === "umbrella"
  ) {
    return DEC_AND_PHOTO;
  }
  if (
    product === "homeowners" ||
    product === "landlord" ||
    product === "mmho" ||
    product === "mho" ||
    HOME_FORMS.has(form) ||
    line === "home"
  ) {
    return HOME_PROPERTY;
  }
  return DEC_AND_PHOTO;
}

export function filledDocTypesForLine(
  docs: readonly DocSlotDoc[] | null | undefined,
  shopLine: string | null | undefined,
): string[] {
  const wanted = String(shopLine ?? "").trim().toLowerCase();
  const found = new Set<string>();
  for (const doc of docs ?? []) {
    if (!doc || !isDocumentsSourceDoc(doc)) continue;
    const tagged = shopLineFromSourceDoc(doc);
    if (wanted && tagged && tagged !== wanted) continue;
    const type = String(doc.docType ?? "").trim();
    if (type) found.add(type);
  }
  return [...found];
}

export function initialDocSlot(
  slots: readonly DocSlotDef[],
  filledDocTypes: readonly string[],
  requested?: string | null,
): string {
  const known = new Set(slots.map((slot) => slot.docType));
  const asked = String(requested ?? "").trim();
  if (asked && known.has(asked)) return asked;
  const filled = new Set(filledDocTypes);
  const empty = slots.find((slot) => slot.required && !filled.has(slot.docType));
  return empty?.docType ?? slots[0]?.docType ?? "dec";
}

/** Next empty required slot after the one just saved. Wraps to an earlier hole before leaving. */
export function nextEmptyRequiredDocSlot(input: {
  slots: readonly DocSlotDef[];
  filledDocTypes: readonly string[];
  savedDocTypes?: readonly string[];
}): DocSlotDef | null {
  const required = input.slots.filter((slot) => slot.required);
  const filled = new Set(input.filledDocTypes);
  for (const saved of input.savedDocTypes ?? []) filled.add(saved);
  const empty = required.filter((slot) => !filled.has(slot.docType));
  if (empty.length === 0) return null;
  const savedIndexes = (input.savedDocTypes ?? [])
    .map((type) => required.findIndex((slot) => slot.docType === type))
    .filter((index) => index >= 0);
  const anchor = savedIndexes.length > 0 ? Math.max(...savedIndexes) : -1;
  return empty.find((slot) => required.indexOf(slot) > anchor) ?? empty[0] ?? null;
}

export function docSaveStayError(input: {
  reason?: string | null;
  slotLabel?: string | null;
}): string {
  const reason = String(input.reason ?? "").trim();
  if (reason === "choose-file") return FLASH_COPY["choose-file"];
  if (reason === "documents-too-large") return FLASH_COPY["documents-too-large"];
  const label = String(input.slotLabel ?? "").trim();
  if (label) return `Could not save ${label}. Try again.`;
  return FLASH_COPY["documents-save-failed"];
}

export function dealWorkHref(input: {
  dealId: string;
  tab: "documents" | "markets" | "quotes";
  line?: string | null;
  product?: string | null;
  docSlot?: string | null;
}): string {
  const query = new URLSearchParams();
  query.set("tab", input.tab);
  const line = String(input.line ?? "").trim();
  const product = String(input.product ?? "").trim();
  if (line) query.set("line", line);
  if (product) query.set("product", product);
  const docSlot = String(input.docSlot ?? "").trim();
  if (input.tab !== "markets" && docSlot) query.set("docSlot", docSlot);
  return `/deals/${input.dealId}?${query.toString()}`;
}

function nextProductNeedingDocs(input: {
  product?: string | null;
  packageProducts?: readonly DocSlotProduct[];
  docs?: readonly DocSlotDoc[];
}): { product: DocSlotProduct; slot: DocSlotDef } | null {
  const list = input.packageProducts ?? [];
  if (list.length < 2) return null;
  const start = Math.max(0, list.findIndex((row) => row.id === input.product));
  for (let step = 1; step < list.length; step += 1) {
    const row = list[(start + step) % list.length];
    if (!row || row.id === input.product) continue;
    const slots = requiredDocSlots(row);
    const filled = new Set(filledDocTypesForLine(input.docs, row.shopLine));
    const empty = slots.find((slot) => slot.required && !filled.has(slot.docType));
    if (empty) return { product: row, slot: empty };
  }
  return null;
}

/**
 * Failed save never changes tabs. Successful save walks the required slots,
 * then the next real product task.
 */
export function planDocSaveAdvance(input: {
  ok: boolean;
  reason?: string | null;
  slotLabel?: string | null;
  savedDocTypes?: readonly string[];
  slots: readonly DocSlotDef[];
  filledDocTypes: readonly string[];
  dealId: string;
  line?: string | null;
  product?: string | null;
  /** Tab the agent saved from. The next empty slot stays on that tab. */
  surface?: "documents" | "quotes";
  marketsDone?: boolean;
  quotesDone?: boolean;
  packageProducts?: readonly DocSlotProduct[];
  docs?: readonly DocSlotDoc[];
}): DocSaveAdvance {
  if (!input.ok) {
    return {
      action: "stay",
      error: docSaveStayError({ reason: input.reason, slotLabel: input.slotLabel }),
    };
  }
  const next = nextEmptyRequiredDocSlot({
    slots: input.slots,
    filledDocTypes: input.filledDocTypes,
    savedDocTypes: input.savedDocTypes,
  });
  if (next) {
    const surface = input.surface === "quotes" ? "quotes" : "documents";
    return {
      action: "slot",
      docType: next.docType,
      label: next.label,
      toast: "documents-saved",
      href: dealWorkHref({
        dealId: input.dealId,
        tab: surface,
        line: input.line,
        product: input.product,
        docSlot: next.docType,
      }),
    };
  }
  if (!input.marketsDone) {
    return {
      action: "task",
      tab: "markets",
      label: "Markets",
      toast: "Saved. Up next: Markets",
      href: dealWorkHref({
        dealId: input.dealId,
        tab: "markets",
        line: input.line,
        product: input.product,
      }),
    };
  }
  if (!input.quotesDone) {
    return {
      action: "task",
      tab: "quotes",
      label: "Quotes",
      toast: "Saved. Up next: Quotes",
      href: dealWorkHref({
        dealId: input.dealId,
        tab: "quotes",
        line: input.line,
        product: input.product,
      }),
    };
  }
  const sibling = nextProductNeedingDocs(input);
  if (sibling) {
    return {
      action: "task",
      tab: "documents",
      label: sibling.product.label,
      productId: sibling.product.id,
      toast: `Saved. Up next: ${sibling.product.label}`,
      href: dealWorkHref({
        dealId: input.dealId,
        tab: "documents",
        line: sibling.product.shopLine,
        product: sibling.product.id,
        docSlot: sibling.slot.docType,
      }),
    };
  }
  return {
    action: "task",
    tab: "quotes",
    label: "Quotes",
    toast: "Saved. Up next: Quotes",
    href: dealWorkHref({
      dealId: input.dealId,
      tab: "quotes",
      line: input.line,
      product: input.product,
    }),
  };
}
