import { AppShell } from "@/components/app-shell";
import { ColumnPicker } from "@/components/crm/data-table";
import { formatMoney } from "@/lib/domain";
import { listQuoteLogs } from "@/lib/db/queries";

const COLUMNS = [
  { id: "date", header: "Date", defaultVisible: true },
  { id: "carrier", header: "Carrier", defaultVisible: true },
  { id: "deal", header: "Deal", defaultVisible: true },
  { id: "result", header: "Result", defaultVisible: true },
  { id: "bindable", header: "Bindable", defaultVisible: true },
  { id: "premium", header: "Premium", defaultVisible: true },
  { id: "cova", header: "Cov A tried", defaultVisible: true },
  { id: "why", header: "Why", defaultVisible: true },
  { id: "snapshot", header: "Snapshot", defaultVisible: false },
];

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const rows = await listQuoteLogs();
  return (
    <AppShell title="Appetite / decline log">
      <p className="mb-3 text-sm text-muted-foreground">
        Separate from quotes. Each row stores the result and a house snapshot so the next shop
        can skip a lookalike decline.
      </p>
      <ColumnPicker tableId="logs" columns={COLUMNS}>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.id} data-col={col.id}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ log, carrier, deal }) => (
              <tr key={log.id}>
                <td data-col="date" className="whitespace-nowrap text-xs">
                  {log.attemptedAt.toISOString().slice(0, 10)}
                </td>
                <td data-col="carrier">{carrier.name}</td>
                <td data-col="deal">{deal.title}</td>
                <td data-col="result" className="uppercase">
                  {log.result.replaceAll("_", " ")}
                </td>
                <td data-col="bindable">{log.bindable ? "Y" : "N"}</td>
                <td data-col="premium">{formatMoney(log.premium)}</td>
                <td data-col="cova">{formatMoney(log.covATried)}</td>
                <td data-col="why" className="text-xs">
                  {log.why}
                </td>
                <td data-col="snapshot" className="text-[11px] text-muted-foreground">
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
      </section>
      </ColumnPicker>
    </AppShell>
  );
}
