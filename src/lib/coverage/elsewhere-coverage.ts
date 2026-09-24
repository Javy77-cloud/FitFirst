import {
  classifyDeclaredCoverageType,
  DECLARED_LINE_LABEL,
  type DeclaredCoverageLine,
} from "@/lib/coverage/declared-coverage";
import { gapLineLabel, type CoverageLine } from "@/lib/coverage/gaps";
import type { ElsewhereCoverageRow } from "@/lib/db/schema";

/** Lines agents can pick for Elsewhere rows (reusable on Accounts later). */
export const ELSEWHERE_LINE_OPTIONS: CoverageLine[] = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "RV",
  "LIFE",
  "HEALTH",
  "GL",
  "BOP",
  "WC",
];

export function elsewhereLineLabel(line: string): string {
  const classified = classifyDeclaredCoverageType(line);
  if (classified !== "OTHER") return gapLineLabel(classified);
  const trimmed = String(line ?? "").trim();
  return trimmed || "Other";
}

export function newElsewhereRow(partial?: Partial<ElsewhereCoverageRow>): ElsewhereCoverageRow {
  return {
    id:
      partial?.id ??
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `elsewhere-${Date.now()}`),
    line: partial?.line ?? "AUTO",
    carrier: partial?.carrier ?? "",
    renewalDate: partial?.renewalDate ?? "",
    roughPremium: partial?.roughPremium ?? "",
  };
}

export function parseElsewhereCoverage(raw: unknown): ElsewhereCoverageRow[] {
  if (raw == null) return [];
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row, index) => normalizeElsewhereRow(row, index)).filter(Boolean) as ElsewhereCoverageRow[];
}

function normalizeElsewhereRow(row: unknown, index: number): ElsewhereCoverageRow | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const r = row as Record<string, unknown>;
  const line = String(r.line ?? r.lineOfBusiness ?? "").trim();
  if (!line) return null;
  return {
    id: String(r.id ?? `elsewhere-${index}`),
    line,
    carrier: String(r.carrier ?? r.carrierName ?? "").trim(),
    renewalDate: String(r.renewalDate ?? r.renewal_date ?? "").trim(),
    roughPremium: String(r.roughPremium ?? r.rough_premium ?? r.premium ?? "").trim(),
  };
}

export function serializeElsewhereCoverage(rows: readonly ElsewhereCoverageRow[]): string {
  return JSON.stringify(rows.map((row) => ({
    id: row.id,
    line: row.line,
    carrier: row.carrier,
    renewalDate: row.renewalDate,
    roughPremium: row.roughPremium,
  })));
}

/** Elsewhere rows count as other-carrier coverage for gap / opportunity engines. */
export function declaredCoverageFromElsewhere(
  rows: readonly ElsewhereCoverageRow[] | null | undefined,
): DeclaredCoverageLine[] {
  const byLine = new Map<CoverageLine, DeclaredCoverageLine>();
  for (const row of rows ?? []) {
    const line = classifyDeclaredCoverageType(row.line);
    if (line === "OTHER") continue;
    byLine.set(line, { line, carrierOfRecord: "other" });
  }
  return [...byLine.values()];
}

export function mergeDeclaredCoverage(
  ...sources: Array<readonly DeclaredCoverageLine[] | null | undefined>
): DeclaredCoverageLine[] {
  const byLine = new Map<CoverageLine, DeclaredCoverageLine>();
  for (const source of sources) {
    for (const row of source ?? []) {
      if (row.line === "OTHER") continue;
      const prev = byLine.get(row.line);
      if (!prev) {
        byLine.set(row.line, { ...row });
        continue;
      }
      // Prefer explicit other; never invent us from elsewhere.
      if (row.carrierOfRecord === "other" || prev.carrierOfRecord == null) {
        byLine.set(row.line, { line: row.line, carrierOfRecord: row.carrierOfRecord });
      }
    }
  }
  return [...byLine.values()];
}

/** Seed Elsewhere rows from legacy other-carrier multi-select when JSONB is empty. */
export function seedElsewhereFromDeclared(
  declared: readonly DeclaredCoverageLine[],
  existing: readonly ElsewhereCoverageRow[] = [],
): ElsewhereCoverageRow[] {
  if (existing.length > 0) return [...existing];
  return declared
    .filter((row) => row.carrierOfRecord === "other" && row.line !== "OTHER")
    .map((row) =>
      newElsewhereRow({
        id: `elsewhere-seed-${row.line}`,
        line: row.line,
        carrier: "",
        renewalDate: "",
        roughPremium: "",
      }),
    );
}

const RENEWAL_WINDOW_DAYS = 90;

export function daysUntilRenewal(
  renewalDate: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  const raw = String(renewalDate ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const start = new Date(asOf);
  start.setHours(12, 0, 0, 0);
  const diffMs = parsed.getTime() - start.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function elsewhereRenewalsInWindow(
  rows: readonly ElsewhereCoverageRow[],
  opts?: { withinDays?: number; asOf?: Date },
): Array<ElsewhereCoverageRow & { daysUntil: number }> {
  const within = opts?.withinDays ?? RENEWAL_WINDOW_DAYS;
  const asOf = opts?.asOf ?? new Date();
  const out: Array<ElsewhereCoverageRow & { daysUntil: number }> = [];
  for (const row of rows) {
    const days = daysUntilRenewal(row.renewalDate, asOf);
    if (days == null) continue;
    if (days < 0 || days > within) continue;
    out.push({ ...row, daysUntil: days });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

export { RENEWAL_WINDOW_DAYS };
