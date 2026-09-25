import Link from "next/link";
import { Percent, ShieldAlert, Trophy } from "lucide-react";
import { formatMoney } from "@/lib/domain";
import type { HitLostReport } from "@/lib/reporting/hit-lost";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function HitLostCards({ report, embedded = false }: { report: HitLostReport; embedded?: boolean }) {
  return (
    <section className={embedded ? "overflow-hidden" : "ff-card overflow-hidden"}>
      <div className="border-b border-border bg-[color:var(--ff-wash)] px-4 py-3">
        <h3 className="text-sm font-semibold text-navy">Hit ratio and lost business</h3>

      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Percent}
          label="Quote hit ratio"
          value={report.quoteHitPct == null ? "—" : `${report.quoteHitPct}%`}
          hint={`${fmt(report.boundCount)} bound / ${fmt(report.quotedCount)} quoted`}
        />
        <Stat
          icon={Trophy}
          label="Shop hit ratio"
          value={report.shopHitPct == null ? "—" : `${report.shopHitPct}%`}
          hint={`${fmt(report.shopsBound)} shops bound / ${fmt(report.shopsQuoted)} shops quoted`}
        />
        <Stat
          icon={ShieldAlert}
          label="Declined / lost"
          value={fmt(report.declinedCount)}
          hint={report.lostReasons[0] ? `Top reason: ${report.lostReasons[0].label}` : undefined}
        />
        <Stat
          icon={Percent}
          label="Uncoded lost"
          value={fmt(report.uncodedLost)}
        />
      </div>

      <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Carrier performance
          </h4>
          {report.carriers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quoted or declined attempts yet.</p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Quoted</th>
                  <th>Declined</th>
                  <th>Bound</th>
                  <th>Hit</th>
                  <th>Avg quoted</th>
                </tr>
              </thead>
              <tbody>
                {report.carriers.slice(0, 8).map((row) => (
                  <tr key={row.carrierId}>
                    <td className="font-medium">{row.carrierName}</td>
                    <td>{row.quoted}</td>
                    <td>{row.declined}</td>
                    <td>{row.bound}</td>
                    <td>{row.hitPct == null ? "—" : `${row.hitPct}%`}</td>
                    <td>{row.avgQuotedPremium != null ? formatMoney(row.avgQuotedPremium) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lost-business reasons
          </h4>
          {report.lostReasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No picklist reasons yet.</p>
          ) : (
            <ul className="space-y-2">
              {report.lostReasons.map((row) => (
                <li key={row.reason} className="flex items-center justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="font-semibold text-navy">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-helper text-muted-foreground">
            Open the{" "}
            <Link href="/quotes" className="text-primary hover:underline">
              Quotes board
            </Link>{" "}
            to set reasons. Compare a deal with{" "}
            <Link href="/deals" className="text-primary hover:underline">
              Deal → Compare quotes
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-caption uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-navy">{value}</div>
      {hint ? <p className="text-helper text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
