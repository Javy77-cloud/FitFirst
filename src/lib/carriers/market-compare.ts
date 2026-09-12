import {
  normalizeCommissionSchedule,
  pickScheduleRowForLob,
  type CommissionScheduleRow,
} from "@/lib/carriers/commission";

export type MarketCompareCarrierInput = {
  id: string;
  name: string;
  active: boolean;
  writtenLines: string[] | null | undefined;
  appetiteNotes: string | null | undefined;
  dontWriteNotes: string | null | undefined;
  amBestRating: string | null | undefined;
  amBestOutlook: string | null | undefined;
  commissionSchedule: CommissionScheduleRow[] | null | undefined;
  newBusinessCommPct: string | null | undefined;
  renewalCommPct: string | null | undefined;
};

export type MarketCompareRow = {
  carrierId: string;
  carrierName: string;
  active: boolean;
  writesLine: boolean;
  appetite: string;
  dontWrite: string;
  newBusinessPct: string;
  renewalPct: string;
  bonusThresholds: string;
  amBestRating: string;
  amBestOutlook: string;
  scheduleLob: string;
};

function lobMatch(lines: string[] | null | undefined, lob: string): boolean {
  const needle = lob.trim().toLowerCase();
  if (!needle) return true;
  return (lines ?? []).some((line) => {
    const v = String(line).trim().toLowerCase();
    return v === needle || v.includes(needle) || needle.includes(v);
  });
}

function scheduleCoversLob(rows: CommissionScheduleRow[], lob: string): boolean {
  const needle = lob.trim().toLowerCase();
  if (!needle) return rows.length > 0;
  // Explicit LOB row only — "All" / scalar fallback must not pull unrelated writers into a line compare.
  return rows.some((row) => {
    const key = row.lob.trim().toLowerCase();
    if (!key || key === "all" || key === "*") return false;
    return key === needle || key.includes(needle) || needle.includes(key);
  });
}

/** Build side-by-side market rows for one LOB (agency market comparison). */
export function buildMarketCompareRows(
  carriers: MarketCompareCarrierInput[],
  lob: string,
): MarketCompareRow[] {
  const line = lob.trim();
  const rows: MarketCompareRow[] = [];
  for (const carrier of carriers) {
    const schedule = normalizeCommissionSchedule(carrier.commissionSchedule, {
      newBusinessPct: carrier.newBusinessCommPct,
      renewalPct: carrier.renewalCommPct,
    });
    const writesLine = lobMatch(carrier.writtenLines, line);
    const hasSchedule = scheduleCoversLob(schedule, line);
    if (line && !writesLine && !hasSchedule) continue;

    const picked = pickScheduleRowForLob(schedule, line);
    rows.push({
      carrierId: carrier.id,
      carrierName: carrier.name,
      active: carrier.active,
      writesLine,
      appetite: (carrier.appetiteNotes ?? "").trim(),
      dontWrite: (carrier.dontWriteNotes ?? "").trim(),
      newBusinessPct: picked?.newBusinessPct?.trim() || "—",
      renewalPct: picked?.renewalPct?.trim() || "—",
      bonusThresholds: picked?.bonusThresholds?.trim() || "—",
      amBestRating: (carrier.amBestRating ?? "").trim() || "—",
      amBestOutlook: (carrier.amBestOutlook ?? "").trim() || "—",
      scheduleLob: picked?.lob?.trim() || "—",
    });
  }
  return rows.sort((a, b) => {
    if (a.writesLine !== b.writesLine) return a.writesLine ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.carrierName.localeCompare(b.carrierName);
  });
}
