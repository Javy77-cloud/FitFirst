import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { CommissionFilters } from "@/components/commissions/filters";
import { ReconRowActions } from "@/components/commissions/recon-row-actions";
import { ReconStatusFilter } from "@/components/commissions/recon-status-filter";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { requireSignedIn } from "@/lib/auth/guards";
import { isCommissionPeriod } from "@/lib/commissions/filters";
import { loadReconWorkspace } from "@/lib/commissions/load-recon";
import {
  agentReconBucket,
  AGENT_BUCKET_LABEL,
  RECON_STATUS_LABEL,
  filterReconBookRows,
  producerTotals,
  reconBoardTotals,
} from "@/lib/commissions/reconcile";
import { defaultColumns } from "@/lib/desk/columns";
import { formatMoney } from "@/lib/domain";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const params = await searchParams;
  const family = first(params.family);
  const sub = first(params.sub);
  const rangeRaw = first(params.range);
  const range = isCommissionPeriod(rangeRaw) ? rangeRaw : "all";
  const reconStatus = first(params.recon);

  const loaded = await loadReconWorkspace({
    viewerId: session.userId,
    isAdmin: session.isAdmin,
    status: session.isAdmin ? reconStatus : undefined,
  });

  const rows = filterReconBookRows(loaded, { family, sub, range });

  const filtered = Boolean(family || (sub && sub !== "all") || (range && range !== "all") || reconStatus);
  const adminTotals = reconBoardTotals(rows);
  const agentTotals = producerTotals(rows);

  return (
    <AppShell
      title="Commissions"
      columns={<ColumnPicker tableKey="commissions" initial={defaultColumns("commissions")} />}
    >
      {session.isAdmin ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Reconciliation board — expected from the policy rule vs received that you type in. Mark
          short or disputed by hand. No carrier download. Ana Dib stays shopping — $0 here, no bind.
        </p>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">
          Your producer earnings only: earned, pending, and disputed. Other producers stay off this
          sheet. Ana Dib stays shopping — $0 / unbound.
        </p>
      )}

      <CommissionFilters family={family} sub={sub} range={range} />
      {session.isAdmin ? (
        <ReconStatusFilter status={reconStatus} family={family} sub={sub} range={range} />
      ) : null}

      {filtered ? (
        <p className="mb-3 text-[12px] text-muted-foreground">
          Showing {rows.length} row{rows.length === 1 ? "" : "s"} for this cut.
        </p>
      ) : null}

      {session.isAdmin ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Expected" value={formatMoney(adminTotals.expected)} hint="Rule / policy TAC" />
          <Kpi label="Received" value={formatMoney(adminTotals.received)} hint="Typed remittance" />
          <Kpi
            label="Shortfall"
            value={formatMoney(adminTotals.shortfall)}
            hint={`${adminTotals.shortCount} short row${adminTotals.shortCount === 1 ? "" : "s"}`}
            warn={adminTotals.shortfall > 0}
          />
          <Kpi
            label="Disputed"
            value={formatMoney(adminTotals.disputed)}
            hint={`${adminTotals.disputedCount} open`}
            warn={adminTotals.disputedCount > 0}
          />
        </div>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Kpi
            label="Earned"
            value={formatMoney(agentTotals.earned)}
            hint={`${agentTotals.earnedCount} paid / matched`}
          />
          <Kpi
            label="Pending"
            value={formatMoney(agentTotals.pending)}
            hint={`${agentTotals.pendingCount} still owed (includes short)`}
          />
          <Kpi
            label="Disputed"
            value={formatMoney(agentTotals.disputed)}
            hint={`${agentTotals.disputedCount} waiting on a statement`}
            warn={agentTotals.disputedCount > 0}
          />
        </div>
      )}

      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {filtered
              ? "No commission rows in this book or date window. Quotes are not earnings — Ana remains $0 / unbound."
              : session.isAdmin
                ? "No reconciliation rows yet. Seed the book, then catch shortfalls here. Ana stays $0."
                : "No earned, pending, or disputed rows on your book. Ana stays $0."}
          </p>
        ) : session.isAdmin ? (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <Col table="commissions" col="policy" as="th">
                    Policy
                  </Col>
                  <Col table="commissions" col="producer" as="th">
                    Producer
                  </Col>
                  <Col table="commissions" col="book" as="th">
                    Book
                  </Col>
                  <Col table="commissions" col="expected" as="th">
                    Expected
                  </Col>
                  <Col table="commissions" col="received" as="th">
                    Received
                  </Col>
                  <Col table="commissions" col="variance" as="th">
                    Variance
                  </Col>
                  <Col table="commissions" col="status" as="th">
                    Status
                  </Col>
                  <th className="text-left text-xs font-medium">Catch</th>
                </tr>
              </thead>
              <SheetTbody>
                {rows.map((row) => (
                  <tr key={row.reconId}>
                    <Col table="commissions" col="policy">
                      <div>{row.policyNumber ?? "—"}</div>
                      {row.note ? (
                        <div className="mt-0.5 max-w-xs text-[11px] text-muted-foreground">{row.note}</div>
                      ) : null}
                    </Col>
                    <Col table="commissions" col="producer">
                      {row.agentName}
                    </Col>
                    <Col table="commissions" col="book" className="uppercase text-xs">
                      {row.lineOfBusiness ?? "—"}
                    </Col>
                    <Col table="commissions" col="expected" sortValue={row.expected}>
                      {formatMoney(row.expected)}
                    </Col>
                    <Col table="commissions" col="received" sortValue={row.received}>
                      {formatMoney(row.received)}
                    </Col>
                    <Col table="commissions" col="variance" sortValue={row.variance}>
                      <span className={row.variance > 0 ? "font-medium text-fit-red" : undefined}>
                        {row.variance > 0 ? `−${formatMoney(row.variance)}` : formatMoney(0)}
                      </span>
                    </Col>
                    <Col table="commissions" col="status">
                      <CommissionStatusPill status={row.status} />
                      <span className="sr-only">{RECON_STATUS_LABEL[row.status]}</span>
                    </Col>
                    <td>
                      <ReconRowActions
                        reconId={row.reconId}
                        received={row.received}
                        status={row.status}
                      />
                    </td>
                  </tr>
                ))}
              </SheetTbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <Col table="commissions" col="policy" as="th">
                    Policy
                  </Col>
                  <Col table="commissions" col="book" as="th">
                    Book
                  </Col>
                  <Col table="commissions" col="status" as="th">
                    Status
                  </Col>
                  <Col table="commissions" col="amount" as="th">
                    Amount
                  </Col>
                </tr>
              </thead>
              <SheetTbody>
                {rows.map((row) => {
                  const bucket = agentReconBucket(row.status);
                  const amount =
                    bucket === "earned" ? row.received || row.expected : row.expected - row.received;
                  return (
                    <tr key={row.reconId}>
                      <Col table="commissions" col="policy">
                        <div>{row.policyNumber ?? "—"}</div>
                        {row.note ? (
                          <div className="mt-0.5 max-w-xs text-[11px] text-muted-foreground">
                            {row.note}
                          </div>
                        ) : null}
                      </Col>
                      <Col table="commissions" col="book" className="uppercase text-xs">
                        {row.lineOfBusiness ?? "—"}
                      </Col>
                      <Col table="commissions" col="status">
                        <CommissionStatusPill status={bucket} />
                        <span className="sr-only">{AGENT_BUCKET_LABEL[bucket]}</span>
                      </Col>
                      <Col table="commissions" col="amount" sortValue={amount}>
                        {formatMoney(amount)}
                      </Col>
                    </tr>
                  );
                })}
              </SheetTbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="ff-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${warn ? "text-fit-red" : "text-navy"}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
