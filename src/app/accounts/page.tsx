import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listAccounts } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { ACCOUNTS_LIST_COLUMNS } from "@/lib/list-columns";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { CLIENT_STATUSES } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status"]);
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  const [all, tagCatalog] = await Promise.all([
    listAccounts(),
    listModuleTags("accounts").catch(() => []),
  ]);
  const rows = all.filter((account) => matchesField(account.clientStatus, filter.status));
  return (
    <AppShell title="Businesses">
      <SavedToast show={saved} message="Business saved." listHref="/accounts" />
      <p className="mb-3 text-base text-muted-foreground">
        Commercial bind creates a Business (Account). Personal HO stays on a Contact. The same
        person can be linked here without moving their personal policies.
      </p>
      <SavedFiltersBar
        moduleId="businesses"
        searchPlaceholder="Contains business, phone, city…"
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
        <ModuleListActions
          module="businesses"
          recordIds={rows.map((account) => account.id)}
          records={rows.map((account) => ({
            id: account.id,
            label: account.name,
            email: account.email,
            phone: account.phone,
            accountId: account.id,
          }))}
        >
        <DeskColumnTable
          moduleId="businesses"
          initialQuery={q}
          columns={ACCOUNTS_LIST_COLUMNS}
          empty="No businesses yet. Bind a commercial deal as a Business, or open the Elena Ruiz personal path — she is linked to Ruiz Tile LLC with zero commercial policies."
          rows={rows.map((account) => ({
            key: account.id,
            hay: haystack([
              account.name,
              account.legalName,
              account.dba,
              account.phone,
              account.email,
              account.city,
              account.einLast4,
              ...(account.tags ?? []),
            ]),
            sort: {
              pick: "",
              business: account.name,
              status: account.clientStatus,
              lifetime: account.policyCount,
              inForce: account.activePolicyCount,
              tags: tagSortText(account.tags),
            },
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
              tags: (
                <AssignRecordTags
                  module="accounts"
                  recordId={account.id}
                  tags={account.tags}
                  catalog={tagCatalog}
                />
              ),
            },
          }))}
        />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
