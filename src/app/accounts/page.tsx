import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { listAccounts } from "@/lib/db/queries";
import { listFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
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
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { AddBusinessDialog } from "@/components/businesses/add-business-dialog";
import { BookCommandWorkspace } from "@/components/book-lists/book-workspace";
import { loadBookHealthMap, loadOpenDealSignals } from "@/lib/book-lists/load";
import { matchesBookLens, parseBookHeat, parseBookLens } from "@/lib/book-lists/lenses";
import { presentPartyCard } from "@/lib/book-lists/present";
import { deskNow } from "@/lib/home/as-of";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const heat = parseBookHeat(firstParam(params.heat));
  const lens = parseBookLens(firstParam(params.lens));
  const saved = firstParam(params.saved) === "1";
  const openNew = firstParam(params.new) === "1";
  const [all, businessFields, pageFilters, session, tagCatalog, openDeals] = await Promise.all([
    listAccounts(),
    listFieldDefs("businesses").catch(() => []),
    loadPageFilterPrefs("businesses"),
    currentDeskSession(),
    listModuleTags("accounts").catch(() => []),
    loadOpenDealSignals(),
  ]);
  await loadLayoutForModule("businesses").catch(() => null);
  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    industry: all.map((account) => account.industry),
    source: all.map((account) => account.source),
    status: all.map((account) => account.clientStatus),
  });
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
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
  const healthMap = await loadBookHealthMap({
    contactIds: [],
    accountIds: rows.map((row) => row.id),
  });
  const asOf = deskNow();
  const cards = rows
    .map((account) =>
      presentPartyCard(account, "account", {
        open: openDeals.byAccount.get(account.id),
        health: healthMap.get(`a:${account.id}`) ?? null,
        asOf,
      }),
    )
    .filter((card) => matchesBookLens(card, { heat, lens, q }));
  const businessBook = all.map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    dba: row.dba,
    einLast4: row.einLast4,
    einLookup: row.einLookup,
  }));
  return (
    <AppShell title="Accounts">
      <SavedToast show={saved} message="Account saved." listHref="/accounts" />

      <div
        className="mb-3 rounded-xl border border-border/80 bg-card/80 px-3 py-2 shadow-sm"
        data-ff-businesses-list=""
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PipelineFilterPopover
            moduleId="businesses"
            fields={filterFieldsFromPageFilters(visibleFilters)}
            searchPlaceholder="Find an account, EIN, or phone…"
            preserveParams={["heat", "lens"]}
            canConfigure={session.isAdmin}
            searchClassName={PAGE_FILTER_SEARCH_CLASS}
            searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
          />
          <div data-ff-businesses-list-actions="">
            <AddBusinessDialog businesses={businessBook} defaultOpen={openNew} />
          </div>
        </div>
      </div>
      <ModuleListActions
        module="businesses"
        recordIds={cards.map((card) => card.id)}
        records={rows.map((account) => ({
          id: account.id,
          label: account.name,
          email: account.email,
          phone: account.phone,
          accountId: account.id,
        }))}
      >
        <BookCommandWorkspace
          surface="accounts"
          path="/accounts"
          layout="stack"
          cards={cards}
          heat={heat}
          lens={lens}
          q={q}
          empty="No accounts in this lens. Bind a commercial deal or clear a chip."
          renderLeading={(card) => <SelectRowCheckbox id={card.id} />}
          renderExtra={(card) => (
            <>
              <AssignRecordTags
                module="accounts"
                recordId={card.id}
                tags={card.tags}
                catalog={tagCatalog}
                emptyPlaceholder="none"
              />
              <span className="sr-only">{tagSortText(card.tags)}</span>
            </>
          )}
        />
      </ModuleListActions>
    </AppShell>
  );
}
