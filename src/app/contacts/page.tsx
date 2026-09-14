import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listContacts } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { contactsListColumnsFromLayout } from "@/lib/list-columns";
import { listFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { sourceLabel } from "@/lib/crm/sources";
import { formatDay } from "@/lib/domain";
import { formatDisplayDate, normalizeDateDisplayFormat } from "@/lib/dates/display-format";
import { formatPhoneDisplay } from "@/lib/phone/format";
import { getStoredNavLayout } from "@/lib/db/nav-prefs";
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
import { haystack } from "@/lib/search/live-query";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await currentDeskSession();
  const personalLayout = session.userId
    ? await getStoredNavLayout(session.userId).catch(() => null)
    : null;
  const dateFormat = normalizeDateDisplayFormat(personalLayout?.personal?.dateFormat);
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  const [all, tagCatalog, contactLayout, contactFields, pageFilters] = await Promise.all([
    listContacts(),
    listModuleTags("contacts").catch(() => []),
    loadLayoutForModule("contacts").catch(() => null),
    listFieldDefs("contacts").catch(() => []),
    loadPageFilterPrefs("contacts"),
  ]);
  const visibleFilters = mergeLiveOptions(enabledPageFilters(pageFilters), {
    source: all.map((contact) => contact.source),
    status: all.map((contact) => contact.clientStatus),
  });
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const contactColumns = contactsListColumnsFromLayout(contactLayout, contactFields);
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

  return (
    <AppShell title="Contacts">
      <SavedToast show={saved} message="Contact saved." listHref="/contacts" />
      <p className="mb-3 text-base text-muted-foreground">
        Clients on the book. Bind / Closed Won creates or links a Contact (empty-only field copy).
        New Contact uses a popup — full layout is one click away.
      </p>
      <PipelineFilterPopover
        moduleId="contacts"
        fields={filterFieldsFromPageFilters(visibleFilters)}
        searchPlaceholder="Contains Name, Phone, Email…"
        preserveParams={[]}
        canConfigure={session.isAdmin}
        searchClassName={PAGE_FILTER_SEARCH_CLASS}
        searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
      />
      <section className="ff-card overflow-hidden" data-ff-contacts-list="">
        <div
          className="flex items-center justify-end border-b border-border px-3 py-2"
          data-ff-contacts-list-actions=""
        >
          <AddContactDialog contacts={contactBook} />
        </div>
        <ModuleListActions
          module="contacts"
          recordIds={rows.map((c) => c.id)}
          records={rows.map((c) => ({
            id: c.id,
            label: `${c.lastName}, ${c.firstName}`,
            email: c.email,
            phone: c.phone,
            archivedAt: c.archivedAt,
            contactId: c.id,
            
          }))}
        >
          <DeskColumnTable
            moduleId="contacts"
            initialQuery={q}
            columns={contactColumns}
            defaultSort={{ key: "lastActivity", dir: "desc" }}
            empty="Empty book. Bind a deal or add an existing client."
            rows={rows.map((c) => {
              const fieldValues = mergeRecordSystemValues(
                c as unknown as Record<string, unknown>,
                customById.get(c.id) ?? {},
                contactFields,
              );
              const layoutCells: Record<string, ReactNode> = {};
              const layoutSort: Record<string, string | number> = {};
              for (const column of contactColumns) {
                if (
                  column.id === "pick" ||
                  column.id === "name" ||
                  column.id === "status" ||
                  column.id === "lifetime" ||
                  column.id === "inForce" ||
                  column.id === "tags" ||
                  column.id === "lastActivity"
                ) {
                  continue;
                }
                if (column.id === "phone") {
                  layoutCells.phone = formatPhoneDisplay(c.phone);
                  layoutSort.phone = c.phone ?? "";
                  continue;
                }
                if (column.id === "email") {
                  layoutCells.email = c.email ?? "—";
                  layoutSort.email = c.email ?? "";
                  continue;
                }
                if (column.id === "source") {
                  const raw = fieldValues.source ?? c.source ?? "";
                  layoutCells.source = raw ? sourceLabel(raw) : "—";
                  layoutSort.source = layoutCells.source === "—" ? "" : String(layoutCells.source);
                  continue;
                }
                const raw = fieldValues[column.id] ?? "";
                const fieldDef = contactFields.find((field) => field.key === column.id);
                const isDateField =
                  column.id === "date_of_birth" ||
                  fieldDef?.type === "dob" ||
                  fieldDef?.type === "date";
                const isPhoneField = fieldDef?.type === "phone";
                const display = isDateField
                  ? formatDisplayDate(String(raw).trim() || null, dateFormat)
                  : isPhoneField
                    ? formatPhoneDisplay(String(raw).trim() || null)
                    : String(raw).trim() || "—";
                layoutCells[column.id] = display;
                layoutSort[column.id] = isDateField
                  ? String(raw).trim()
                  : display === "—"
                    ? ""
                    : display;
              }
              return {
              key: c.id,
              hay: haystack([
                c.firstName,
                c.lastName,
                c.email,
                c.phone,
                c.city,
                c.source,
                c.clientStatus,
                ...Object.values(fieldValues),
                ...(c.tags ?? []),
              ]),
              sort: {
                pick: "",
                name: `${c.lastName}, ${c.firstName}`,
                phone: c.phone ?? "",
                email: c.email ?? "",
                status: c.clientStatus,
                lifetime: c.lifetimeDealCount ?? c.policyCount,
                inForce: c.activePolicyCount,
                tags: tagSortText(c.tags),
                lastActivity: c.lastActivityAt
                  ? new Date(c.lastActivityAt).getTime()
                  : 0,
                ...layoutSort,
              },
              cells: {
                pick: <SelectRowCheckbox id={c.id} />,
                name: (
                  <span className="font-medium">
                    <RecordLink href={`/contacts/${c.id}`}>
                      {c.lastName}, {c.firstName}
                    </RecordLink>
                  </span>
                ),
                phone: formatPhoneDisplay(c.phone),
                email: c.email ?? "—",
                status: <ClientStatusPill status={c.clientStatus} />,
                lifetime: c.lifetimeDealCount ?? 0,
                inForce: c.activePolicyCount,
                tags: (
                  <AssignRecordTags
                    module="contacts"
                    recordId={c.id}
                    tags={c.tags}
                    catalog={tagCatalog}
                  />
                ),
                lastActivity: c.lastActivityAt ? formatDay(c.lastActivityAt) : "—",
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
