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

/** Form / product / free-text words that should land on a master `lobCode`. */
export const LOB_CODE_ALIASES: Record<string, string> = {
  ho3: "HO",
  ho4: "HO",
  ho5: "HO",
  ho6: "HO",
  ho8: "HO",
  mho: "HO",
  mdp: "HO",
  mh: "HO",
  dp: "HO",
  dp1: "HO",
  dp3: "HO",
  home: "HO",
  homeowners: "HO",
  homeowner: "HO",
  renters: "HO",
  landlord: "HO",
  dwelling: "HO",
  pa: "AUTO",
  "personal auto": "AUTO",
  car: "AUTO",
  motorcycle: "AUTO",
  ca: "AUTO",
  "commercial auto": "AUTO",
  commercial_auto: "AUTO",
  rec: "RV",
  "rec rv": "RV",
  rec_rv: "RV",
  boat: "RV",
  "boat/watercraft": "RV",
  watercraft: "RV",
  workers_comp: "WC",
  "workers comp": "WC",
  "workers' comp": "WC",
  "work comp": "WC",
  "term life": "LIFE",
  "whole life": "LIFE",
  iul: "LIFE",
  "final expense": "LIFE",
  marketplace: "HEALTH",
  medicare: "HEALTH",
  "medicare advantage": "HEALTH",
  aca: "HEALTH",
  medigap: "HEALTH",
  supplemental: "HEALTH",
};

export type AgencyLobOrphan = {
  raw: string;
  count: number;
};

export function normalizeLobKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveAgencyLobCode(
  value: string | null | undefined,
  rows: readonly AgencyLobRecord[],
): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const key = normalizeLobKey(raw);
  const byCode = rows.find((row) => row.lobCode.trim().toUpperCase() === upper);
  if (byCode) return byCode.lobCode.trim().toUpperCase();
  const byProduct = rows.find((row) => normalizeLobKey(row.productId) === key);
  if (byProduct) return byProduct.lobCode.trim().toUpperCase();
  const byLabel = rows.find((row) => normalizeLobKey(row.label) === key);
  if (byLabel) return byLabel.lobCode.trim().toUpperCase();
  const alias = LOB_CODE_ALIASES[key];
  if (alias && rows.some((row) => row.lobCode.trim().toUpperCase() === alias)) return alias;
  return null;
}

/** Unknown values stay as-is so migrate never drops a record. */
export function canonicalizeLobCode(
  value: string | null | undefined,
  rows: readonly AgencyLobRecord[],
): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  return resolveAgencyLobCode(raw, rows) ?? raw;
}

export function findAgencyLobOrphans(
  values: readonly string[],
  rows: readonly AgencyLobRecord[],
): AgencyLobOrphan[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const raw = value.trim();
    if (!raw) continue;
    if (resolveAgencyLobCode(raw, rows)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([raw, count]) => ({ raw, count }))
    .sort((a, b) => b.count - a.count || a.raw.localeCompare(b.raw));
}

export function agencyLobFamilyCounts(rows: readonly AgencyLobRecord[]) {
  return {
    personal: rows.filter((row) => row.family === "personal" && row.active).length,
    commercial: rows.filter((row) => row.family === "commercial" && row.active).length,
    life: rows.filter((row) => row.family === "life" && row.active).length,
    health: rows.filter((row) => row.family === "health" && row.active).length,
    hidden: rows.filter((row) => !row.active).length,
  };
}
