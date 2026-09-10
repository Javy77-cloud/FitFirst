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
import { leadsListColumnsFromLayout } from "@/lib/list-columns";
import { listFieldDefs, loadLayoutForModule } from "@/lib/custom-fields/store";
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
  dueAtMs,
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
import { FormPrimaryActions } from "@/components/desk/form-actions";
import { LeadSavedToast } from "@/components/leads/lead-saved-toast";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";

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
  const [all, loadedTemplates, tagCatalog, leadLayout, leadFields] = await Promise.all([
    listLeads(),
    listFollowUpTemplates().catch(() => []),
    listModuleTags("leads").catch(() => []),
    loadLayoutForModule("leads").catch(() => null),
    listFieldDefs("leads").catch(() => []),
  ]);
  const leadColumns = leadsListColumnsFromLayout(leadLayout, leadFields);
  const templates = Array.isArray(loadedTemplates) ? loadedTemplates : [];
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
  const followUps = await listLeadFollowUps(rows.map((lead) => lead.id)).catch(() => []);
  const dueCount = followUps.filter((row) => {
    if (row.status !== "queued") return false;
    const ms = dueAtMs(row.dueAt);
    return ms != null && ms <= Date.now();
  }).length;
  const nextByLead = new Map<string, Date>();
  const releasedByLead = new Map<string, Date>();
  const finishedByLead = new Set<string>();
  for (const item of followUps) {
    const dueMs = dueAtMs(item.dueAt);
    const due = dueMs == null ? null : new Date(dueMs);
    if (!due) continue;
    if (item.status === "queued") {
      const current = nextByLead.get(item.leadId);
      if (!current || due < current) nextByLead.set(item.leadId, due);
    }
    if (item.status === "released") {
      const current = releasedByLead.get(item.leadId);
      if (!current || due > current) releasedByLead.set(item.leadId, due);
    }
    if (item.status === "completed") finishedByLead.add(item.leadId);
  }

  return (
    <AppShell title="Leads">
      <LeadSavedToast show={saved} />
      <p className="mb-3 text-base text-muted-foreground">
        Work queue only — converted leads live on Deals. Untouched first, newest arrival next.
        Status new starts Aggressive. Contacted starts Default. Warm starts Steady. Cold starts
        Drip. Overrides stay on that lead only. Temp badges stay Hot / Warm / Cold. Lost stays
        off this list until you search. Nurture parks until the contact-again date.
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
          <Button type="button" size="sm">
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
            <FormPrimaryActions submitLabel="Save lead" />
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
              columns={leadColumns}
              empty={
                firstParam(params.status) || firstParam(params.source) || firstParam(params.temperature)
                  ? "No leads match this filter."
                  : "No open leads. Converted records are on Deals."
              }
              rows={rows.map((lead) => {
                const status = normalizeLeadStatus(lead.status);
                const queuedDue = nextByLead.get(lead.id);
                const releasedDue = releasedByLead.get(lead.id);
                const nextDue = queuedDue ?? releasedDue;
                const clockDone = !queuedDue && !releasedDue && finishedByLead.has(lead.id);
                const picked = pickTemplateForLead(templates, {
                  followUpTemplateId: lead.followUpTemplateId,
                  status,
                });
                const followUpName = picked ? followUpTemplateChipName(picked) : "";
                return {
                  key: lead.id,
                  id: lead.id,
                  parked: isParkedFromDefaultLeadsView(lead) && !filter.status,
                  hay: haystack([lead.firstName, lead.lastName, lead.email, lead.phone, lead.source, lead.status, ...(lead.tags ?? [])]),
                  sort: {
                    pick: "",
                    name: `${lead.lastName}, ${lead.firstName}`,
                    status,
                    source: sourceLabel(lead.source),
                    timer: nextDue ? String(nextDue.getTime()) : "0",
                    heat: lead.temperature ?? "hot",
                    followUp: followUpName,
                    shop: lead.convertedDealId ? "open" : "convert",
                    tags: tagSortText(lead.tags),
                    email: lead.email ?? "",
                    phone: lead.phone ?? "",
                    notes: lead.notes ?? "",
                    mailing_address: lead.mailingAddress ?? "",
                    city: lead.city ?? "",
                    state: lead.state ?? "",
                    zip: lead.zip ?? "",
                  },
                  cells: {
                    pick: <SelectRowCheckbox id={lead.id} />,
                    name: (
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="min-w-0 truncate">
                          <RecordLink href={`/leads/${lead.id}`}>
                            {lead.lastName}, {lead.firstName}
                          </RecordLink>
                        </span>
                        <LeadLogContact leadId={lead.id} phone={lead.phone} email={lead.email} />
                      </div>
                    ),
                    status: <LeadStatusSelect key={`status-${lead.id}`} leadId={lead.id} status={status} />,
                    source: sourceLabel(lead.source),
                    timer: (
                      <ResponseTimer
                        key={`timer-${lead.id}`}
                        leadId={lead.id}
                        dueAt={toIsoString(nextDue)}
                        done={clockDone}
                      />
                    ),
                    heat: <LeadHeatToggle key={`heat-${lead.id}`} leadId={lead.id} temperature={lead.temperature} />,
                    followUp: (
                      <div className="space-y-1">
                        <LeadTemplateOverride
                          key={`follow-${lead.id}`}
                          leadId={lead.id}
                          templateId={lead.followUpTemplateId}
                          templates={templates}
                          resolvedName={followUpName || "—"}
                          resolvedTemplateId={picked?.id ?? ""}
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
                    tags: (
                      <AssignRecordTags
                        module="leads"
                        recordId={lead.id}
                        tags={lead.tags}
                        catalog={tagCatalog}
                      />
                    ),
                    email: lead.email || "—",
                    phone: lead.phone || "—",
                    notes: lead.notes || "—",
                    mailing_address: lead.mailingAddress || "—",
                    city: lead.city || "—",
                    state: lead.state || "—",
                    zip: lead.zip || "—",
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
