import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listAccounts } from "@/lib/db/queries";
import { ColumnTable } from "@/components/lists/column-table";
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
        <ModuleListActions module="businesses" recordIds={rows.map((account) => account.id)}>
        <ColumnTable
          moduleId="businesses"
          columns={[
            { id: "pick", label: "", locked: true },
            { id: "business", label: "Business", locked: true },
            { id: "status", label: "Status" },
            { id: "lifetime", label: "Lifetime" },
            { id: "inForce", label: "In-force" },
          ]}
          empty="No businesses yet. Bind a commercial deal as a Business, or open the Elena Ruiz personal path — she is linked to Ruiz Tile LLC with zero commercial policies."
          rows={rows.map((account) => ({
            key: account.id,
            cells: {
              pick: <SelectRowCheckbox id={account.id} />,
              business: (
                <>
                  <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                  <div className="text-base text-muted-foreground">
                    {account.phone ?? account.email}
                  </div>
                </>
              ),
              status: <ClientStatusPill status={account.clientStatus} />,
              lifetime: account.policyCount,
              inForce: account.activePolicyCount,
            },
          }))}
        />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
