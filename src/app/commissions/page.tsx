import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AskThread } from "@/components/ask-thread";
import { MixBars, ShareDonut } from "@/components/commissions/charts";
import { CommissionStatusForm } from "@/components/commissions/status-form";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { isAdmin } from "@/lib/auth/rbac";
import {
  rollupByAgent,
  rollupByCarrier,
  rollupByLine,
  widgetTotals,
} from "@/lib/commissions/rollups";
import {
  COMMISSION_RANGES,
  formatMoney,
  formatRatePct,
  type CommissionRange,
  type CommissionView,
} from "@/lib/domain";
import { listAsksForEntities, listCommissionWidgets, listCommissions } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<CommissionRange, string> = {
  all: "All",
  pending: "Pending",
  paid: "Paid",
  last_30: "Last 30 days",
  last_quarter: "Last quarter",
  fiscal_year: "This fiscal year",
  upcoming: "Upcoming to be paid",
};

function asRange(value: string | undefined): CommissionRange {
  return COMMISSION_RANGES.includes(value as CommissionRange)
    ? (value as CommissionRange)
    : "all";
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; range?: string }>;
}) {
  const params = await searchParams;
  const requestedView = params.view === "mine" ? "mine" : "agency";
  const range = asRange(params.range);
  const { rows, actor, fiscalYearStartMonth } = await listCommissions({
    view: requestedView,
    range,
  });
  const view: CommissionView = isAdmin(actor) && requestedView === "agency" ? "agency" : "mine";
  const widgetRows = await listCommissionWidgets();
  const widgets = widgetTotals(widgetRows);
  const asks = await listAsksForEntities(
    "commission",
    rows.map((row) => row.commission.id),
  );
  const asksById = new Map<string, typeof asks>();
  for (const row of asks) {
    const list = asksById.get(row.ask.entityId) ?? [];
    list.push(row);
    asksById.set(row.ask.entityId, list);
  }

  const rollupSource = rows.map((row) => ({
    agentId: row.commission.agentId,
    agentName: row.agent.name,
    carrierId: row.commission.carrierId,
    carrierName: row.carrier?.name ?? "Unassigned",
    lineOfBusiness: row.commission.lineOfBusiness,
    premium: row.commission.premium,
    amount: row.commission.amount,
    status: row.commission.status,
  }));
  const byAgent = rollupByAgent(rollupSource);
  const byCarrier = rollupByCarrier(rollupSource);
  const byLine = rollupByLine(rollupSource);

  const href = (next: { view?: CommissionView; range?: CommissionRange }) => {
    const q = new URLSearchParams();
    q.set("view", next.view ?? view);
    q.set("range", next.range ?? range);
    return `/commissions?${q.toString()}`;
  };

  return (
    <AppShell title={view === "agency" ? "Agency commissions" : "My commissions"}>
      <p className="mb-3 text-sm text-muted-foreground">
        Producer pay on bound policies — not FitFirst billing, and not quote floors from a shop.
        Fiscal year is January–December
        {fiscalYearStartMonth === 1 ? "" : ` (start month ${fiscalYearStartMonth})`}.
      </p>

      {isAdmin(actor) ? (
        <div className="mb-3 inline-flex rounded-md bg-secondary p-0.5">
          <Link
            href={href({ view: "mine" })}
            className={cn(
              "rounded-sm px-3 py-1 text-xs font-medium",
              view === "mine" ? "bg-card text-navy shadow-sm" : "text-muted-foreground",
            )}
          >
            My commissions
          </Link>
          <Link
            href={href({ view: "agency" })}
            className={cn(
              "rounded-sm px-3 py-1 text-xs font-medium",
              view === "agency" ? "bg-card text-navy shadow-sm" : "text-muted-foreground",
            )}
          >
            Agency
          </Link>
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          Agent view — only your pay. Switch to Admin in the rail to see the desk.
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Pending total", widgets.pending],
          ["Paid last 30 days", widgets.paidLast30],
          ["Upcoming due", widgets.upcoming],
        ].map(([label, value]) => (
          <div key={String(label)} className="ff-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold text-navy">{formatMoney(value)}</div>
          </div>
        ))}
      </div>

      {view === "agency" ? (
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Per agent
            </div>
            <RollupTable rows={byAgent} empty="No producer pay in this filter." />
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Per carrier
            </div>
            <RollupTable rows={byCarrier} empty="No carrier share in this filter." />
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Per line
            </div>
            <RollupTable rows={byLine} empty="No line mix in this filter." />
          </section>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <ShareDonut title="Carrier share" slices={byCarrier} />
        <MixBars title="Line mix" bars={byLine} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {COMMISSION_RANGES.map((key) => (
          <Link
            key={key}
            href={href({ range: key })}
            className={cn(
              "rounded-sm border px-2 py-1 text-xs",
              range === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary",
            )}
          >
            {RANGE_LABEL[key]}
          </Link>
        ))}
      </div>

      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {view === "mine"
              ? "No producer pay on your book in this filter."
              : "No commissions match this filter."}
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                {view === "agency" ? <th>Agent</th> : null}
                <th>Policy</th>
                <th>Carrier</th>
                <th>Line</th>
                <th>Premium</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due / paid</th>
                <th>Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ commission, agent, policy, contact, carrier }) => (
                <tr key={commission.id}>
                  {view === "agency" ? <td>{agent.name}</td> : null}
                  <td>
                    <div className="font-medium">{policy?.policyNumber ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {contact ? `${contact.lastName}, ${contact.firstName}` : "—"}
                    </div>
                    <div className="mt-1">
                      <AskThread
                        entityType="commission"
                        entityId={commission.id}
                        actor={actor}
                        asks={asksById.get(commission.id) ?? []}
                        compact
                      />
                    </div>
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{commission.lineOfBusiness}</td>
                  <td>{formatMoney(commission.premium)}</td>
                  <td>{formatRatePct(commission.ratePct)}</td>
                  <td className="font-medium">{formatMoney(commission.amount)}</td>
                  <td>
                    <CommissionStatusPill status={commission.status} />
                    {isAdmin(actor) ? (
                      <CommissionStatusForm
                        commissionId={commission.id}
                        status={commission.status}
                      />
                    ) : null}
                  </td>
                  <td className="text-xs">
                    {commission.dueDate ? (
                      <div>Due {commission.dueDate.toISOString().slice(0, 10)}</div>
                    ) : null}
                    {commission.paidDate ? (
                      <div>Paid {commission.paidDate.toISOString().slice(0, 10)}</div>
                    ) : (
                      <div className="text-muted-foreground">Unpaid</div>
                    )}
                  </td>
                  <td>{commission.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}

function RollupTable({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; premium: number; commission: number; count: number }>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <table className="ff-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Sales</th>
          <th>Commission</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>
              {row.label}
              <div className="text-[11px] text-muted-foreground">{row.count} policies</div>
            </td>
            <td>{formatMoney(row.premium)}</td>
            <td className="font-medium">{formatMoney(row.commission)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
