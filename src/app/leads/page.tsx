import Link from "next/link";
import { createLead } from "@/app/actions/crm";
import { ChooseFiles } from "@/components/choose-files";
import { StartShopForm } from "@/components/leads/start-shop-form";
import { dropLeadPacket, dropSampleDecPacket, stubEmailLead, stubSocialLead } from "@/app/actions/lifecycle";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listLeads } from "@/lib/db/queries";
import { listEnabledMacrosFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import { ColumnTable } from "@/components/lists/column-table";
import { ListMassBar, ListSelectionProvider, SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LEAD_STATUSES } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "source"]);
  const [all, macros, buttons] = await Promise.all([
    listLeads(),
    listEnabledMacrosFor("leads"),
    listVisibleButtons({ module: "leads", placement: ["list", "mass_action"] }),
  ]);
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
            options: uniqueOptions(all.map((lead) => lead.source)),
          },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <form action={dropSampleDecPacket}>
          <Button type="submit" size="sm" variant="outline">
            Drop Melbourne dec (matches Elena)
          </Button>
        </form>
        <form action={stubEmailLead}>
          <Button type="submit" size="sm" variant="outline">
            Stub email lead
          </Button>
        </form>
        <form action={stubSocialLead}>
          <Button type="submit" size="sm" variant="outline">
            Stub social lead
          </Button>
        </form>
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
            <Button type="submit" size="sm">
              Save lead
            </Button>
          </form>
          <form action={dropLeadPacket} className="ff-card space-y-3 p-4">
            <h2 className="text-base font-semibold text-navy">Drop a dec packet</h2>
            <p className="text-base text-muted-foreground">
              PDF or text. Named insured + phone or email matches an existing lead. Empty file
              uses the Melbourne sample.
            </p>
            <ChooseFiles name="file" />
            <Button type="submit" size="sm">
              Import packet
            </Button>
          </form>
        </div>

        <section className="ff-card overflow-hidden">
          <ListSelectionProvider>
            <div className="px-3 pt-3">
              <ListMassBar
                module="leads"
                macros={macros.map((macro) => ({ id: macro.id, name: macro.name }))}
                buttons={buttons.map((button) => ({
                  id: button.id,
                  label: button.label,
                  actionKind: button.actionKind,
                  functionApiName: button.functionApiName,
                }))}
              />
            </div>
            <ColumnTable
              moduleId="leads"
              columns={[
                { id: "pick", label: "", locked: true },
                { id: "name", label: "Name", locked: true },
                { id: "status", label: "Status" },
                { id: "source", label: "Source" },
                { id: "shop", label: "Shop" },
              ]}
              empty={
                firstParam(params.status) || firstParam(params.source)
                  ? "No leads match this filter."
                  : "No leads yet."
              }
              rows={rows.map((lead) => ({
                key: lead.id,
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
                  source: lead.source,
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
          </ListSelectionProvider>
        </section>
      </div>
    </AppShell>
  );
}
