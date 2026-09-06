import Link from "next/link";
import { createLead } from "@/app/actions/crm";
import { StartShopForm } from "@/components/leads/start-shop-form";
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
import { SourceSelect } from "@/components/crm/source-select";
import { sourceFilterOptions, sourceLabel } from "@/lib/crm/sources";
import { firstParam, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { listFollowUpTemplates, listLeadFollowUps } from "@/lib/db/lead-follow-up-queries";
import { releaseDueLeadFollowUps } from "@/lib/leads/apply-follow-up";
import { followUpTemplateChipName, pickTemplateForLead } from "@/lib/leads/follow-up-templates";
import { resetLeadsWithoutLoggedContact } from "@/lib/leads/reset-untouched";
import {
  isLeadOnQueue,
  isParkedFromDefaultLeadsView,
  matchesLeadQueueFilters,
  normalizeLeadStatus,
  sortLeadQueue,
  toIsoString,
} from "@/lib/leads/queue";
import { LeadsQueueToolbar } from "@/components/leads/leads-queue-toolbar";
import { ResponseTimer } from "@/components/leads/response-timer";
import {
  LeadHeatToggle,
  LeadLogContact,
  LeadStatusSelect,
  LeadTemplateOverride,
} from "@/components/leads/lead-queue-controls";
import { LeadSavedToast } from "@/components/leads/lead-saved-toast";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "source", "temperature"]);
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  await resetLeadsWithoutLoggedContact().catch(() => null);
  await releaseDueLeadFollowUps().catch(() => null);
  const [all, templates] = await Promise.all([listLeads(), listFollowUpTemplates()]);
  const queue = sortLeadQueue(all.filter((lead) => isLeadOnQueue(lead)));
  const rows = queue.filter((lead) =>
    matchesLeadQueueFilters(
      {
        status: normalizeLeadStatus(lead.status),
        source: lead.source,
        temperature: lead.temperature,
      },
      filter,
    ),
  );
  const followUps = await listLeadFollowUps(rows.map((lead) => lead.id));
  const dueCount = followUps.filter((row) => row.status === "queued" && row.dueAt.getTime() <= Date.now()).length;
  const nextByLead = new Map<string, Date>();
  for (const item of followUps) {
    if (item.status !== "queued") continue;
    const current = nextByLead.get(item.leadId);
    if (!current || item.dueAt < current) nextByLead.set(item.leadId, item.dueAt);
  }

  return (
    <AppShell title="Leads">
      <LeadSavedToast show={saved} />
      <p className="mb-3 text-base text-muted-foreground">
        Work queue only — converted leads live on Deals. Untouched first, newest arrival next.
        First contact starts the timer and the Default template (Aggressive steps). Override stays
        on the row. Status change swaps Steady or Drip. Temp badges stay Hot / Warm / Cold.
        Lost stays off this list until you search. Nurture parks until the contact-again date.
      </p>
      <LeadsQueueToolbar
        sources={uniqueOptions(
          queue.map((lead) => lead.source),
          sourceFilterOptions(),
        )}
        haystacks={queue
          .filter((lead) =>
            matchesLeadQueueFilters(
              {
                status: normalizeLeadStatus(lead.status),
                source: lead.source,
                temperature: lead.temperature,
              },
              filter,
            ),
          )
          .map((lead) => haystack([lead.firstName, lead.lastName]))}
        templates={templates}
        dueCount={dueCount}
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
        </div>

        <section className="ff-leads-queue ff-card overflow-hidden">
          <ModuleListActions
            module="leads"
            showMacrosLink={false}
            showFollowUp={false}
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
              moduleId="leads-queue"
              searchModuleId="leads"
              initialQuery={q}
              columns={LEADS_LIST_COLUMNS}
              empty={
                firstParam(params.status) || firstParam(params.source) || firstParam(params.temperature)
                  ? "No leads match this filter."
                  : "No open leads. Converted records are on Deals."
              }
              rows={rows.map((lead) => {
                const nextDue = nextByLead.get(lead.id);
                const picked = pickTemplateForLead(templates, {
                  followUpTemplateId: lead.followUpTemplateId,
                  status: normalizeLeadStatus(lead.status),
                });
                return {
                  key: lead.id,
                  parked: isParkedFromDefaultLeadsView(lead) && !filter.status,
                  hay: haystack([lead.firstName, lead.lastName, lead.email, lead.phone, lead.source, lead.status]),
                  sort: {
                    name: `${lead.lastName}, ${lead.firstName}`,
                    status: normalizeLeadStatus(lead.status),
                    source: sourceLabel(lead.source),
                    timer: lead.firstContactAt
                      ? String(new Date(lead.firstContactAt).getTime())
                      : "0",
                    heat: lead.temperature ?? "hot",
                    followUp: picked ? followUpTemplateChipName(picked) : "",
                    shop: lead.convertedDealId ? "open" : "convert",
                  },
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
                        <LeadLogContact leadId={lead.id} phone={lead.phone} email={lead.email} />
                      </div>
                    ),
                    status: (
                      <LeadStatusSelect leadId={lead.id} status={normalizeLeadStatus(lead.status)} />
                    ),
                    source: sourceLabel(lead.source),
                    timer: (
                      <ResponseTimer
                        createdAt={toIsoString(lead.createdAt) ?? new Date().toISOString()}
                        firstContactAt={toIsoString(lead.firstContactAt)}
                      />
                    ),
                    heat: <LeadHeatToggle leadId={lead.id} temperature={lead.temperature} />,
                    followUp: (
                      <div className="space-y-1">
                        <LeadTemplateOverride
                          leadId={lead.id}
                          templateId={lead.followUpTemplateId}
                          templates={templates}
                          resolvedName={picked ? followUpTemplateChipName(picked) : "—"}
                        />
                        {nextDue ? (
                          <div className="text-[11px] text-muted-foreground">
                            Next {nextDue.toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    ),
                    shop: lead.convertedDealId ? (
                      <Link href={`/deals/${lead.convertedDealId}`} className="text-xs text-primary">
                        Open deal
                      </Link>
                    ) : (
                      <StartShopForm leadId={lead.id} />
                    ),
                  },
                };
              })}
            />
          </ModuleListActions>
        </section>
      </div>
    </AppShell>
  );
}
