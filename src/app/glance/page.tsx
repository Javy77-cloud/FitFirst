import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { GlanceTabs } from "@/components/glance/glance-tabs";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay, formatMoney } from "@/lib/domain";
import { loadGlance } from "@/lib/glance/load";
import { GLANCE_TAB_HINT, GLANCE_TAB_LABEL } from "@/lib/glance/tabs";

export const dynamic = "force-dynamic";

const EMPTY: Record<string, string> = {
  sales: "No open shops on this book. Quote Sent still counts as shopping — bind is a later step.",
  service: "No open service work. Endorsements and review tasks land here when they exist.",
  claims: "No claim notices on the book yet. Log one on Claims — this does not file FNOL.",
  renewals: "No in-force terms expire in the next 60 days. Quotes are not renewals.",
};

export default async function GlancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const { session, tab, rows, counts } = await loadGlance(params.tab);

  return (
    <AppShell
      title="Glance"
      columns={<ColumnPicker tableKey="glance" initial={defaultColumns("glance")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        One lifecycle board. Tabs filter records that already exist — Deals, tasks, claims, and
        Policies. {session.isAdmin ? "Admin sees the whole book." : "You see your book only."} Ana
        Dib stays Quote Sent / unbound at $321,000.
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <GlanceTabs tab={tab} counts={counts} />
        <Link href="/scorecards" className="text-sm text-primary hover:underline">
          Producer scorecards
        </Link>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{GLANCE_TAB_HINT[tab]}</p>

      <section className="ff-card overflow-x-auto">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">
            {GLANCE_TAB_LABEL[tab]} · {rows.length}
          </h2>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{EMPTY[tab]}</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="glance" col="record" as="th">
                  Record
                </Col>
                <Col table="glance" col="kind" as="th">
                  Kind
                </Col>
                <Col table="glance" col="status" as="th">
                  Status
                </Col>
                <Col table="glance" col="party" as="th">
                  Party
                </Col>
                <Col table="glance" col="owner" as="th">
                  Assigned
                </Col>
                <Col table="glance" col="when" as="th">
                  Date
                </Col>
                <Col table="glance" col="detail" as="th">
                  Detail
                </Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map((row) => (
                <tr key={`${row.tab}-${row.id}`}>
                  <Col table="glance" col="record">
                    <Link href={row.href} className="font-medium text-primary hover:underline">
                      {row.title}
                    </Link>
                  </Col>
                  <Col table="glance" col="kind" className="capitalize">
                    {row.kind}
                  </Col>
                  <Col table="glance" col="status" className="capitalize">
                    {row.status}
                  </Col>
                  <Col table="glance" col="party">{row.party}</Col>
                  <Col table="glance" col="owner">{row.ownerName ?? "—"}</Col>
                  <Col table="glance" col="when">{formatDay(row.when)}</Col>
                  <Col table="glance" col="detail" className="text-xs text-muted-foreground">
                    {row.premium != null && row.tab === "renewals"
                      ? `${formatMoney(row.premium)} · ${row.detail}`
                      : row.detail || "—"}
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
