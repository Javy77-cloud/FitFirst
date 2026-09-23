import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatDeltaPct,
  formatSignedMoney,
  PREMIUM_LAPSE_RISK_LABEL,
  premiumLapseRisk,
  type PremiumChange,
} from "@/lib/renewal/compare";
import { formatMoney } from "@/lib/domain";

export function PremiumChangeSummary({
  change,
  className,
  compareHref,
}: {
  change: PremiumChange;
  className?: string;
  /** Optional link to full Compare — look-not-do; does not bind. */
  compareHref?: string | null;
}) {
  const tone =
    change.direction === "up"
      ? "bg-fit-red-bg text-fit-red"
      : change.direction === "down"
        ? "bg-fit-green-bg text-fit-green"
        : "bg-secondary text-navy";
  const lapse = premiumLapseRisk(change);

  return (
    <section className={cn("ff-card ff-premium-change p-4", className)} data-ff-premium-change="">
      <div className="text-caption uppercase tracking-wide text-muted-foreground">
        Premium change
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className={cn("ff-premium-delta-badge rounded-md px-2.5 py-1 text-xl font-semibold", tone)}>
          {formatSignedMoney(change.delta)}
          <span className="ml-2 text-base font-medium">{formatDeltaPct(change.pct)}</span>
        </div>
        <div className="ff-premium-arrow text-sm text-muted-foreground">
          {formatMoney(change.current)} → {formatMoney(change.proposed)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn("ff-premium-lapse-chip", `ff-premium-lapse-${lapse}`)}
          data-ff-premium-lapse={lapse}
          title="Premium-driven lapse risk from the proposed % change — not AI"
        >
          <span className="ff-premium-lapse-label">Premium lapse risk</span>
          <strong>{PREMIUM_LAPSE_RISK_LABEL[lapse]}</strong>
        </span>
        {compareHref ? (
          <Link
            href={compareHref}
            className="ff-premium-compare-link text-sm font-medium"
            data-ff-premium-compare-link=""
          >
            Open full compare
          </Link>
        ) : null}
      </div>
    </section>
  );
}
