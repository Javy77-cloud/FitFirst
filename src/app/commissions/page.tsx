import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AskThread } from "@/components/ask-thread";
import { MixBars, ShareDonut } from "@/components/commissions/charts";
import { EarningsStrip } from "@/components/commissions/earnings-strip";
import { CommissionFilters } from "@/components/commissions/filters";
import { MarkPaidForm } from "@/components/commissions/mark-paid-form";
import { CommissionStatusForm } from "@/components/commissions/status-form";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { isAdmin } from "@/lib/auth/rbac";
import {
  earningsTotals,
  rollupByAgent,
  rollupByCarrier,
  rollupByLine,
  rollupPendingPaidBy,
  widgetTotals,
} from "@/lib/commissions/rollups";
import {
  COMMISSION_RANGES,
  formatMoney,
  formatRatePct,
  sellingAgencyLabel,
  type CommissionRange,
  type CommissionView,
} from "@/lib/domain";
import {
  listAsksForEntities,
  listCarriers,
  listCommissionEvents,
  listCommissionWidgets,
  listCommissions,
  listUsers,
} from "@/lib/db/queries";
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
  searchParams: Promise<{
    view?: string;
    range?: string;
    from?: string;
    to?: string;
    carrierId?: string;
    line?: string;
    agentId?: string;
    sellingAgency?: string;
  }>;
}) {
  const params = await searchParams;
  const requestedView = params.view === "mine" ? "mine" : "agency";
  const range = asRange(params.range);
  const [{ rows, actor, fiscalYearStartMonth }, carriers, agents] = await Promise.all([
    listCommissions({
      view: requestedView,
      range,
      from: params.from,
      to: params.to,
      carrierId: params.carrierId,
      line: params.line,
      agentId: params.agentId,
      sellingAgency: params.sellingAgency,
    }),
    listCarriers(),
    listUsers(),
  ]);
  const view: CommissionView = isAdmin(actor) && requestedView === "agency" ? "agency" : "mine";
  const widgetRows = await listCommissionWidgets(view);
  const widgets = widgetTotals(widgetRows);
  const earnings = earningsTotals(
    rows.map((row) => ({
      amount: row.commission.amount,
      agencyAmount: row.commission.agencyAmount,
      status: row.commission.status,
    })),
  );
  const asks = await listAsksForEntities(
    "commission",
    rows.map((row) => row.commission.id),
  );
  const events = await listCommissionEvents(rows.map((row) => row.commission.id));
  const asksById = new Map<string, typeof asks>();
  for (const row of asks) {
    const list = asksById.get(row.ask.entityId) ?? [];
    list.push(row);
    asksById.set(row.ask.entityId, list);
  }
  const latestEventById = new Map<string, (typeof events)[number]>();
  for (const row of events) {
    if (!latestEventById.has(row.event.commissionId)) {
      latestEventById.set(row.event.commissionId, row);
    }
  }

  const rollupSource = rows.map((row) => ({
    agentId: row.commission.agentId,
    agentName: row.agent.name,
    carrierId: row.commission.carrierId,
    carrierName: row.carrier?.name ?? "Unassigned",
    lineOfBusiness: row.commission.lineOfBusiness,
    premium: row.commission.premium,
    amount: row.commission.amount,
    agencyAmount: row.commission.agencyAmount,
    status: row.commission.status,
  }));
  const byAgent = rollupByAgent(rollupSource);
  const byCarrier = rollupByCarrier(rollupSource);
  const byLine = rollupByLine(rollupSource);
  const pendingPaidByCarrier = rollupPendingPaidBy(rollupSource, (row) => ({
    key: row.carrierId ?? "none",
    label: row.carrierName || "Unassigned",
  }));
  const pendingPaidByLine = rollupPendingPaidBy(rollupSource, (row) => ({
    key: row.lineOfBusiness,
    label: row.lineOfBusiness,
  }));

  const href = (next: { view?: CommissionView; range?: CommissionRange }) => {
    const q = new URLSearchParams();
    q.set("view", next.view ?? view);
    q.set("range", next.range ?? range);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.carrierId) q.set("carrierId", params.carrierId);
    if (params.line) q.set("line", params.line);
    if (params.agentId) q.set("agentId", params.agentId);
    if (params.sellingAgency) q.set("sellingAgency", params.sellingAgency);
    return `/commissions?${q.toString()}`;
  };

  return (
    <AppShell title={view === "agency" ? "Agency commissions" : "My commissions"}>
      <p className="mb-3 text-sm text-muted-foreground">
        Producer pay on bound policies — not FitFirst billing, not insured premium collection,
        and not quote floors from a shop. Fiscal year is January–December
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
          Agent view — only your paid and unpaid rows, and only your policies.{" "}
          <Link href={`/commissions/agents/${actor.id}`} className="text-primary hover:underline">
            Open your producer report
          </Link>
          . Switch to Admin in the rail to see the desk rollup.
        </p>
      )}

      <EarningsStrip totals={earnings} mode={view === "agency" ? "agency" : "producer"} />

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
            <RollupTable
              rows={byAgent}
              empty="No producer pay in this filter."
              hrefFor={(key) => `/commissions/agents/${key}`}
            />
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Per carrier
            </div>
            <PendingPaidTable rows={pendingPaidByCarrier} empty="No carrier share in this filter." />
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Per line
            </div>
            <PendingPaidTable rows={pendingPaidByLine} empty="No line mix in this filter." />
          </section>
        </div>
      ) : (
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Pending vs paid by carrier
            </div>
            <PendingPaidTable rows={pendingPaidByCarrier} empty="No carrier rows on your book." />
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Pending vs paid by policy type
            </div>
            <PendingPaidTable rows={pendingPaidByLine} empty="No line rows on your book." />
          </section>
        </div>
      )}

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

      <CommissionFilters
        view={view}
        range={range}
        from={params.from}
        to={params.to}
        carrierId={params.carrierId}
        line={params.line}
        agentId={params.agentId}
        sellingAgency={params.sellingAgency}
        carriers={carriers.map((row) => ({ id: row.carrier.id, name: row.carrier.name }))}
        agents={agents}
        showAgent={view === "agency"}
      />

      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {view === "mine"
              ? "No producer pay on your book in this filter."
              : "No commissions match this filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  {view === "agency" ? <th>Agent</th> : null}
                  <th>Policy</th>
                  <th>Carrier</th>
                  <th>Line</th>
                  <th>Selling agency</th>
                  <th>Premium</th>
                  <th>Rate</th>
                  <th>Agency $</th>
                  <th>Producer split</th>
                  <th>Status</th>
                  <th>Due / paid</th>
                  <th>Marked by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ commission, agent, policy, contact, carrier, paidBy }) => {
                  const event = latestEventById.get(commission.id);
                  return (
                    <tr key={commission.id}>
                      {view === "agency" ? (
                        <td>
                          <Link
                            href={`/commissions/agents/${agent.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {agent.name}
                          </Link>
                        </td>
                      ) : null}
                      <td>
                        <div className="font-medium">
                          {policy ? (
                            <Link
                              href={`/policies/${policy.id}`}
                              className="text-primary hover:underline"
                            >
                              {policy.policyNumber}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </div>
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
                      <td>{sellingAgencyLabel(commission.sellingAgency)}</td>
                      <td>{formatMoney(commission.premium)}</td>
                      <td>{formatRatePct(commission.ratePct)}</td>
                      <td>{formatMoney(commission.agencyAmount ?? commission.amount)}</td>
                      <td className="font-medium">{formatMoney(commission.amount)}</td>
                      <td>
                        <CommissionStatusPill status={commission.status} />
                        {isAdmin(actor) ? (
                          <>
                            <MarkPaidForm
                              commissionId={commission.id}
                              status={commission.status}
                            />
                            <CommissionStatusForm
                              commissionId={commission.id}
                              status={commission.status}
                            />
                          </>
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
                      <td className="text-xs">
                        {commission.status === "paid" ? (
                          <>
                            <div>{paidBy?.name ?? event?.actor.name ?? "—"}</div>
                            {event?.event.note ? (
                              <div className="text-muted-foreground">{event.event.note}</div>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function RollupTable({
  rows,
  empty,
  hrefFor,
}: {
  rows: Array<{ key: string; label: string; premium: number; commission: number; count: number }>;
  empty: string;
  hrefFor?: (key: string) => string;
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
              {hrefFor ? (
                <Link href={hrefFor(row.key)} className="font-medium text-primary hover:underline">
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
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

function PendingPaidTable({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; pending: number; paid: number; pendingCount: number; paidCount: number }>;
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
          <th>Pending</th>
          <th>Paid</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>
              {row.label}
              <div className="text-[11px] text-muted-foreground">
                {row.pendingCount} unpaid · {row.paidCount} paid
              </div>
            </td>
            <td>{formatMoney(row.pending)}</td>
            <td className="font-medium">{formatMoney(row.paid)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
