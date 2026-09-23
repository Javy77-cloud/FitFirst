import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  compareSummary,
  formatDeltaPct,
  formatSignedMoney,
  premiumShopStayHint,
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
  /** Optional link to Compare — Overview shows Renew; keep this light. */
  compareHref?: string | null;
}) {
  const tone =
    change.direction === "up"
      ? "bg-fit-red-bg text-fit-red"
      : change.direction === "down"
        ? "bg-fit-green-bg text-fit-green"
        : "bg-secondary text-navy";
  const hint = premiumShopStayHint(change);

  return (
    <section className={cn("ff-card p-4", className)} data-ff-premium-change="">
      <div className="text-caption uppercase tracking-wide text-muted-foreground">
        Premium change
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-3">
        <div className={cn("rounded-md px-2.5 py-1 text-xl font-semibold", tone)}>
          {formatSignedMoney(change.delta)}
          <span className="ml-2 text-base font-medium">{formatDeltaPct(change.pct)}</span>
        </div>
        <div className="text-base text-muted-foreground">
          {formatMoney(change.current)} → {formatMoney(change.proposed)}
        </div>
      </div>
      <p className="mt-2 text-base text-muted-foreground">{compareSummary(change)}</p>
      <p className="mt-1 text-sm text-muted-foreground" data-ff-premium-shop-stay-hint="">
        {hint}
        {compareHref ? (
          <>
            {" "}
            <Link
              href={compareHref}
              className="font-medium text-primary hover:underline"
              data-ff-premium-compare-link=""
            >
              Open Compare
            </Link>
          </>
        ) : null}
      </p>
    </section>
  );
}
