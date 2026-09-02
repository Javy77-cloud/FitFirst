import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ExpirationBadge } from "@/components/crm/expiration-badge";
import { formatMoney } from "@/lib/domain";
import { listPolicies } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const rows = await listPolicies();
  return (
    <AppShell title="Policies">
      <p className="mb-3 text-sm text-muted-foreground">
        Policies exist only after bind. Expiration tracking and 30/60/90 tasks hang off these
        records. Quotes never write a row here.
      </p>
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No policies yet. Bind a shopping deal when a market is actually written.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Client</th>
                <th>Line</th>
                <th>Carrier</th>
                <th>Premium</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ policy, contact, carrier }) => (
                <tr key={policy.id}>
                  <td className="font-medium">
                    <Link href={`/policies/${policy.id}`} className="text-primary hover:underline">
                      {policy.policyNumber}
                    </Link>
                  </td>
                  <td>
                    {contact ? (
                      <Link href={`/contacts/${contact.id}`} className="hover:underline">
                        {contact.lastName}, {contact.firstName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{policy.lineOfBusiness}</td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{formatMoney(policy.premium)}</td>
                  <td>
                    <ExpirationBadge date={policy.expirationDate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
