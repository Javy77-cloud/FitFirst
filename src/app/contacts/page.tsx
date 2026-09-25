import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { listContacts } from "@/lib/db/queries";
import { listFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import {
  PipelineFilterControls,
  PipelineFilterPopover,
  PipelineFilterSearch,
} from "@/components/filters/pipeline-filter-popover";
import { currentDeskSession } from "@/lib/auth/session";
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
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";
import { PromiseChips } from "@/components/notifications/promise-chips";
import { loadOpenCommitments } from "@/lib/notifications/load-commitments";
import { serializeCommitments } from "@/lib/notifications/commitments";
import { BookCommandWorkspace } from "@/components/book-lists/book-workspace";
import { loadBookHealthMap, loadOpenDealSignals } from "@/lib/book-lists/load";
import { matchesBookLens, parseBookHeat, parseBookLens } from "@/lib/book-lists/lenses";
import { presentPartyCard } from "@/lib/book-lists/present";
import { partyBookKpis } from "@/lib/book-lists/kpi";
import { BookKpiStrip } from "@/components/book-lists/book-kpi-strip";
import { deskNow } from "@/lib/home/as-of";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await currentDeskSession();
  const q = firstParam(params.q) ?? "";
  const heat = parseBookHeat(firstParam(params.heat));
  const lens = parseBookLens(firstParam(params.lens));
  const saved = firstParam(params.saved) === "1";
  const [all, tagCatalog, contactFields, pageFilters, promiseRows, openDeals] =
    await Promise.all([
      listContacts(),
      listModuleTags("contacts").catch(() => []),
      listFieldDefs("contacts").catch(() => []),
      loadPageFilterPrefs("contacts"),
      loadOpenCommitments().catch(() => []),
      loadOpenDealSignals(),
    ]);
  await loadLayoutForModule("contacts").catch(() => null);
  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    source: all.map((contact) => contact.source),
    status: all.map((contact) => contact.clientStatus),
  });
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const customById = await loadRecordValuesForIds(
    all.map((row) => row.id),
    "contacts",
  ).catch(() => new Map<string, Record<string, string>>());
  const rows = all.filter((contact) => {
    const custom = customById.get(contact.id) ?? {};
    const fieldValues = mergeRecordSystemValues(
      contact as unknown as Record<string, unknown>,
      custom,
      contactFields,
    );
    return matchesPageFilters(
      {
        status: contact.clientStatus,
        source: contact.source ?? "",
        ...fieldValues,
      },
      filter,
    );
  });
  const healthMap = await loadBookHealthMap({
    contactIds: rows.map((row) => row.id),
    accountIds: [],
  });
  const asOf = deskNow();
  const inboxCues = await import("@/lib/notifications/load-inbox").then((mod) =>
    mod.loadInboxCues().catch(() => []),
  );
  const cards = rows
    .map((contact) => {
      const cue = inboxCues.find((row) => row.contactId === contact.id);
      const custom = customById.get(contact.id) ?? {};
      return presentPartyCard(
        {
          ...contact,
          preferredContactTime: custom.preferred_contact_time ?? null,
          preferredContactMethod: custom.preferred_contact_method ?? null,
        },
        "contact",
        {
          open: openDeals.byContact.get(contact.id),
          health: healthMap.get(`c:${contact.id}`) ?? null,
          asOf,
          inboxCue: cue?.why ?? null,
          inboxHref: cue?.href ?? null,
        },
      );
    })
    .filter((card) => matchesBookLens(card, { heat, lens, q }));
  const contactBook = all.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    mailingAddress: row.mailingAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
  }));

  const kpi = partyBookKpis("contact", cards);

  return (
    <AppShell title="Contacts">
      <SavedToast show={saved} message="Contact saved." listHref="/contacts" />
      <PipelineFilterPopover
        moduleId="contacts"
        fields={filterFieldsFromPageFilters(visibleFilters)}
        searchPlaceholder="Find a person, phone, or email…"
        preserveParams={["heat", "lens"]}
        canConfigure={session.isAdmin}
        searchClassName={PAGE_FILTER_SEARCH_CLASS}
        searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
      >
        <BookKpiStrip label={kpi.label} items={kpi.items} flat />
        <ModuleListActions
          module="contacts"
          recordIds={cards.map((card) => card.id)}
          records={rows.map((c) => ({
            id: c.id,
            label: `${c.lastName}, ${c.firstName}`,
            email: c.email,
            phone: c.phone,
            archivedAt: c.archivedAt,
            contactId: c.id,
          }))}
          hideSelectionCue
          afterCheck={<PipelineFilterSearch />}
          afterActions={<PipelineFilterControls />}
          end={
            <div data-ff-contacts-list-actions="">
              <AddContactDialog contacts={contactBook} />
            </div>
          }
        >
          <BookCommandWorkspace
            surface="contacts"
            path="/contacts"
            layout="stack"
            cards={cards}
            heat={heat}
            lens={lens}
            q={q}
            banner={null}
            empty="Nobody in this lens. Bind a deal or clear a chip."
            renderLeading={(card) => <SelectRowCheckbox id={card.id} />}
            renderExtra={(card) => (
              <>
                <PromiseChips
                  commitments={serializeCommitments(
                    promiseRows.filter((row) => row.contactId === card.id),
                  )}
                />
                <AssignRecordTags
                  module="contacts"
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
      </PipelineFilterPopover>
    </AppShell>
  );
}
