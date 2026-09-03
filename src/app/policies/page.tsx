import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AskThread } from "@/components/ask-thread";
import { OwnerSelect } from "@/components/owner-select";
import { canAssignOwner } from "@/lib/auth/rbac";
import { getActor } from "@/lib/auth/session";
import { formatMoney } from "@/lib/domain";
import { listAsksForEntities, listPolicies, listUsers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const [rows, users, actor] = await Promise.all([listPolicies(), listUsers(), getActor()]);
  const assign = canAssignOwner(actor);
  const asks = await listAsksForEntities(
    "policy",
    rows.map((row) => row.policy.id),
  );
  const asksById = new Map<string, typeof asks>();
  for (const row of asks) {
    const list = asksById.get(row.ask.entityId) ?? [];
    list.push(row);
    asksById.set(row.ask.entityId, list);
  }

  return (
    <AppShell title="Policies">
      <p className="mb-3 text-sm text-muted-foreground">
        Policies exist only after bind. Open a row for Zoho-style commission math
        (Life / Health / P&amp;C). Ana Dib has no policy. Quote floors are not
        commissions.
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
                <th>Client</th>
                <th>Type</th>
                <th>Carrier</th>
                <th>Premium</th>
                <th>Expires</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ policy, contact, carrier }) => (
                <tr key={policy.id}>
                  <td>
                    <Link
                      href={`/policies/${policy.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {policy.policyNumber}
                    </Link>
                    <div className="mt-1">
                      <AskThread
                        entityType="policy"
                        entityId={policy.id}
                        actor={actor}
                        asks={asksById.get(policy.id) ?? []}
                        compact
                      />
                    </div>
                  </td>
                  <td>
                    {contact ? `${contact.lastName}, ${contact.firstName}` : "—"}
                  </td>
                  <td>
                    <div>{policy.insuranceType ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {policy.policySubType ?? policy.policyType ?? policy.lineOfBusiness}
                    </div>
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td>{formatMoney(policy.premium)}</td>
                  <td>{policy.expirationDate.toISOString().slice(0, 10)}</td>
                  <td>
                    <OwnerSelect
                      entityType="policy"
                      entityId={policy.id}
                      ownerId={policy.ownerId}
                      users={users}
                      canAssign={assign}
                    />
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
