import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { ClientStatusPill, RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listContacts } from "@/lib/db/queries";
import { ColumnTable } from "@/components/lists/column-table";
import { CONTACTS_LIST_COLUMNS } from "@/lib/list-columns";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { SourceSelect } from "@/components/crm/source-select";
import { sourceFilterOptions, sourceLabel } from "@/lib/crm/sources";
import { CLIENT_STATUSES } from "@/lib/domain";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["status", "source"]);
  const all = await listContacts();
  const rows = all.filter(
    (contact) =>
      matchesField(contact.clientStatus, filter.status) && matchesField(contact.source, filter.source),
  );
  return (
    <AppShell title="Contacts">
      <p className="mb-3 text-base text-muted-foreground">
        Personal-lines bind creates a Contact and copies lead/risk fields. Client = any related
        policy is Active, Bound, or Pending.
      </p>
      <SavedFiltersBar
        moduleId="contacts"
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
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form action={createContact} className="ff-card space-y-3 p-4">
          <h2 className="text-base font-semibold text-navy">Add contact</h2>
          <div>
            <Label className="text-xs">First name</Label>
            <Input name="firstName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Last name</Label>
            <Input name="lastName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Life notes (CRM only)</Label>
            <Input name="lifeNotes" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Health notes (CRM only)</Label>
            <Input name="healthNotes" className="mt-1 h-8" />
          </div>
          <SourceSelect defaultValue="referral" />
          <Button type="submit" size="sm">
            Save contact
          </Button>
        </form>
        <section className="ff-card overflow-hidden">
          <ModuleListActions module="contacts" recordIds={rows.map((c) => c.id)}>
          <ColumnTable
            moduleId="contacts"
            columns={CONTACTS_LIST_COLUMNS}
            empty="Empty book. Bind a deal or add an existing client."
            rows={rows.map((c) => ({
              key: c.id,
              cells: {
                pick: <SelectRowCheckbox id={c.id} />,
                name: (
                  <span className="font-medium">
                    <RecordLink href={`/contacts/${c.id}`}>
                      {c.lastName}, {c.firstName}
                    </RecordLink>
                  </span>
                ),
                status: <ClientStatusPill status={c.clientStatus} />,
                source: sourceLabel(c.source),
                lifetime: c.policyCount,
                inForce: c.activePolicyCount,
              },
            }))}
          />
          </ModuleListActions>
        </section>
      </div>
    </AppShell>
  );
}
