import { formatMoney } from "@/lib/domain";
import type { EarningsTotals } from "@/lib/commissions/rollups";

export function EarningsStrip({
  totals,
  mode,
}: {
  totals: EarningsTotals;
  mode: "agency" | "producer";
}) {
  const pending = mode === "agency" ? totals.pendingAgency : totals.pendingProducer;
  const paid = mode === "agency" ? totals.paidAgency : totals.paidProducer;
  const label = mode === "agency" ? "Agency commission" : "Your producer split";
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <div className="ff-card p-4">
        <div className="text-xs text-muted-foreground">Pending · {label}</div>
        <div className="text-2xl font-semibold text-navy">{formatMoney(pending)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {totals.pendingCount} {totals.pendingCount === 1 ? "row" : "rows"} not paid
        </div>
      </div>
      <div className="ff-card p-4">
        <div className="text-xs text-muted-foreground">Paid · {label}</div>
        <div className="text-2xl font-semibold text-navy">{formatMoney(paid)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {totals.paidCount} {totals.paidCount === 1 ? "row" : "rows"} marked paid
        </div>
      </div>
    </div>
  );
}
