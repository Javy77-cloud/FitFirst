import { DEAL_PRODUCT_DEFS, isDealProductId, type DealProductId } from "@/lib/deals/deal-products";
import type { LineOfBusiness } from "@/lib/domain";
import { isSheetProduct, type SheetProduct } from "@/lib/quote-sheet/products";

export const AGENCY_LOB_FAMILIES = ["personal", "commercial", "life", "health"] as const;
export type AgencyLobFamily = (typeof AGENCY_LOB_FAMILIES)[number];

export type AgencyLobRecord = {
  id?: string;
  productId: string;
  label: string;
  lobCode: string;
  family: AgencyLobFamily;
  sheetProduct: string;
  quotingForm: string | null;
  active: boolean;
  builtIn: boolean;
  sortOrder: number;
};

export const DEFAULT_AGENCY_LOBS: AgencyLobRecord[] = DEAL_PRODUCT_DEFS.map((row, index) => ({
  productId: row.id,
  label: row.label,
  lobCode: row.lob,
  family: row.group,
  sheetProduct: row.sheetProduct,
  quotingForm: row.quotingForm,
  active: true,
  builtIn: true,
  sortOrder: index,
}));

export function isAgencyLobFamily(value: string | null | undefined): value is AgencyLobFamily {
  return Boolean(value && (AGENCY_LOB_FAMILIES as readonly string[]).includes(value));
}

export function slugifyAgencyLob(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return slug || "line";
}

export function familyHiddenByWriteToggles(
  family: AgencyLobFamily,
  settings: { writeLife: boolean; writeHealth: boolean },
): boolean {
  if (family === "life" && !settings.writeLife) return true;
  if (family === "health" && !settings.writeHealth) return true;
  return false;
}

export function visibleAgencyLobs(
  rows: readonly AgencyLobRecord[],
  settings: { writeLife: boolean; writeHealth: boolean },
  opts?: { includeInactive?: boolean },
): AgencyLobRecord[] {
  return rows.filter((row) => {
    if (!opts?.includeInactive && !row.active) return false;
    return !familyHiddenByWriteToggles(row.family, settings);
  });
}

export function visibleDealProductIds(
  rows: readonly AgencyLobRecord[],
  settings: { writeLife: boolean; writeHealth: boolean },
): DealProductId[] {
  return visibleAgencyLobs(rows, settings)
    .map((row) => row.productId)
    .filter(isDealProductId);
}

export function uniqueLobCodes(rows: readonly AgencyLobRecord[]): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const code = row.lobCode.trim().toUpperCase();
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

export function labelForLobCode(rows: readonly AgencyLobRecord[], code: string): string {
  const raw = code.trim().toUpperCase();
  const hit = rows.find((row) => row.lobCode.trim().toUpperCase() === raw);
  return hit?.label ?? code;
}

export function resolveSheetProduct(value: string | null | undefined): SheetProduct {
  return isSheetProduct(value) ? value : "homeowners";
}

export function defaultFamilyForLobCode(code: string): AgencyLobFamily {
  const raw = code.trim().toUpperCase();
  if (raw === "LIFE") return "life";
  if (raw === "HEALTH") return "health";
  if (raw === "GL" || raw === "BOP" || raw === "WC" || raw === "CGL") return "commercial";
  return "personal";
}

export function parseLobCode(value: string | null | undefined): LineOfBusiness | string {
  const raw = (value ?? "").trim().toUpperCase();
  return raw || "HO";
}
