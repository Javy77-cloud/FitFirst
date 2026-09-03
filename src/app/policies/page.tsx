import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { visibleColumns } from "@/components/brand/column-layout-fields";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { formatDay, formatMoney } from "@/lib/domain";
import { listPolicies } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const [rows, desk] = await Promise.all([listPolicies(), getResolvedDesk()]);
  const cols = visibleColumns("policies", desk.columnLayout);
  return (
    <AppShell title="Policies">
      <p className="mb-3 text-sm text-muted-foreground">
        Policies exist only after bind. Expiration tracking and 30/60/90 tasks hang off these
        records.
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
                {cols.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ policy, contact, carrier }) => (
                <tr key={policy.id}>
                  {cols.map((col) => (
                    <td key={col.key} className={col.key === "policy" ? "font-medium" : undefined}>
                      {col.key === "policy" ? (
                        <Link href={`/policies/${policy.id}`} className="text-primary hover:underline">
                          {policy.policyNumber}
                        </Link>
                      ) : col.key === "client" ? (
                        contact ? (
                          <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                            {contact.lastName}, {contact.firstName}
                          </Link>
                        ) : (
                          "—"
                        )
                      ) : col.key === "carrier" ? (
                        carrier?.name ?? "—"
                      ) : col.key === "premium" ? (
                        formatMoney(policy.premium)
                      ) : (
                        formatDay(policy.expirationDate)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
