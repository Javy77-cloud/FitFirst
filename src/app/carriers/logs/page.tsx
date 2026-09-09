import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import { listQuoteLogs } from "@/lib/db/queries";
import { LogsTabs } from "@/components/logs/logs-tabs";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarrierLogsPage() {
  await requireSiteDeveloperPage();
  const rows = await listQuoteLogs();
  return (
    <AppShell
      title="Appetite Log"
      actions={
        <Link href="/carriers" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to carriers
        </Link>
      }
    >
      <LogsTabs current="appetite" />
      <p className="mb-3 text-sm text-muted-foreground">
        Training feed from quote_attempt_logs (source of truth for appetite). Separate from Quotes-tab
        rows. Each attempt stores result + house snapshot so the next shop can skip a lookalike
        decline. Fill Learning is the sibling log.
      </p>
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No decline log rows yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="decline-log" col="date" as="th">Date</Col>
                <Col table="decline-log" col="carrier" as="th">Carrier</Col>
                <Col table="decline-log" col="deal" as="th">Deal</Col>
                <Col table="decline-log" col="result" as="th">Result</Col>
                <Col table="decline-log" col="bindable" as="th">Bindable</Col>
                <Col table="decline-log" col="premium" as="th">Premium</Col>
                <Col table="decline-log" col="covA" as="th">Cov A tried</Col>
                <Col table="decline-log" col="why" as="th">Why</Col>
                <Col table="decline-log" col="snapshot" as="th">Snapshot</Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map(({ log, carrier, deal }) => (
                <tr key={log.id}>
                  <Col
                    table="decline-log"
                    col="date"
                    className="whitespace-nowrap text-xs"
                    sortValue={log.attemptedAt.toISOString()}
                  >
                    {log.attemptedAt.toISOString().slice(0, 10)}
                  </Col>
                  <Col table="decline-log" col="carrier">{carrier.name}</Col>
                  <Col table="decline-log" col="deal">{deal.title}</Col>
                  <Col table="decline-log" col="result" className="uppercase">
                    {log.result.replaceAll("_", " ")}
                  </Col>
                  <Col table="decline-log" col="bindable">{log.bindable ? "Y" : "N"}</Col>
                  <Col table="decline-log" col="premium" sortValue={log.premium}>
                    {formatMoney(log.premium)}
                  </Col>
                  <Col table="decline-log" col="covA" sortValue={log.covATried}>
                    {formatMoney(log.covATried)}
                  </Col>
                  <Col table="decline-log" col="why" className="text-xs">{log.why}</Col>
                  <Col table="decline-log" col="snapshot" className="text-[11px] text-muted-foreground">
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
                  </Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
