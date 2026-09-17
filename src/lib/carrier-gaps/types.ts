import {
  DEAL_PRODUCT_DEFS,
  dealProductDef,
  parseDealProduct,
} from "@/lib/deals/deal-products";

export const GAP_SURFACES = ["details", "risk_profile"] as const;
export type GapSurface = (typeof GAP_SURFACES)[number];

export const GAP_SURFACE_LABEL: Record<GapSurface, string> = {
  details: "Deal Details",
  risk_profile: "Risk Profile",
};

export const GAP_STATUSES = ["open", "added"] as const;
export type GapStatus = (typeof GAP_STATUSES)[number];

export const GAP_STATUS_LABEL: Record<GapStatus, string> = {
  open: "Open",
  added: "Added",
};

export const GAP_PRODUCT_LINES = DEAL_PRODUCT_DEFS.map((row) => ({
  id: row.id,
  label: row.label,
  group: row.group,
}));

export const MISSING_QUESTIONS_PATH = "/developer/missing-questions";
export const MISSING_QUESTIONS_SETTINGS_PATH = "/settings/developer-hub/missing-questions";

export function isGapSurface(value: string | null | undefined): value is GapSurface {
  return GAP_SURFACES.includes((value ?? "") as GapSurface);
}

export function isGapStatus(value: string | null | undefined): value is GapStatus {
  return GAP_STATUSES.includes((value ?? "") as GapStatus);
}

export function parseGapSurface(value: string | null | undefined): GapSurface {
  return isGapSurface(value) ? value : "details";
}

export function parseGapStatus(value: string | null | undefined): GapStatus {
  return isGapStatus(value) ? value : "open";
}

/** Store a readable product-line label. Unknown text is kept as typed. */
export function productLineLabel(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const product = parseDealProduct(value);
  if (product) return dealProductDef(product).label;
  const byLabel = DEAL_PRODUCT_DEFS.find(
    (row) => row.label.toLowerCase() === value.toLowerCase(),
  );
  return byLabel?.label ?? value;
}

export function normalizeGapNote(note: string): string {
  return note.trim().replace(/\s+/g, " ").toLowerCase();
}

export function gapDedupeKey(input: {
  note: string;
  productLine: string;
  carrier?: string | null;
}): string {
  return [
    normalizeGapNote(input.note),
    productLineLabel(input.productLine).toLowerCase(),
    (input.carrier ?? "").trim().toLowerCase(),
  ].join("|");
}
