import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import { listQuoteLogs } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarrierLogsPage() {
  const rows = await listQuoteLogs();
  return (
    <AppShell
      title="Decline log"
      actions={
        <Link href="/carriers" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to carriers
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Parked under Carriers. Separate from quotes. Each row stores the result and a house
        snapshot so the next shop can skip a lookalike decline. Ana Dib stays unbound at Cov A
        $321,000 — these rows are skips, not binds.
      </p>
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No decline log rows yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Carrier</th>
                <th>Deal</th>
                <th>Result</th>
                <th>Bindable</th>
                <th>Premium</th>
                <th>Cov A tried</th>
                <th>Why</th>
                <th>Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ log, carrier, deal }) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs">
                    {log.attemptedAt.toISOString().slice(0, 10)}
                  </td>
                  <td>{carrier.name}</td>
                  <td>{deal.title}</td>
                  <td className="uppercase">{log.result.replaceAll("_", " ")}</td>
                  <td>{log.bindable ? "Y" : "N"}</td>
                  <td>{formatMoney(log.premium)}</td>
                  <td>{formatMoney(log.covATried)}</td>
                  <td className="text-xs">{log.why}</td>
                  <td className="text-[11px] text-muted-foreground">
                    {[
                      log.snapYearBuilt,
                      log.snapConstruction,
                      log.snapRoofCovering,
                      log.snapCity,
                      log.snapCounty,
                      log.snapMilesToCoast != null ? `${log.snapMilesToCoast} mi` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
