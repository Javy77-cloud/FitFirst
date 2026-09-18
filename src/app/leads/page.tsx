import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StartShopForm } from "@/components/leads/start-shop-form";
import { AppShell } from "@/components/app-shell";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { LeadListRailFocus } from "@/components/leads/lead-list-rail-focus";
import { LeadQuickComms } from "@/components/leads/lead-quick-comms";
import { listLeads, listRecordActivities } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { leadsListColumnsFromLayout } from "@/lib/list-columns";
import { listFieldDefs, loadLayoutForModule } from "@/lib/custom-fields/store";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { sourceFilterOptions, sourceLabel } from "@/lib/crm/sources";
import { firstParam, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { listFollowUpTemplates, listLeadFollowUps } from "@/lib/db/lead-follow-up-queries";
import { scheduleDueLeadFollowUpRelease } from "@/lib/leads/schedule-follow-up-release";
import { followUpTemplateChipName, pickTemplateForLead } from "@/lib/leads/follow-up-templates";
import { resetLeadsWithoutLoggedContact } from "@/lib/leads/reset-untouched";
import {
  dueAtMs,
  isLeadOnQueue,
  isParkedFromDefaultLeadsView,
  matchesLeadQueueFilters,
  normalizeLeadCadence,
  normalizeLeadStatus,
  splitLegacyLeadStatus,
  sortLeadQueue,
  toIsoString,
} from "@/lib/leads/queue";
import { LeadsQueueToolbar } from "@/components/leads/leads-queue-toolbar";
import { ResponseTimer } from "@/components/leads/response-timer";
import {
  LeadHeatToggle,
  LeadLogContact,
  LeadCadenceSelect,
  LeadPipelineStatusSelect,
  LeadTemplateOverride,
} from "@/components/leads/lead-queue-controls";
import { LeadSavedToast } from "@/components/leads/lead-saved-toast";
import { LeadMotivation } from "@/components/leads/lead-motivation";
import { loadLeadMotivationStats } from "@/lib/leads/motivation-data";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { loadRecordContext } from "@/lib/record-context";
import type { RecordContextPayload } from "@/lib/record-context-types";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { eq } from "drizzle-orm";
import { homeAddressFromRecords, officeMeetingAddress } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "cadence", "source", "temperature"]);
  const q = firstParam(params.q) ?? "";
  const saved = firstParam(params.saved) === "1";
  await resetLeadsWithoutLoggedContact().catch(() => null);
  scheduleDueLeadFollowUpRelease();
  const [all, loadedTemplates, tagCatalog, leadLayout, leadFields, motivation] = await Promise.all([
    listLeads(),
    listFollowUpTemplates().catch(() => []),
    listModuleTags("leads").catch(() => []),
    loadLayoutForModule("leads").catch(() => null),
    listFieldDefs("leads").catch(() => []),
    loadLeadMotivationStats().catch(() => []),
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

  const railParam = firstParam(params.rail);
  const railLead =
    (railParam ? rows.find((lead) => lead.id === railParam) : null) ?? rows[0] ?? null;
  const emptyRail: RecordContextPayload = {
    people: [],
    deals: [],
    policies: [],
    openActivities: [],
    conversations: [],
    newDealHref: "/deals/new",
    newActivityHref: "/calendar",
  };
  const [railContext, railComms, agencyRow] = await Promise.all([
    railLead
      ? loadRecordContext({
          leadId: railLead.id,
          dealId: railLead.convertedDealId ?? null,
        })
      : emptyRail,
    railLead ? listRecordActivities({ leadId: railLead.id }).catch(() => []) : [],
    db
      .select({
        agencyName: agencySettings.agencyName,
        officeAddress: agencySettings.officeAddress,
      })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1)
      .then((rows) => rows[0] ?? null)
      .catch(() => null),
  ]);
  const railOfficeAddress = officeMeetingAddress({
    agencyName: agencyRow?.agencyName,
    officeAddress: agencyRow?.officeAddress,
  });
  const railClientAddress = railLead ? homeAddressFromRecords({ lead: railLead }) : null;
  const railPartyName = railLead
    ? `${railLead.firstName} ${railLead.lastName}`.trim()
    : "";

  return (
    <AppShell title="Leads">
      <LeadSavedToast show={saved} />
      <div
        className="grid w-full items-start"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 420px", columnGap: "1.25rem", rowGap: "1.25rem" }}
        data-ff-leads-list-layout="list-rail"
        data-ff-leads-workspace=""
      >
        <div className="min-w-0" style={{ gridColumn: 1, gridRow: 1 }} data-ff-leads-heading="">
          <p className="mb-3 text-base text-muted-foreground">
            Work queue only — converted leads live on Deals. Untouched first, newest arrival next.
            Cadence drives follow-up clocks. Temp badges stay Hot / Warm / Cold. Lost stays off this
            list until you search. Nurture parks until the contact-again date. Click a name to open
            the lead layout. The right rail shows Conversations for the focused/open queue lead.
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
        </div>
        <div
          className="flex items-start justify-end"
          style={{ gridColumn: 2, gridRow: 1 }}
          data-ff-lead-motivation-gap=""
        >
          <LeadMotivation stats={motivation} />
        </div>
        <div
          className="min-w-0"
          style={{ gridColumn: 1, gridRow: 2 }}
          data-ff-leads-list-panel=""
        >
        <section className="ff-leads-queue ff-card min-w-0 overflow-hidden">
          <div
            className="flex items-center justify-end border-b border-border px-3 py-2"
            data-ff-leads-list-actions=""
          >
            <Link
              href="/leads/new"
              className={cn(
                buttonVariants({ size: "default" }),
                "hover:!bg-fit-red hover:!text-white hover:!border-fit-red",
              )}
              data-ff-new-lead=""
            >
              New Lead
            </Link>
          </div>
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
                firstParam(params.status) || firstParam(params.cadence) || firstParam(params.source) || firstParam(params.temperature)
                  ? "No leads match this filter."
                  : "No open leads. Converted records are on Deals."
              }
              rows={rows.map((lead) => {
                const status = normalizeLeadStatus(lead.status);
                const cadence = normalizeLeadCadence(
                  (lead as { cadence?: string | null }).cadence ??
                    splitLegacyLeadStatus(lead.status).cadence,
                );
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
                        <LeadListRailFocus
                          leadId={lead.id}
                          label={`${lead.lastName}, ${lead.firstName}`}
                          active={railLead?.id === lead.id}
                        />
                        <LeadLogContact leadId={lead.id} phone={lead.phone} email={lead.email} />
                      </div>
                    ),
                    cadence: (
                      <LeadCadenceSelect key={`cadence-${lead.id}`} leadId={lead.id} cadence={cadence} />
                    ),
                    status: (
                      <LeadPipelineStatusSelect
                        key={`status-${lead.id}`}
                        leadId={lead.id}
                        status={status}
                      />
                    ),
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

        <aside
          className="min-w-0 w-full space-y-3 overflow-x-hidden"
          style={{ gridColumn: 2, gridRow: 2 }}
          data-ff-leads-list-rail=""
          data-ff-deal-right-rail=""
        >
          {railLead ? (
            <>
              <LeadQuickComms
                items={railComms}
                leadId={railLead.id}
                dealId={railLead.convertedDealId ?? null}
                contactName={railPartyName}
                contactPhone={railLead.phone}
                contactEmail={railLead.email}
                officeAddress={railOfficeAddress}
                clientAddress={railClientAddress}
              />
              <RecordContextRail
                key={railLead.id}
                context={railContext}
                defaultTab="conversations"
                headingName={railPartyName}
              />
            </>
          ) : (
            <div className="ff-card p-4 text-sm text-muted-foreground">
              No open lead selected. Queue a lead to see Conversations.
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
