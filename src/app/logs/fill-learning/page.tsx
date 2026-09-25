import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { LogsTabs } from "@/components/logs/logs-tabs";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { listFillLearningLogs } from "@/lib/db/queries";
import { fillLearningDocTypeLabel } from "@/lib/fill-learning/doc-types";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function FillLearningLogsPage() {
  await requireAdminPage();
  const rows = await listFillLearningLogs();

  return (
    <AppShell
      title="Fill Learning"
      actions={
        <Link href="/carriers" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to carriers
        </Link>
      }
    >
      <LogsTabs current="fill-learning" />

      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No fill corrections yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="fill-learning" col="date" as="th">
                  Date
                </Col>
                <Col table="fill-learning" col="deal" as="th">
                  Deal
                </Col>
                <Col table="fill-learning" col="docType" as="th">
                  Doc type
                </Col>
                <Col table="fill-learning" col="field" as="th">
                  Field
                </Col>
                <Col table="fill-learning" col="extracted" as="th">
                  Extracted
                </Col>
                <Col table="fill-learning" col="corrected" as="th">
                  Corrected
                </Col>
                <Col table="fill-learning" col="by" as="th">
                  Corrected by
                </Col>
                <Col table="fill-learning" col="carrier" as="th">
                  Carrier
                </Col>
                <Col table="fill-learning" col="note" as="th">
                  Note
                </Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map(({ log, deal, carrier }) => (
                <tr key={log.id} id={`fill-${log.id}`}>
                  <Col
                    table="fill-learning"
                    col="date"
                    className="whitespace-nowrap text-xs"
                    sortValue={log.loggedAt.toISOString()}
                  >
                    {formatDay(log.loggedAt)}
                  </Col>
                  <Col table="fill-learning" col="deal">
                    {deal ? (
                      <Link href={`/deals/${deal.id}?tab=quote-sheet`} className="text-primary hover:underline">
                        {deal.title}
                      </Link>
                    ) : (
                      "Agency-wide"
                    )}
                  </Col>
                  <Col table="fill-learning" col="docType">
                    {fillLearningDocTypeLabel(log.docType)}
                  </Col>
                  <Col table="fill-learning" col="field" className="font-mono text-xs">
                    {log.fieldKey}
                  </Col>
                  <Col table="fill-learning" col="extracted">{log.extractedValue || "—"}</Col>
                  <Col table="fill-learning" col="corrected">{log.correctedValue}</Col>
                  <Col table="fill-learning" col="by">{log.correctedBy}</Col>
                  <Col table="fill-learning" col="carrier">{carrier?.name ?? "—"}</Col>
                  <Col table="fill-learning" col="note" className="text-xs">
                    {log.note ?? "—"}
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
