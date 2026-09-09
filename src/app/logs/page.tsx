import { requireSiteDeveloperPage } from "@/lib/auth/guards";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/domain";
import { listQuoteLogs } from "@/lib/db/queries";
import { LOGS_LIST_COLUMNS } from "@/lib/list-columns";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  await requireSiteDeveloperPage();
  const rows = await listQuoteLogs();
  return (
    <AppShell title="Appetite Log">
      <p className="mb-3 text-base text-muted-foreground">
        Separate from quotes. Each row stores the result and a house snapshot so the next shop
        can skip a lookalike decline.
      </p>
      <section className="ff-card overflow-x-auto">
        <DeskColumnTable
          moduleId="quote-logs"
          columns={LOGS_LIST_COLUMNS}
          empty="No appetite or decline rows yet."
          rows={rows.map(({ log, carrier, deal }) => ({
            key: log.id,
            cells: {
              date: log.attemptedAt.toISOString().slice(0, 10),
              carrier: carrier.name,
              deal: deal.title,
              result: <StatusBadge status={log.result}>{log.result.replaceAll("_", " ")}</StatusBadge>,
              bindable: log.bindable ? "Y" : "N",
              premium: formatMoney(log.premium),
              covA: formatMoney(log.covATried),
              why: log.why,
              snapshot: [
                log.snapYearBuilt,
                log.snapConstruction,
                log.snapRoofCovering,
                log.snapCity,
                log.snapCounty,
                log.snapMilesToCoast != null ? `${log.snapMilesToCoast} mi` : null,
              ]
                .filter(Boolean)
                .join(" · "),
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
