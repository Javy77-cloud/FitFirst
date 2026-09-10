/**
 * Flood / WC / GL premium-learning stubs — beginnings only.
 * Parallel to Auto premium-learning / Home Appetite Log. Site-dev only.
 */
import type {
  FloodFeatureSnapshot,
  GlFeatureSnapshot,
  Risk,
  WcFeatureSnapshot,
} from "@/lib/db/schema";
import type { QuoteSheetFieldValue } from "@/lib/domain";

export type LineLearningKind = "flood" | "wc" | "gl";

export function isFloodLearningLine(raw: string | null | undefined): boolean {
  const u = raw?.trim().toUpperCase() ?? "";
  return u === "FLOOD" || u === "NFIP" || u.toLowerCase() === "flood";
}

export function isWcLearningLine(raw: string | null | undefined): boolean {
  const u = raw?.trim().toUpperCase() ?? "";
  return u === "WC" || u === "WORKERS_COMP" || u === "WORKERS COMP";
}

export function isGlLearningLine(raw: string | null | undefined): boolean {
  const u = raw?.trim().toUpperCase() ?? "";
  return u === "GL" || u === "CGL" || u === "GENERAL_LIABILITY";
}

function cell(values: Record<string, QuoteSheetFieldValue> | null | undefined, key: string): string | null {
  const raw = values?.[key]?.value?.trim();
  return raw || null;
}

function num(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function buildFloodFeatureSnapshot(input: {
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  risk?: Partial<Risk> | null;
  capturedAt?: Date;
}): FloodFeatureSnapshot {
  const v = input.sheetValues ?? {};
  const risk = input.risk ?? null;
  return {
    schemaVersion: 1,
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    state: cell(v, "state") || risk?.state || null,
    city: cell(v, "city") || risk?.city || null,
    zip: cell(v, "zip") || risk?.zip || null,
    county: cell(v, "county") || risk?.county || null,
    floodZone: cell(v, "flood_zone") || cell(v, "zone") || null,
    elevation: cell(v, "elevation") || null,
    elevationCertificate: cell(v, "elevation_certificate") || cell(v, "ec") || null,
    baseFloodElevation: cell(v, "base_flood_elevation") || cell(v, "bfe") || null,
  };
}

export function buildWcFeatureSnapshot(input: {
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  risk?: Partial<Risk> | null;
  capturedAt?: Date;
}): WcFeatureSnapshot {
  const v = input.sheetValues ?? {};
  const risk = input.risk ?? null;
  return {
    schemaVersion: 1,
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    state: cell(v, "state") || risk?.state || null,
    city: cell(v, "city") || risk?.city || null,
    zip: cell(v, "zip") || risk?.zip || null,
    industryClass: cell(v, "industry_class") || cell(v, "class_code") || cell(v, "wc_class") || null,
    naics: cell(v, "naics") || null,
    employees: num(cell(v, "employees") || cell(v, "employee_count")),
    payroll: num(cell(v, "payroll") || cell(v, "annual_payroll")),
  };
}

export function buildGlFeatureSnapshot(input: {
  sheetValues?: Record<string, QuoteSheetFieldValue> | null;
  risk?: Partial<Risk> | null;
  capturedAt?: Date;
}): GlFeatureSnapshot {
  const v = input.sheetValues ?? {};
  const risk = input.risk ?? null;
  return {
    schemaVersion: 1,
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    state: cell(v, "state") || risk?.state || null,
    city: cell(v, "city") || risk?.city || null,
    zip: cell(v, "zip") || risk?.zip || null,
    industryClass: cell(v, "industry_class") || cell(v, "class_code") || cell(v, "gl_class") || null,
    naics: cell(v, "naics") || null,
    revenue: num(cell(v, "revenue") || cell(v, "annual_revenue") || cell(v, "gross_sales")),
    employees: num(cell(v, "employees") || cell(v, "employee_count")),
  };
}

export function assertFloodSnapshotShape(snap: FloodFeatureSnapshot): string[] {
  const e: string[] = [];
  if (snap.schemaVersion !== 1) e.push("schemaVersion");
  if (!snap.capturedAt) e.push("capturedAt");
  return e;
}
export function assertWcSnapshotShape(snap: WcFeatureSnapshot): string[] {
  const e: string[] = [];
  if (snap.schemaVersion !== 1) e.push("schemaVersion");
  if (!snap.capturedAt) e.push("capturedAt");
  return e;
}
export function assertGlSnapshotShape(snap: GlFeatureSnapshot): string[] {
  const e: string[] = [];
  if (snap.schemaVersion !== 1) e.push("schemaVersion");
  if (!snap.capturedAt) e.push("capturedAt");
  return e;
}
