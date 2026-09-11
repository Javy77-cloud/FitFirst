import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listAccounts } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { ACCOUNTS_LIST_COLUMNS } from "@/lib/list-columns";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { CLIENT_STATUSES, formatDay } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { sourceLabel } from "@/lib/crm/sources";
import { BUSINESS_INDUSTRY_OPTIONS } from "@/lib/businesses/entity-industry";
import { AddBusinessDialog } from "@/components/businesses/add-business-dialog";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "industry"]);
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  const openNew = firstParam(params.new) === "1";
  const [all] = await Promise.all([listAccounts()]);
  const rows = all.filter(
    (account) =>
      matchesField(account.clientStatus, filter.status) &&
      matchesField(account.industry, filter.industry),
  );
  const businessBook = all.map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    dba: row.dba,
    einLast4: row.einLast4,
    einLookup: row.einLookup,
  }));
  return (
    <AppShell title="Businesses">
      <SavedToast show={saved} message="Business saved." listHref="/accounts" />
      <p className="mb-3 text-base text-muted-foreground">
        Commercial bind creates a Business (Account). Personal HO stays on a Contact. The same
        person can be linked here without moving their personal policies. New Business uses a popup.
      </p>
      <SavedFiltersBar
        moduleId="businesses"
        searchPlaceholder="Search by name, EIN, or phone…"
        fields={[
          {
            key: "status",
            label: "Status",
            options: CLIENT_STATUSES.map((value) => ({
              value,
              label: value === "client" ? "Client" : value === "not_a_client" ? "Not a client" : "Former Client",
            })),
          },
          {
            key: "industry",
            label: "Industry",
            options: uniqueOptions(
              all.map((account) => account.industry),
              BUSINESS_INDUSTRY_OPTIONS.map((value) => ({ value, label: value })),
            ),
          },
        ]}
      />
      <section className="ff-card overflow-hidden" data-ff-businesses-list="">
        <div
          className="flex items-center justify-end border-b border-border px-3 py-2"
          data-ff-businesses-list-actions=""
        >
          <AddBusinessDialog businesses={businessBook} defaultOpen={openNew} />
        </div>
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
            defaultSort={{ key: "lastActivity", dir: "desc" }}
            empty="No businesses yet. Bind a commercial deal as a Business, or open the Elena Ruiz personal path — she is linked to Ruiz Tile LLC with zero commercial policies."
            rows={rows.map((account) => ({
              key: account.id,
              hay: haystack([
                account.name,
                account.legalName,
                account.dba,
                account.phone,
                account.ein,
                account.einLast4,
                account.einLookup,
                account.industry,
                account.source,
                account.clientStatus,
              ]),
              sort: {
                pick: "",
                business: account.name,
                status: account.clientStatus,
                industry: account.industry ?? "",
                source: account.source ?? "",
                linkedContacts: account.linkedContactsCount,
                policies: account.policyCount,
                lastActivity: account.lastActivityAt
                  ? new Date(account.lastActivityAt).getTime()
                  : 0,
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
                industry: account.industry || "—",
                source: account.source ? sourceLabel(account.source) : "—",
                linkedContacts: account.linkedContactsCount,
                policies: account.policyCount,
                lastActivity: account.lastActivityAt ? formatDay(account.lastActivityAt) : "—",
              },
            }))}
          />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
