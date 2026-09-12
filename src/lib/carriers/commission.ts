import type { CommissionScheduleRow } from "@/lib/db/schema";

export type { CommissionScheduleRow };

export function normalizeCommissionSchedule(
  rows: CommissionScheduleRow[] | null | undefined,
  fallback?: { newBusinessPct?: string | null; renewalPct?: string | null },
): CommissionScheduleRow[] {
  const cleaned = (rows ?? [])
    .map((row) => ({
      lob: String(row.lob ?? "").trim(),
      newBusinessPct: String(row.newBusinessPct ?? "").trim(),
      renewalPct: String(row.renewalPct ?? "").trim(),
      bonusThresholds: String(row.bonusThresholds ?? "").trim(),
    }))
    .filter((row) => row.lob || row.newBusinessPct || row.renewalPct || row.bonusThresholds);
  if (cleaned.length) return cleaned;
  const nb = (fallback?.newBusinessPct ?? "").trim();
  const rn = (fallback?.renewalPct ?? "").trim();
  if (!nb && !rn) return [];
  return [
    {
      lob: "All",
      newBusinessPct: nb,
      renewalPct: rn,
      bonusThresholds: "",
    },
  ];
}

export function parseCommissionScheduleJson(raw: string): CommissionScheduleRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeCommissionSchedule(
      parsed.map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        return {
          lob: String(r.lob ?? ""),
          newBusinessPct: String(r.newBusinessPct ?? r.new_business_pct ?? ""),
          renewalPct: String(r.renewalPct ?? r.renewal_pct ?? ""),
          bonusThresholds: String(r.bonusThresholds ?? r.bonus_thresholds ?? ""),
        };
      }),
    );
  } catch {
    return [];
  }
}
