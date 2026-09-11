import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { listContacts } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { CONTACTS_LIST_COLUMNS } from "@/lib/list-columns";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { sourceFilterOptions, sourceLabel } from "@/lib/crm/sources";
import { CLIENT_STATUSES, formatDay } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
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
  const filter = pickFilterParams(params, ["status", "source"]);
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  const [all, tagCatalog] = await Promise.all([
    listContacts(),
    listModuleTags("contacts").catch(() => []),
  ]);
  const rows = all.filter(
    (contact) =>
      matchesField(contact.clientStatus, filter.status) && matchesField(contact.source, filter.source),
  );
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
      <SavedFiltersBar
        moduleId="contacts"
        searchPlaceholder="Contains name, phone, email…"
        fields={[
          {
            key: "status",
            label: "Status",
            options: CLIENT_STATUSES.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            })),
          },
          {
            key: "source",
            label: "Source",
            options: uniqueOptions(
              all.map((contact) => contact.source),
              sourceFilterOptions(),
            ),
          },
        ]}
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
            columns={CONTACTS_LIST_COLUMNS}
            defaultSort={{ key: "lastActivity", dir: "desc" }}
            empty="Empty book. Bind a deal or add an existing client."
            rows={rows.map((c) => ({
              key: c.id,
              hay: haystack([
                c.firstName,
                c.lastName,
                c.email,
                c.phone,
                c.city,
                c.source,
                c.clientStatus,
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
                phone: c.phone ?? "—",
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
              },
            }))}
          />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
