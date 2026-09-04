import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { AttentionFilters } from "@/components/home/attention-filters";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { listPolicies, ownerHomeDashboard } from "@/lib/db/queries";
import { filterAttentionItems, parseAttentionWindow } from "@/lib/home/attention-window";
import { listOpenPortalRequests } from "@/lib/portal/requests";

export const dynamic = "force-dynamic";

export default async function WorkQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>;
}) {
  const params = await searchParams;
  const window = parseAttentionWindow(params.attention);
  const [{ snapshot }, rows, portalRows] = await Promise.all([
    ownerHomeDashboard(),
    listPolicies(),
    listOpenPortalRequests(),
  ]);
  const attention = filterAttentionItems(snapshot.attention, snapshot.asOf, window);
  const open = rows.filter(({ policy }) =>
    ["bound", "pending", "lapse", "lapsed"].includes(policy.status.toLowerCase()),
  );

  return (
    <AppShell title="Work queue">
      <p className="mb-3 text-sm text-muted-foreground">
        Owner attention plus Bound / Pending / Lapse. Client portal COI and policy-change
        requests land here with the holder or change fields already filled — do not rekey.
        Nothing emails anyone.
      </p>

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

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Client portal requests
        </div>
        {portalRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No self-serve COI or policy-change requests yet. Stub links live on Elena and
            Harbor Key.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="queue-portal" col="kind" as="th">Kind</Col>
                <Col table="queue-portal" col="item" as="th">Request</Col>
                <Col table="queue-portal" col="policy" as="th">Policy</Col>
                <Col table="queue-portal" col="status" as="th">Status</Col>
                <Col table="queue-portal" col="submitted" as="th">Submitted</Col>
                <Col table="queue-portal" col="detail" as="th">Payload</Col>
              </tr>
            </thead>
            <SheetTbody>
              {portalRows.map(({ request, policy, certificate }) => {
                const href = policy
                  ? `/policies/${policy.id}`
                  : request.accountId
                    ? `/accounts/${request.accountId}`
                    : request.contactId
                      ? `/contacts/${request.contactId}`
                      : "/work-queue";
                return (
                  <tr key={request.id}>
                    <Col table="queue-portal" col="kind" className="uppercase">
                      {request.kind === "coi" ? "COI" : "Policy change"}
                    </Col>
                    <Col table="queue-portal" col="item">
                      <Link href={href} className="font-medium text-primary hover:underline">
                        {request.summary}
                      </Link>
                    </Col>
                    <Col table="queue-portal" col="policy">
                      {policy?.policyNumber ?? certificate?.certificateNumber ?? "—"}
                    </Col>
                    <Col table="queue-portal" col="status">{request.status}</Col>
                    <Col
                      table="queue-portal"
                      col="submitted"
                      sortValue={request.createdAt.toISOString()}
                    >
                      {request.createdAt.toISOString().slice(0, 10)}
                    </Col>
                    <Col table="queue-portal" col="detail" className="text-xs text-muted-foreground">
                      {request.kind === "coi"
                        ? `${String((request.payload as { holderName?: string }).holderName ?? "")} · do not rekey`
                        : `${String((request.payload as { reasonLabel?: string }).reasonLabel ?? "")} · ${String((request.payload as { effectiveDate?: string }).effectiveDate ?? "")} · do not rekey`}
                    </Col>
                  </tr>
                );
              })}
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
