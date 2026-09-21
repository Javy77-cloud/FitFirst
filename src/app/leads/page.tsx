import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StartShopForm } from "@/components/leads/start-shop-form";
import { AppShell } from "@/components/app-shell";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { LeadListRailFocus } from "@/components/leads/lead-list-rail-focus";
import { LeadQuickComms } from "@/components/leads/lead-quick-comms";
import { listLeads, listRecordActivities } from "@/lib/db/queries";
import {
  ActivityContextGate,
  ActivityDeskProvider,
  ActivityGlyph,
  LeadActivitySwitch,
} from "@/components/desk/standard-activity-panel";
import { LeadsHostList } from "@/components/leads/leads-host-list";
import { LeadsPriorityStack } from "@/components/leads/leads-priority-stack";
import { LeadsSourceBanner } from "@/components/leads/leads-source-banner";
import { LeadsViewSwitch } from "@/components/leads/leads-view-switch";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { leadsListColumnsFromLayout } from "@/lib/list-columns";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { listFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import {
  isLeadPolicyFormColumn,
  leadLayoutDisplayValue,
  parseLeadsView,
  presentLeadDesk,
} from "@/lib/leads/lead-desk";
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
import { parseQuickCommsKind } from "@/lib/desk/quick-comms-open";

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
  const view = parseLeadsView(firstParam(params.view));
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

  const customById = await loadRecordValuesForIds(
    rows.map((lead) => lead.id),
    "leads",
  ).catch(() => new Map<string, Record<string, string>>());
  const desk = rows.map((lead) => {
    const status = normalizeLeadStatus(lead.status);
    const cadence = normalizeLeadCadence(
      (lead as { cadence?: string | null }).cadence ?? splitLegacyLeadStatus(lead.status).cadence,
    );
    const queuedDue = nextByLead.get(lead.id);
    const releasedDue = releasedByLead.get(lead.id);
    const nextDue = queuedDue ?? releasedDue ?? null;
    const clockDone = !queuedDue && !releasedDue && finishedByLead.has(lead.id);
    const picked = pickTemplateForLead(templates, {
      followUpTemplateId: lead.followUpTemplateId,
      status,
    });
    return presentLeadDesk({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status,
      cadence,
      temperature: lead.temperature,
      notes: lead.notes,
      mailingAddress: lead.mailingAddress,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      tags: lead.tags,
      createdAt: lead.createdAt,
      firstContactAt: lead.firstContactAt,
      followUpTemplateId: lead.followUpTemplateId,
      convertedDealId: lead.convertedDealId,
      archivedAt: lead.archivedAt,
      insuranceTypeDesired: lead.insuranceTypeDesired,
      fieldValues: mergeRecordSystemValues(
        lead as unknown as Record<string, unknown>,
        customById.get(lead.id) ?? {},
        leadFields,
      ),
      nextDue,
      clockDone,
      followUpName: picked ? followUpTemplateChipName(picked) : "",
      resolvedTemplateId: picked?.id ?? "",
      parked: isParkedFromDefaultLeadsView(lead) && !filter.status,
    });
  });
  const deskById = new Map(desk.map((record) => [record.id, record]));

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
  const activityRows = rows.map((lead) => ({
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    leadId: lead.id,
    dealId: lead.convertedDealId,
    clientAddress: homeAddressFromRecords({ lead }),
  }));
  const activityKind = parseQuickCommsKind(firstParam(params.qc));

  return (
    <AppShell title="Leads">
      <LeadSavedToast show={saved} />
      <ActivityDeskProvider initialId={railLead?.id ?? null} initialKind={activityKind}>
      <div
        className="grid w-full items-start"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 320px", columnGap: "1.25rem", rowGap: "1.25rem" }}
        data-ff-leads-list-layout="list-rail"
        data-ff-leads-workspace=""
      >
        <div className="min-w-0" style={{ gridColumn: 1, gridRow: 1 }} data-ff-leads-heading="">
          <LeadsSourceBanner sources={rows.map((lead) => lead.source)} />
          <p className="mb-3 text-base text-muted-foreground">
            Stack is the desk — cadence, response, and the next chase stay on the card. Queue is the
            work sheet. List is the rearrangeable column view. Converted leads live on Deals.
            Untouched first. Lost stays off until you search. Nurture parks until the contact-again
            date. The Activity board on the right is the same panel as a contact — pick a lead to
            load call, SMS, email, meeting, and task.
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
          <div className="mt-3 flex justify-end" data-ff-lead-motivation-gap="">
            <LeadMotivation stats={motivation} />
          </div>
        </div>
        <div
          className="min-w-0"
          style={{ gridColumn: 1, gridRow: 2 }}
          data-ff-leads-list-panel=""
        >
        <section
          className={view === "queue" ? "ff-leads-queue ff-card min-w-0 overflow-hidden" : "min-w-0"}
          data-ff-leads-view={view}
        >
          <div
            className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2"
            data-ff-leads-list-actions=""
          >
            <LeadsViewSwitch view={view} searchParams={params} />
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
          {view === "stack" ? (
            <LeadsPriorityStack records={desk} templates={templates} initialQuery={q} />
          ) : null}
          {view === "list" ? (
            <LeadsHostList records={desk} templates={templates} initialQuery={q} />
          ) : null}
          {view === "queue" ? (
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
              pinVisibleIds={["insurance_subtype", "insurance_category", "policy_form", "quoting_form"]}
              empty={
                firstParam(params.status) || firstParam(params.cadence) || firstParam(params.source) || firstParam(params.temperature)
                  ? "No leads match this filter."
                  : "No open leads. Converted records are on Deals."
              }
              rows={rows.map((lead) => {
                const record = deskById.get(lead.id);
                const status = record?.status ?? normalizeLeadStatus(lead.status);
                const cadence = record?.cadence ?? normalizeLeadCadence(
                  (lead as { cadence?: string | null }).cadence ??
                    splitLegacyLeadStatus(lead.status).cadence,
                );
                const queuedDue = nextByLead.get(lead.id);
                const releasedDue = releasedByLead.get(lead.id);
                const nextDue = queuedDue ?? releasedDue;
                const clockDone = record?.clockDone ?? (!queuedDue && !releasedDue && finishedByLead.has(lead.id));
                const picked = pickTemplateForLead(templates, {
                  followUpTemplateId: lead.followUpTemplateId,
                  status,
                });
                const followUpName = record?.followUpName || (picked ? followUpTemplateChipName(picked) : "");
                const fieldValues = record?.fieldValues ?? {};
                const layoutCells: Record<string, ReactNode> = {};
                const layoutSort: Record<string, string> = {};
                for (const column of leadColumns) {
                  if (
                    column.id === "pick" ||
                    column.id === "name" ||
                    column.id === "cadence" ||
                    column.id === "status" ||
                    column.id === "source" ||
                    column.id === "timer" ||
                    column.id === "heat" ||
                    column.id === "followUp" ||
                    column.id === "shop" ||
                    column.id === "tags" ||
                    column.id === "email" ||
                    column.id === "phone" ||
                    column.id === "notes" ||
                    column.id === "mailing_address" ||
                    column.id === "city" ||
                    column.id === "state" ||
                    column.id === "zip"
                  ) {
                    continue;
                  }
                  const text = leadLayoutDisplayValue(column.id, fieldValues, lead.insuranceTypeDesired);
                  layoutSort[column.id] = text === "—" ? "" : text;
                  layoutCells[column.id] = isLeadPolicyFormColumn(column.id) ? (
                    <span data-ff-lead-policy-form="">{text}</span>
                  ) : (
                    text
                  );
                }
                return {
                  key: lead.id,
                  id: lead.id,
                  parked: isParkedFromDefaultLeadsView(lead) && !filter.status,
                  hay: haystack([
                    lead.firstName,
                    lead.lastName,
                    lead.email,
                    lead.phone,
                    lead.source,
                    lead.status,
                    record?.policyForm,
                    record?.lob,
                    ...(lead.tags ?? []),
                  ]),
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
                    ...layoutSort,
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
                        <ActivityGlyph
                          id={lead.id}
                          menuTestId={`lead-queue-activity-${lead.id}`}
                          listTestId={`lead-queue-activity-menu-${lead.id}`}
                          optionAttr="data-ff-lead-activity-option"
                          leadId={lead.id}
                          dealId={lead.convertedDealId}
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
                    ...layoutCells,
                  },
                };
              })}
            />
          </ModuleListActions>
          ) : null}
        </section>
        </div>

        <aside
          className="w-[320px] min-w-[320px] max-w-[320px] shrink-0 grow-0 basis-[320px] space-y-3 overflow-x-hidden"
          style={{ gridColumn: 2, gridRow: "1 / span 2" }}
          data-ff-leads-list-rail=""
          data-ff-deal-right-rail=""
          data-ff-deal-rail-lock="320"
        >
          <LeadActivitySwitch
            initialId={railLead?.id ?? null}
            rows={activityRows}
            officeAddress={railOfficeAddress}
            seed={
              railLead ? (
                <LeadQuickComms
                  items={railComms}
                  leadId={railLead.id}
                  dealId={railLead.convertedDealId ?? null}
                  contactName={railPartyName}
                  contactPhone={railLead.phone}
                  contactEmail={railLead.email}
                  officeAddress={railOfficeAddress}
                  clientAddress={railClientAddress}
                  initialKind={activityKind}
                />
              ) : (
                <div className="ff-card p-4 text-sm text-muted-foreground">
                  No open lead selected. Queue a lead to see Conversations.
                </div>
              )
            }
          />
          {view === "queue" && railLead ? (
            <ActivityContextGate id={railLead.id}>
              <RecordContextRail
                key={railLead.id}
                context={railContext}
                defaultTab="conversations"
                headingName={railPartyName}
              />
            </ActivityContextGate>
          ) : null}
        </aside>
      </div>
      </ActivityDeskProvider>
    </AppShell>
  );
}
