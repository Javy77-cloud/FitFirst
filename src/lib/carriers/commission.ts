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

export type BonusTier = {
  /** Premium dollars at/above which this bonus applies. */
  threshold: number;
  /** Extra commission points (e.g. 1 = +1%). */
  bonusPctPoints: number;
  raw: string;
};

export type AgencyCommissionKind = "new" | "renewal";

export type AgencyCommissionResult = {
  premium: number;
  kind: AgencyCommissionKind;
  basePctPoints: number;
  bonusPctPoints: number;
  effectivePctPoints: number;
  agencyCut: number;
  scheduleLob: string;
  bonusApplied: BonusTier | null;
  rateLabel: string;
};

/** Parse "12", "12%", "12.5 pct" → 12.5 points. */
export function parsePercentPoints(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*%?/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Parse money-ish thresholds: 50k, $100,000, 1.5m, 25000. */
export function parseMoneyAmount(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!s) return null;
  const m = s.match(/^(-?\d+(?:\.\d+)?)(k|m|mm|b)?$/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = (m[2] ?? "").toLowerCase();
  if (suffix === "k") n *= 1_000;
  else if (suffix === "m" || suffix === "mm") n *= 1_000_000;
  else if (suffix === "b") n *= 1_000_000_000;
  return n;
}

/**
 * Parse free-text bonus thresholds from the commission schedule.
 * Accepts pieces like: "50k:+1%", "100000 = 2%", "50k → +1; 100k → +2%".
 */
export function parseBonusThresholds(raw: string | null | undefined): BonusTier[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const parts = text.split(/[;|/\n]+/).map((p) => p.trim()).filter(Boolean);
  const tiers: BonusTier[] = [];
  for (const part of parts) {
    const m = part.match(
      /([\d$.,]+\s*[kmb]?)\s*(?:→|->|=|:|,)?\s*\+?\s*(-?\d+(?:\.\d+)?)\s*%?/i,
    );
    if (!m) continue;
    const threshold = parseMoneyAmount(m[1]);
    const bonusPctPoints = Number(m[2]);
    if (threshold == null || !Number.isFinite(bonusPctPoints)) continue;
    tiers.push({ threshold, bonusPctPoints, raw: part });
  }
  return tiers.sort((a, b) => a.threshold - b.threshold);
}

export function pickScheduleRowForLob(
  rows: CommissionScheduleRow[],
  lob: string | null | undefined,
): CommissionScheduleRow | null {
  if (!rows.length) return null;
  const needle = (lob ?? "").trim().toLowerCase();
  if (needle) {
    const exact = rows.find((r) => r.lob.trim().toLowerCase() === needle);
    if (exact) return exact;
    const contains = rows.find((r) => {
      const lobKey = r.lob.trim().toLowerCase();
      return lobKey.includes(needle) || needle.includes(lobKey);
    });
    if (contains) return contains;
  }
  const all = rows.find((r) => {
    const lobKey = r.lob.trim().toLowerCase();
    return !lobKey || lobKey === "all" || lobKey === "*";
  });
  return all ?? rows[0] ?? null;
}

export function calculateAgencyCommission(input: {
  premium: number;
  kind: AgencyCommissionKind;
  scheduleRow: CommissionScheduleRow | null;
}): AgencyCommissionResult | null {
  const premium = Number(input.premium);
  if (!Number.isFinite(premium) || premium < 0) return null;
  const row = input.scheduleRow;
  if (!row) return null;
  const baseRaw = input.kind === "new" ? row.newBusinessPct : row.renewalPct;
  const basePctPoints = parsePercentPoints(baseRaw);
  if (basePctPoints == null) return null;
  const tiers = parseBonusThresholds(row.bonusThresholds);
  let bonusApplied: BonusTier | null = null;
  for (const tier of tiers) {
    if (premium >= tier.threshold) bonusApplied = tier;
  }
  const bonusPctPoints = bonusApplied?.bonusPctPoints ?? 0;
  const effectivePctPoints = basePctPoints + bonusPctPoints;
  const agencyCut = Math.round(premium * (effectivePctPoints / 100) * 100) / 100;
  return {
    premium,
    kind: input.kind,
    basePctPoints,
    bonusPctPoints,
    effectivePctPoints,
    agencyCut,
    scheduleLob: row.lob || "All",
    bonusApplied,
    rateLabel: `${effectivePctPoints}% ${input.kind === "new" ? "New Business" : "Renewal"}`,
  };
}
