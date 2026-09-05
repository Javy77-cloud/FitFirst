import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { RenewalRiskBadge } from "@/components/renewal-risk/risk-card";
import type { RenewalRiskAccount } from "@/lib/renewal-risk/load";

export function RenewalRiskBoard({ rows, embedded = false }: { rows: RenewalRiskAccount[]; embedded?: boolean }) {
  return (
    <section className={embedded ? "overflow-hidden" : "ff-card overflow-hidden"} data-widget="renewal_risk">
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy">
          <ShieldAlert className="size-3.5 text-fit-flag" />
          Renewal-risk flags
        </h3>
        <p className="text-helper text-muted-foreground">
          Rule-based. Flags households before the 45–75 day rate-increase window using days to
          renewal, premium change if known, monoline, lapse history, and no contact 60 days. Not
          AI.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          No households in the 90-day watch. Hale and Nair seed into this list after migrate +
          seed.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.slice(0, 8).map((row) => (
            <li key={row.key} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <Link href={row.href} className="text-sm font-semibold text-navy hover:underline">
                  {row.name}
                </Link>
                <p className="text-helper text-muted-foreground">
                  {row.daysToRenewal != null ? `${row.daysToRenewal} days` : "No expiration"}
                  {row.policyNumber ? ` · ${row.policyNumber}` : ""}
                  {row.risk.beforeRateIncreaseWindow
                    ? " · before rate-increase window"
                    : row.risk.inRateIncreaseWindow
                      ? " · in rate-increase window"
                      : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RenewalRiskBadge label={`${row.risk.label} ${row.risk.score}`} band={row.risk.band} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
