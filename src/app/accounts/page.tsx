import { AppShell } from "@/components/app-shell";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listAccounts } from "@/lib/db/queries";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { CLIENT_STATUSES } from "@/lib/domain";
import { matchesField, pickFilterParams } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["status"]);
  const all = await listAccounts();
  const rows = all.filter((account) => matchesField(account.clientStatus, filter.status));
  return (
    <AppShell title="Businesses">
      <p className="mb-3 text-base text-muted-foreground">
        Commercial bind creates a Business (Account). Personal HO stays on a Contact. The same
        person can be linked here without moving their personal policies.
      </p>
      <SavedFiltersBar
        moduleId="businesses"
        fields={[
          {
            key: "status",
            label: "Status",
            options: CLIENT_STATUSES.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            })),
          },
        ]}
      />
      <section className="ff-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No businesses yet. Bind a commercial deal as a Business, or open the Elena Ruiz
            personal path — she is linked to Ruiz Tile LLC with zero commercial policies.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Status</th>
                <th>Lifetime</th>
                <th>In-force</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <td>
                    <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                    <div className="text-base text-muted-foreground">
                      {account.phone ?? account.email}
                    </div>
                  </td>
                  <td>
                    <ClientStatusPill status={account.clientStatus} />
                  </td>
                  <td>{account.policyCount}</td>
                  <td>{account.activePolicyCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
