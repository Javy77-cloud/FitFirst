import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GlanceTabs } from "@/components/glance/glance-tabs";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { formatDay, formatMoney } from "@/lib/domain";
import { loadGlance } from "@/lib/glance/load";
import { GLANCE_TAB_LABEL } from "@/lib/glance/tabs";
import { GLANCE_LIST_COLUMNS } from "@/lib/list-columns";

export const dynamic = "force-dynamic";

const EMPTY: Record<string, string> = {
  sales: "No open shops on this book.",
  service: "No open service work.",
  claims: "No claim notices on the book yet.",
  renewals: "No in-force terms expire in the next 60 days.",
};

export default async function GlancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const { tab, rows, counts } = await loadGlance(params.tab);

  return (
    <AppShell title="Glance">

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <GlanceTabs tab={tab} counts={counts} />
        <Link href="/scorecards" className="text-sm text-primary hover:underline">
          Producer scorecards
        </Link>
      </div>

      <section className="ff-card overflow-x-auto">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">
            {GLANCE_TAB_LABEL[tab]} · {rows.length}
          </h2>
        </div>
        <DeskColumnTable
          moduleId="glance"
          columns={GLANCE_LIST_COLUMNS}
          empty={EMPTY[tab]}
          rows={rows.map((row) => ({
            key: `${row.tab}-${row.id}`,
            cells: {
              record: (
                <Link href={row.href} className="font-medium text-primary hover:underline">
                  {row.title}
                </Link>
              ),
              kind: <span className="capitalize">{row.kind}</span>,
              status: <span className="capitalize">{row.status}</span>,
              party: row.party,
              owner: row.ownerName ?? "—",
              when: formatDay(row.when),
              detail: (
                <span className="text-xs text-muted-foreground">
                  {row.premium != null && row.tab === "renewals"
                    ? `${formatMoney(row.premium)} · ${row.detail}`
                    : row.detail || "—"}
                </span>
              ),
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
