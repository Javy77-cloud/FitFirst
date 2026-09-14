import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listAccounts } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { accountsListColumnsFromLayout } from "@/lib/list-columns";
import { listFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { formatDay } from "@/lib/domain";
import { firstParam, pickFilterParams } from "@/lib/saved-filters";
import {
  enabledPageFilters,
  filterFieldsFromPageFilters,
  PAGE_FILTER_SEARCH_CLASS,
  PAGE_FILTER_SEARCH_INPUT_CLASS,
  mergeLiveOptions,
  matchesPageFilters,
  pageFilterParamKeys,
} from "@/lib/page-filters";
import { loadPageFilterPrefs } from "@/lib/page-filters/store";
import { currentDeskSession } from "@/lib/auth/session";
import { haystack } from "@/lib/search/live-query";
import { sourceLabel } from "@/lib/crm/sources";
import { AddBusinessDialog } from "@/components/businesses/add-business-dialog";
import { formatPhoneDisplay } from "@/lib/phone/format";

export const dynamic = "force-dynamic";

const SYSTEM_CELL_IDS = new Set([
  "pick",
  "business",
  "status",
  "industry",
  "source",
  "linkedContacts",
  "policies",
  "lastActivity",
]);

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  const openNew = firstParam(params.new) === "1";
  const [all, businessLayout, businessFields, pageFilters, session] = await Promise.all([
    listAccounts(),
    loadLayoutForModule("businesses").catch(() => null),
    listFieldDefs("businesses").catch(() => []),
    loadPageFilterPrefs("businesses"),
    currentDeskSession(),
  ]);
  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    industry: all.map((account) => account.industry),
    source: all.map((account) => account.source),
    status: all.map((account) => account.clientStatus),
  });
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const accountColumns = accountsListColumnsFromLayout(businessLayout, businessFields);
  const customById = await loadRecordValuesForIds(
    all.map((row) => row.id),
    "businesses",
  ).catch(() => new Map<string, Record<string, string>>());
  const rows = all.filter((account) => {
    const custom = customById.get(account.id) ?? {};
    const fieldValues = mergeRecordSystemValues(
      account as unknown as Record<string, unknown>,
      custom,
      businessFields,
    );
    return matchesPageFilters(
      {
        status: account.clientStatus,
        industry: account.industry ?? "",
        source: account.source ?? "",
        business: account.name,
        ...fieldValues,
      },
      filter,
    );
  });
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
      <PipelineFilterPopover
        moduleId="businesses"
        fields={filterFieldsFromPageFilters(visibleFilters)}
        searchPlaceholder="Contains Name, EIN, Or Phone…"
        preserveParams={[]}
        canConfigure={session.isAdmin}
        searchClassName={PAGE_FILTER_SEARCH_CLASS}
        searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
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
            columns={accountColumns}
            defaultSort={{ key: "lastActivity", dir: "desc" }}
            empty="No businesses yet. Bind a commercial deal as a Business, or open the Elena Ruiz personal path — she is linked to Ruiz Tile LLC with zero commercial policies."
            rows={rows.map((account) => {
              const fieldValues = mergeRecordSystemValues(
                account as unknown as Record<string, unknown>,
                customById.get(account.id) ?? {},
                businessFields,
              );
              const layoutCells: Record<string, ReactNode> = {};
              const layoutSort: Record<string, string | number> = {};
              for (const column of accountColumns) {
                if (SYSTEM_CELL_IDS.has(column.id)) continue;
                if (column.id === "phone") {
                  layoutCells.phone = formatPhoneDisplay(account.phone);
                  layoutSort.phone = account.phone ?? "";
                  continue;
                }
                if (column.id === "email") {
                  layoutCells.email = account.email ?? "—";
                  layoutSort.email = account.email ?? "";
                  continue;
                }
                const raw = fieldValues[column.id] ?? "";
                const display = String(raw).trim() || "—";
                layoutCells[column.id] = display;
                layoutSort[column.id] = display === "—" ? "" : display;
              }
              return {
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
                  ...Object.values(fieldValues),
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
                  ...layoutSort,
                },
                cells: {
                  pick: <SelectRowCheckbox id={account.id} />,
                  business: (
                    <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                  ),
                  status: <ClientStatusPill status={account.clientStatus} />,
                  industry: account.industry || "—",
                  source: account.source ? sourceLabel(account.source) : "—",
                  linkedContacts: account.linkedContactsCount,
                  policies: account.policyCount,
                  lastActivity: account.lastActivityAt
                    ? formatDay(account.lastActivityAt)
                    : "—",
                  ...layoutCells,
                },
              };
            })}
          />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
