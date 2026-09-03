import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { listPolicies } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const rows = await listPolicies();
  return (
    <AppShell title="Policies">
      <p className="mb-3 text-sm text-muted-foreground">
        Policies exist only after bind. Status is Bound, Pending, or Active — never quote-only.
        Issued files live on the policy record.
      </p>
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No policies yet. Bind a shopping deal when a market is actually written.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Status</th>
                <th>Party</th>
                <th>Carrier</th>
                <th>Premium</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ policy, contact, account, carrier }) => (
                <tr key={policy.id}>
                  <td className="font-medium">
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  </td>
                  <td className="uppercase">{policy.status}</td>
                  <td>
                    {contact ? (
                      <RecordLink href={`/contacts/${contact.id}`}>
                        {contact.lastName}, {contact.firstName}
                      </RecordLink>
                    ) : account ? (
                      <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{formatMoney(policy.premium)}</td>
                  <td>{formatDay(policy.expirationDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
