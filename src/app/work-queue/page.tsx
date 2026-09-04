import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col, ColumnPicker } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { AttentionFilters } from "@/components/home/attention-filters";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { defaultColumns } from "@/lib/desk/columns";
import { formatMoney } from "@/lib/domain";
import { listPolicies, ownerHomeDashboard } from "@/lib/db/queries";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { filterAttentionItems, parseAttentionWindow } from "@/lib/home/attention-window";
import {
  accountLabel,
  queueTotals,
  rankPriorityQueue,
  renewalAt,
} from "@/lib/priority-queue/rank";

export const dynamic = "force-dynamic";

function priorityClass(priority: string): string {
  if (priority === "Highest") return "font-semibold text-[var(--ff-red)]";
  if (priority === "High") return "font-semibold text-[var(--ff-terracotta)]";
  if (priority === "Low") return "text-muted-foreground";
  return "text-navy";
}

export default async function WorkQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>;
}) {
  const params = await searchParams;
  const window = parseAttentionWindow(params.attention);
  const [{ snapshot }, rows] = await Promise.all([ownerHomeDashboard(), listPolicies()]);
  const attention = filterAttentionItems(snapshot.attention, snapshot.asOf, window);
  const open = rows.filter(({ policy }) =>
    ["bound", "pending", "lapse", "lapsed"].includes(policy.status.toLowerCase()),
  );
  const ranked = rankPriorityQueue(
    rows.map(({ policy, contact, account }) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      renewalAt: renewalAt(policy),
      premium: policy.premium,
      accountName: accountLabel(contact, account),
      href: `/policies/${policy.id}`,
    })),
    snapshot.asOf ?? DESK_AS_OF,
  );
  const totals = queueTotals(ranked);

  return (
    <AppShell
      title="Work queue"
      columns={<ColumnPicker tableKey="queue-priority" initial={defaultColumns("queue-priority")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Priority queue sorted by renewal date, then revenue at risk. Due, priority, status, $,
        and account. Quotes are not written premium — Ana Dib stays unbound at Cov A $321,000.
        Nothing emails anyone.{" "}
        <Link href="/automations/sequences" className="text-primary hover:underline">
          Campaign sequences
        </Link>{" "}
        are Task + email stubs with On/Off.
      </p>

      <section className="ff-card mb-4 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-navy">Priority queue</div>
          <div className="text-xs text-muted-foreground">
            {totals.count} files · {formatMoney(totals.dollarsAtRisk)} at risk · {totals.highest}{" "}
            Highest · {totals.high} High
          </div>
        </div>
        {ranked.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Queue is clear. No in-force, bound, pending, or lapse files with renewal $ at risk.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="queue-priority" col="due" as="th">Due</Col>
                <Col table="queue-priority" col="priority" as="th">Priority</Col>
                <Col table="queue-priority" col="status" as="th">Status</Col>
                <Col table="queue-priority" col="dollars" as="th">$</Col>
                <Col table="queue-priority" col="account" as="th">Account</Col>
              </tr>
            </thead>
            <SheetTbody>
              {ranked.map((item) => (
                <tr key={item.id}>
                  <Col
                    table="queue-priority"
                    col="due"
                    sortValue={item.dueAt.toISOString()}
                  >
                    {item.dueAt.toISOString().slice(0, 10)}
                    <div className="text-[11px] text-muted-foreground">
                      {item.daysToRenewal < 0
                        ? `${Math.abs(item.daysToRenewal)}d overdue`
                        : item.daysToRenewal === 0
                          ? "due today"
                          : `${item.daysToRenewal}d`}
                    </div>
                  </Col>
                  <Col
                    table="queue-priority"
                    col="priority"
                    className={priorityClass(item.priority)}
                  >
                    {item.priority}
                  </Col>
                  <Col table="queue-priority" col="status">
                    <PolicyStatusBadge status={item.status} />
                  </Col>
                  <Col
                    table="queue-priority"
                    col="dollars"
                    sortValue={item.dollarsAtRisk}
                    className="tabular-nums"
                  >
                    {formatMoney(item.dollarsAtRisk)}
                  </Col>
                  <Col table="queue-priority" col="account">
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.accountName}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">{item.policyNumber}</div>
                  </Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>

      <section className="ff-card mb-4 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-navy">Needs attention</div>
          <AttentionFilters current={window} basePath="/work-queue" />
        </div>
        {attention.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {snapshot.attention.length === 0 ? "Queue is clear." : "Nothing in this window."}
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="queue-attention" col="kind" as="th">Kind</Col>
                <Col table="queue-attention" col="item" as="th">Item</Col>
                <Col table="queue-attention" col="due" as="th">Due date</Col>
                <Col table="queue-attention" col="priority" as="th">Priority</Col>
                <Col table="queue-attention" col="status" as="th">Status</Col>
                <Col table="queue-attention" col="detail" as="th">Detail</Col>
              </tr>
            </thead>
            <SheetTbody>
              {attention.map((item) => (
                <tr key={item.id}>
                  <Col table="queue-attention" col="kind" className="uppercase">
                    {item.kind.replaceAll("_", " ")}
                  </Col>
                  <Col table="queue-attention" col="item">
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.title}
                    </Link>
                  </Col>
                  <Col
                    table="queue-attention"
                    col="due"
                    sortValue={item.dueAt.toISOString()}
                  >
                    {item.dueAt.toISOString().slice(0, 10)}
                  </Col>
                  <Col table="queue-attention" col="priority">
                    {item.priority}
                  </Col>
                  <Col table="queue-attention" col="status">
                    {item.status}
                  </Col>
                  <Col table="queue-attention" col="detail" className="text-xs text-muted-foreground">
                    {item.detail}
                  </Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Bound / pending / lapse
        </div>
        {open.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nothing waiting on the book.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="queue-open" col="number" as="th">Policy</Col>
                <Col table="queue-open" col="status" as="th">Status</Col>
                <Col table="queue-open" col="party" as="th">Party</Col>
                <Col table="queue-open" col="expires" as="th">Expires</Col>
                <Col table="queue-open" col="due" as="th">Task due</Col>
                <Col table="queue-open" col="priority" as="th">Priority</Col>
              </tr>
            </thead>
            <SheetTbody>
              {open.map(({ policy, contact, account }) => {
                const status = policy.status.toLowerCase();
                const priority = status === "lapse" || status === "lapsed" ? "High" : "Normal";
                return (
                  <tr key={policy.id}>
                    <Col table="queue-open" col="number">
                      <Link
                        href={`/policies/${policy.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {policy.policyNumber}
                      </Link>
                    </Col>
                    <Col table="queue-open" col="status">
                      <PolicyStatusBadge status={policy.status} />
                    </Col>
                    <Col table="queue-open" col="party">
                      {contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}
                    </Col>
                    <Col table="queue-open" col="expires" sortValue={policy.expirationDate.toISOString()}>
                      {policy.expirationDate.toISOString().slice(0, 10)}
                    </Col>
                    <Col table="queue-open" col="due" sortValue={policy.expirationDate.toISOString()}>
                      {policy.expirationDate.toISOString().slice(0, 10)}
                    </Col>
                    <Col table="queue-open" col="priority">{priority}</Col>
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
