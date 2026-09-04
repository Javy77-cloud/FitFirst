import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { listPolicies, ownerHomeDashboard } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function WorkQueuePage() {
  const [{ snapshot }, rows] = await Promise.all([ownerHomeDashboard(), listPolicies()]);
  const open = rows.filter(({ policy }) =>
    ["bound", "pending", "lapse", "lapsed"].includes(policy.status.toLowerCase()),
  );

  return (
    <AppShell title="Work queue">
      <p className="mb-3 text-sm text-muted-foreground">
        One queue: owner attention (review tasks, lapses, bound waiting on issue) plus policies
        still in Bound / Pending / Lapse. Nothing emails anyone.
      </p>

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Needs attention
        </div>
        {snapshot.attention.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Queue is clear.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="queue-attention" col="kind" as="th">Kind</Col>
                <Col table="queue-attention" col="item" as="th">Item</Col>
                <Col table="queue-attention" col="detail" as="th">Detail</Col>
              </tr>
            </thead>
            <SheetTbody>
              {snapshot.attention.map((item) => (
                <tr key={item.id}>
                  <Col table="queue-attention" col="kind" className="uppercase">
                    {item.kind.replaceAll("_", " ")}
                  </Col>
                  <Col table="queue-attention" col="item">
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.title}
                    </Link>
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
              </tr>
            </thead>
            <SheetTbody>
              {open.map(({ policy, contact, account }) => (
                <tr key={policy.id}>
                  <Col table="queue-open" col="number">
                    <Link
                      href={`/policies/${policy.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {policy.policyNumber}
                    </Link>
                  </Col>
                  <Col table="queue-open" col="status" className="uppercase">
                    {policy.status}
                  </Col>
                  <Col table="queue-open" col="party">
                    {contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}
                  </Col>
                  <Col table="queue-open" col="expires" sortValue={policy.expirationDate.toISOString()}>
                    {policy.expirationDate.toISOString().slice(0, 10)}
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
