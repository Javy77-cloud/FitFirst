import Link from "next/link";
import { AppShell } from "@/components/app-shell";
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
                <th>Kind</th>
                <th>Item</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.attention.map((item) => (
                <tr key={item.id}>
                  <td className="uppercase">{item.kind.replaceAll("_", " ")}</td>
                  <td>
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground">{item.detail}</td>
                </tr>
              ))}
            </tbody>
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
                <th>Policy</th>
                <th>Status</th>
                <th>Party</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {open.map(({ policy, contact, account }) => (
                <tr key={policy.id}>
                  <td>
                    <Link
                      href={`/policies/${policy.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {policy.policyNumber}
                    </Link>
                  </td>
                  <td className="uppercase">{policy.status}</td>
                  <td>{contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—"}</td>
                  <td>{policy.expirationDate.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
