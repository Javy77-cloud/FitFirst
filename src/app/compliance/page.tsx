import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { LogsTabs } from "@/components/logs/logs-tabs";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { loadComplianceDesk } from "@/lib/eo-audit/load";
import { eoActionLabel, eoGapLabel } from "@/lib/eo-audit/types";
import { recordHref } from "@/lib/desk/record-href";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  await requireAdminPage();
  const { trail, flags } = await loadComplianceDesk();
  const high = flags.filter((row) => row.severity === "high").length;

  return (
    <AppShell
      title="Compliance"
      actions={
        <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Settings
        </Link>
      }
    >
      <LogsTabs current="compliance" />

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="ff-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open flags</div>
          <div className="mt-1 text-2xl font-semibold text-navy">{flags.length}</div>
        </div>
        <div className="ff-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">High</div>
          <div className="mt-1 text-2xl font-semibold text-navy">{high}</div>
        </div>
        <div className="ff-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trail rows</div>
          <div className="mt-1 text-2xl font-semibold text-navy">{trail.length}</div>
        </div>
      </section>

      <h2 className="mb-2 text-base font-semibold text-navy">E&O gap flags</h2>
      <section className="ff-card mb-6 overflow-x-auto">
        {flags.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No E&O gaps on this book right now.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="eo-gaps" col="severity" as="th">
                  Severity
                </Col>
                <Col table="eo-gaps" col="flag" as="th">
                  Flag
                </Col>
                <Col table="eo-gaps" col="record" as="th">
                  Record
                </Col>
                <Col table="eo-gaps" col="detail" as="th">
                  Detail
                </Col>
              </tr>
            </thead>
            <SheetTbody>
              {flags.map((flag) => {
                const href = recordHref(flag.entityType, flag.entityId);
                return (
                  <tr key={`${flag.kind}-${flag.entityId}`}>
                    <Col table="eo-gaps" col="severity">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs font-semibold uppercase",
                          flag.severity === "high"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-100 text-amber-950",
                        )}
                      >
                        {flag.severity}
                      </span>
                    </Col>
                    <Col table="eo-gaps" col="flag">
                      {eoGapLabel(flag.kind)}
                    </Col>
                    <Col table="eo-gaps" col="record">
                      {href ? (
                        <Link href={href} className="text-primary hover:underline">
                          {flag.recordLabel}
                        </Link>
                      ) : (
                        flag.recordLabel
                      )}
                    </Col>
                    <Col table="eo-gaps" col="detail" className="text-xs text-muted-foreground">
                      {flag.body}
                    </Col>
                  </tr>
                );
              })}
            </SheetTbody>
          </table>
        )}
      </section>

      <h2 className="mb-2 text-base font-semibold text-navy">Recent audit trail</h2>
      <section className="ff-card overflow-x-auto">
        {trail.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No audit rows yet. Desk email, SMS, calls, meetings, document views, PII reveals, and
            policy changes append here. Rows cannot be edited or deleted.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="eo-trail" col="when" as="th">
                  When
                </Col>
                <Col table="eo-trail" col="who" as="th">
                  Who
                </Col>
                <Col table="eo-trail" col="what" as="th">
                  What
                </Col>
                <Col table="eo-trail" col="record" as="th">
                  Record
                </Col>
                <Col table="eo-trail" col="ids" as="th">
                  Record ids
                </Col>
                <Col table="eo-trail" col="summary" as="th">
                  Summary
                </Col>
              </tr>
            </thead>
            <SheetTbody>
              {trail.map((row) => {
                const href = recordHref(row.entityType, row.entityId) ?? recordHref("deal", row.dealId);
                const ids = [
                  row.contactId ? `contact ${row.contactId.slice(0, 8)}` : null,
                  row.policyId ? `policy ${row.policyId.slice(0, 8)}` : null,
                  row.dealId ? `deal ${row.dealId.slice(0, 8)}` : null,
                  row.documentId ? `doc ${row.documentId.slice(0, 8)}` : null,
                  row.activityId ? `activity ${row.activityId.slice(0, 8)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={row.id} id={`eo-${row.id}`}>
                    <Col
                      table="eo-trail"
                      col="when"
                      className="whitespace-nowrap text-xs"
                      sortValue={row.occurredAt.toISOString()}
                    >
                      {row.occurredAt.toISOString().replace("T", " ").slice(0, 16)}
                    </Col>
                    <Col table="eo-trail" col="who">
                      {row.actorName}
                    </Col>
                    <Col table="eo-trail" col="what">
                      {eoActionLabel(row.action)}
                    </Col>
                    <Col table="eo-trail" col="record">
                      {href ? (
                        <Link href={href} className="text-primary hover:underline">
                          {row.recordLabel}
                        </Link>
                      ) : (
                        row.recordLabel
                      )}
                    </Col>
                    <Col table="eo-trail" col="ids" className="font-mono text-[11px] text-muted-foreground">
                      {ids || "—"}
                    </Col>
                    <Col table="eo-trail" col="summary" className="text-xs">
                      {row.summary}
                    </Col>
                  </tr>
                );
              })}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
