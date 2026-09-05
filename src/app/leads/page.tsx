import Link from "next/link";
import { createLead } from "@/app/actions/crm";
import { ChooseFiles } from "@/components/choose-files";
import { StartShopForm } from "@/components/leads/start-shop-form";
import { dropLeadPacket } from "@/app/actions/lifecycle";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listLeads } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { LEADS_LIST_COLUMNS } from "@/lib/list-columns";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LEAD_STATUSES } from "@/lib/domain";
import { SourceSelect } from "@/components/crm/source-select";
import { sourceFilterOptions, sourceLabel } from "@/lib/crm/sources";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "source"]);
  const q = firstParam(params.q) ?? "";
  const all = await listLeads();
  const rows = all.filter(
    (lead) => matchesField(lead.status, filter.status) && matchesField(lead.source, filter.source),
  );
  return (
    <AppShell title="Leads">
      <p className="mb-3 text-base text-muted-foreground">
        Create or match by name + phone or email. Never duplicate. A dropped dec becomes a lead
        first; the deal is the shop. Quotes still do not create a policy.
      </p>
      <SavedFiltersBar
        moduleId="leads"
        searchPlaceholder="Contains name, phone, email…"
        fields={[
          {
            key: "status",
            label: "Status",
            options: uniqueOptions(
              all.map((lead) => lead.status),
              LEAD_STATUSES.map((value) => ({ value, label: value })),
            ),
          },
          {
            key: "source",
            label: "Source",
            options: uniqueOptions(
              all.map((lead) => lead.source),
              sourceFilterOptions(),
            ),
          },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/leads/new">
          <Button type="button" size="sm" variant="outline">
            New lead
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form action={createLead} className="ff-card space-y-3 p-4">
            <h2 className="text-base font-semibold text-navy">New lead</h2>
            <div>
              <Label htmlFor="firstName" className="text-xs">
                First name
              </Label>
              <Input id="firstName" name="firstName" required className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs">
                Last name
              </Label>
              <Input id="lastName" name="lastName" required className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">
                Phone
              </Label>
              <Input id="phone" name="phone" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <Input id="email" name="email" type="email" className="mt-1 h-8" />
            </div>
            <SourceSelect defaultValue="referral" />
            <Button type="submit" size="sm">
              Save lead
            </Button>
          </form>
          <form action={dropLeadPacket} className="ff-card space-y-3 p-4">
            <h2 className="text-base font-semibold text-navy">Drop a dec packet</h2>
            <p className="text-base text-muted-foreground">
              PDF or text. Named insured + phone or email matches an existing lead.
            </p>
            <ChooseFiles name="file" />
            <Button type="submit" size="sm">
              Import packet
            </Button>
          </form>
        </div>

        <section className="ff-card overflow-hidden">
          <ModuleListActions
            module="leads"
            recordIds={rows.map((lead) => lead.id)}
            records={rows.map((lead) => ({
              id: lead.id,
              label: `${lead.lastName}, ${lead.firstName}`,
              email: lead.email,
              phone: lead.phone,
              convertedDealId: lead.convertedDealId,
              archivedAt: lead.archivedAt,
              leadId: lead.id,
            }))}
          >
            <DeskColumnTable
              moduleId="leads"
              initialQuery={q}
              columns={LEADS_LIST_COLUMNS}
              empty={
                firstParam(params.status) || firstParam(params.source)
                  ? "No leads match this filter."
                  : "No leads yet."
              }
              rows={rows.map((lead) => ({
                key: lead.id,
                hay: haystack([lead.firstName, lead.lastName, lead.email, lead.phone, lead.source, lead.status]),
                cells: {
                  pick: <SelectRowCheckbox id={lead.id} />,
                  name: (
                    <div className="font-medium">
                      <RecordLink href={`/leads/${lead.id}`}>
                        {lead.lastName}, {lead.firstName}
                      </RecordLink>
                      <div className="text-base text-muted-foreground">
                        {lead.phone ?? lead.email}
                      </div>
                    </div>
                  ),
                  status: <span className="uppercase">{lead.status}</span>,
                  source: sourceLabel(lead.source),
                  shop: lead.convertedDealId ? (
                    <Link href={`/deals/${lead.convertedDealId}`} className="text-xs text-primary">
                      Open deal
                    </Link>
                  ) : (
                    <StartShopForm leadId={lead.id} />
                  ),
                },
              }))}
            />
          </ModuleListActions>
        </section>
      </div>
    </AppShell>
  );
}
