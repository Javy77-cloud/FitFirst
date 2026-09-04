import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { RenewalRiskAccount } from "@/lib/renewal-risk/load";
import { RATE_INCREASE_WINDOW } from "@/lib/renewal-risk/score";
import { cn } from "@/lib/utils";

const BAND_CLASS: Record<string, string> = {
  watch: "bg-secondary text-navy",
  elevated: "bg-fit-yellow-bg text-fit-yellow",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export function RenewalRiskBadge({
  label,
  band,
}: {
  label: string;
  band: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        BAND_CLASS[band] ?? BAND_CLASS.watch,
      )}
    >
      {label} risk
    </span>
  );
}

export function RenewalRiskCard({
  row,
  compact = false,
}: {
  row: RenewalRiskAccount;
  compact?: boolean;
}) {
  const windowNote = row.risk.beforeRateIncreaseWindow
    ? "Flagged before the 45–75 day rate-increase window."
    : row.risk.inRateIncreaseWindow
      ? "Already inside the rate-increase window."
      : `Watch starts at ${RATE_INCREASE_WINDOW.flagBeforeDays} days.`;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-3" data-renewal-risk={row.risk.band}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="size-3.5 text-fit-flag" />
            <span className="text-sm font-semibold text-navy">Renewal risk</span>
            <RenewalRiskBadge label={row.risk.label} band={row.risk.band} />
            <span className="text-[12px] text-muted-foreground">{row.risk.score}/100</span>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{windowNote} Rule-based — not AI.</p>
        </div>
        {compact ? (
          <Link href={row.href} className="text-[12px] font-medium text-primary hover:underline">
            Open 360
          </Link>
        ) : null}
      </div>
      <dl className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2">
        {row.daysToRenewal != null ? (
          <div>
            <dt className="text-muted-foreground">Days to renewal</dt>
            <dd className="font-medium text-navy">{row.daysToRenewal}</dd>
          </div>
        ) : null}
        {row.policyNumber ? (
          <div>
            <dt className="text-muted-foreground">Nearest term</dt>
            <dd className="font-medium text-navy">
              {row.policyNumber}
              {row.lineOfBusiness ? ` · ${row.lineOfBusiness}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      <ul className="mt-2 space-y-1 text-[12px]">
        {row.risk.factors
          .filter((factor) => factor.points > 0)
          .map((factor) => (
            <li key={factor.id} className="text-navy">
              <span className="font-medium">+{factor.points}</span>{" "}
              <span className="text-muted-foreground">{factor.detail}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
