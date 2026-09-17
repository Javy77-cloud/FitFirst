import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { formatPersonName } from "@/lib/crm/display";
import { sourceLabel } from "@/lib/crm/sources";
import { LINE_LABELS } from "@/lib/crm/bind";
import { AwardLeadForm } from "@/components/leads/award-form";
import { LeadDetailWorkspace } from "@/components/leads/lead-detail-workspace";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { ContactSectionBlock } from "@/components/contacts/contact-section-block";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { RelatedRecordNav } from "@/components/crm/related-record-nav";
import { routeLeadNow } from "@/app/actions/lead-routing";
import { latestRoutingLog } from "@/lib/leads/apply-routing";
import { currentDeskSession } from "@/lib/auth/session";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { RecordDeveloperActions } from "@/components/developer-hub/record-actions";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { getLead, listRecordActivities, type TimelineItem } from "@/lib/db/queries";
import { listEnabledMacrosFor, listEnabledScriptsFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { isInboundSocialSource, listAwardableAgents } from "@/lib/leads/offers";
import { ACTIVITY_KIND_LABEL, ACTIVITY_KINDS, DEFAULT_TENANT_ID, type ActivityKind, type LineOfBusiness } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { RecordTags } from "@/components/tags/record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { mergeRecordSystemValues } from "@/lib/custom-fields/resolve-layout";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { DEFAULT_HEALTH_SUBFILTERS, DEFAULT_LIFE_SUBFILTERS } from "@/lib/desk/line-settings";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { homeAddressFromRecords, officeMeetingAddress } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

const ACTIVITY_SECTION_TITLE: Record<ActivityKind, string> = {
  task: "Tasks",
  meeting: "Meetings",
  call: "Calls",
  email: "Emails",
  sms: "SMS",
};

const ACTIVITY_SECTION_EMPTY: Record<ActivityKind, string> = {
  task: "No tasks yet. Use Quick Comms to add a task.",
  meeting: "No meetings yet. Schedule from Quick Comms.",
  call: "No calls yet. Use Quick Comms to log a call.",
  email: "No emails yet. Use Quick Comms to log an email.",
  sms: "No SMS yet. Use Quick Comms to send a text.",
};

function timelineItemsForKind(timeline: TimelineItem[], kind: ActivityKind) {
  return timeline
    .filter((item) => item.kind.toLowerCase() === kind)
    .map((item) => ({
      id: item.id,
      title: item.subject || item.activityTitle || item.body || ACTIVITY_KIND_LABEL[kind],
      when: item.occurredAt,
      meta: item.direction ?? item.eventType ?? null,
    }));
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row, users, session, agents, routingLog, macros, buttons, scripts, tagExtra, leadLayout, deskLineSettings, comms, agencyRow] =
    await Promise.all([
      getLead(id),
      listDeskUsers(),
      currentDeskSession(),
      listAwardableAgents(),
      latestRoutingLog(id),
      listEnabledMacrosFor("leads"),
      listVisibleButtons({ module: "leads", placement: "detail" }),
      listEnabledScriptsFor("leads", "edit"),
      listModuleTags("leads").catch(() => [] as { name: string; color: string | null }[]),
      loadModuleLayoutBundle("leads", id).catch(() => null),
      loadDeskLineSettings().catch(() => null),
      listRecordActivities({ leadId: id }),
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
  if (!row) notFound();
  const { lead, deal, docs, timeline } = row;
  const context = await loadRecordContext({
    leadId: lead.id,
    dealId: deal?.id ?? null,
  });
  const ownerName = users.find((user) => user.id === lead.ownerId)?.name ?? null;
  const partyName = `${lead.firstName} ${lead.lastName}`.trim();
  const officeAddress = officeMeetingAddress({
    agencyName: agencyRow?.agencyName,
    officeAddress: agencyRow?.officeAddress,
  });
  const clientAddress = homeAddressFromRecords({ lead });
  const activityByKind = Object.fromEntries(
    ACTIVITY_KINDS.map((kind) => [kind, timelineItemsForKind(timeline, kind)]),
  ) as Record<ActivityKind, ReturnType<typeof timelineItemsForKind>>;
  const lineLabel = lead.insuranceTypeDesired
    ? (LINE_LABELS[lead.insuranceTypeDesired as LineOfBusiness] ?? lead.insuranceTypeDesired)
    : null;

  return (
    <AppShell
      title="Leads"
      utilityChrome
      showBrand={false}
      recordContext={{
        leadId: lead.id,
        dealId: deal?.id ?? null,
        name: formatPersonName(lead),
        phone: lead.phone,
        email: lead.email,
      }}
    >
      <RecordDeveloperActions
        module="leads"
        recordId={lead.id}
        showFollowUp
        macros={macros.map((macro) => ({
          id: macro.id,
          name: macro.name,
          kind: parseMacroKind(macro.kind),
        }))}
        buttons={buttons.map((button) => ({
          id: button.id,
          label: button.label,
          actionKind: button.actionKind,
        }))}
      />
      <ClientScriptRunner
        scripts={scripts.map((script) => ({
          id: script.id,
          event: script.event,
          fieldName: script.fieldName,
          body: script.body,
        }))}
      />
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-navy">{formatPersonName(lead)}</h1>
          {deal ? (
            <RelatedRecordNav
              href={`/deals/${deal.id}`}
              label="View Related Deal"
              testId="view-related-deal"
            />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="uppercase text-muted-foreground">{lead.status}</span>
          {deal ? <StagePill stage={deal.pipelineStage} /> : null}
          <span className="text-muted-foreground">{sourceLabel(lead.source ?? "manual")}</span>
          <span className="text-muted-foreground">
            {ownerName ? `Owner · ${ownerName}` : "Unassigned"}
          </span>
          {lineLabel ? <span className="text-muted-foreground">{lineLabel}</span> : null}
          {lead.preferredLanguage ? (
            <span className="uppercase text-muted-foreground">{lead.preferredLanguage}</span>
          ) : null}
          <ClickToCall
            entityType="lead"
            entityId={lead.id}
            name={formatPersonName(lead)}
            phone={lead.phone}
          />
        </div>
        <div className="mt-3 max-w-lg">
          <RecordTags
            module="leads"
            recordId={lead.id}
            tags={lead.tags}
            suggestions={suggestedTagsFor("leads", tagExtra.map((row) => row.name))}
            colors={colorsFromModuleTags(tagExtra)}
          />
        </div>
      </div>

      {routingLog ? (
        <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          {routingLog.outcome === "assigned" ? "Routed" : "Unassigned"} · {routingLog.reason}
        </p>
      ) : null}

      {session.isAdmin && !lead.ownerId ? (
        <form action={routeLeadNow} className="mb-4">
          <input type="hidden" name="leadId" value={lead.id} />
          <Button type="submit" size="sm" variant="outline">
            Run routing rules
          </Button>
        </form>
      ) : null}

      {session.isAdmin && !lead.ownerId && isInboundSocialSource(lead.source) ? (
        <div className="mb-4 ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">Award this inbound</h2>
          <p className="mb-2 text-helper text-muted-foreground">
            Agency-level social / inbound. Awarding assigns the Lead and pings that agent.
          </p>
          <AwardLeadForm leadId={lead.id} agents={agents} next={`/leads/${lead.id}`} />
        </div>
      ) : null}

      <RecordSection
        id="record"
        title="This lead"
        summary="Edit layout fields, Quick Comms, and the conversations rail."
      >
        <LeadDetailWorkspace
          leadId={lead.id}
          dealId={deal?.id ?? null}
          insuranceTypeDesired={lead.insuranceTypeDesired}
          state={lead.state ?? "FL"}
          docs={docs}
          rail={
            <>
              <div className="min-w-0 w-full max-w-full" data-ff-lead-quick-comms="">
                <QuickCommsBoard
                  items={comms}
                  leadId={lead.id}
                  dealId={deal?.id ?? null}
                  contactName={partyName}
                  contactPhone={lead.phone}
                  contactEmail={lead.email}
                  officeAddress={officeAddress}
                  clientAddress={clientAddress}
                />
              </div>
              <RecordContextRail context={context} defaultTab="info" headingName={partyName} />
            </>
          }
        >
          <RecordLayoutFields
            module="leads"
            layout={leadLayout?.layout ?? defaultLayoutForModule("leads")}
            fields={leadLayout?.fields ?? []}
            values={mergeRecordSystemValues(
              lead as unknown as Record<string, unknown>,
              leadLayout?.stored ?? {},
              leadLayout?.fields ?? [],
            )}
            lifeOptions={(deskLineSettings?.lifeOptions?.length ? deskLineSettings.lifeOptions : DEFAULT_LIFE_SUBFILTERS)}
            healthOptions={(deskLineSettings?.healthOptions?.length ? deskLineSettings.healthOptions : DEFAULT_HEALTH_SUBFILTERS)}
            lineSettings={deskLineSettings}
          />
        </LeadDetailWorkspace>
      </RecordSection>

      <RecordSection
        id="activity"
        title="Activity"
        summary="Tasks, meetings, calls, SMS, and emails — same set as contacts and deals."
      >
        <div className="space-y-3" data-ff-lead-activity="">
          {ACTIVITY_KINDS.map((kind) => (
            <ContactSectionBlock
              key={kind}
              id={kind}
              title={ACTIVITY_SECTION_TITLE[kind]}
              count={activityByKind[kind].length}
              emptyLabel={ACTIVITY_SECTION_EMPTY[kind]}
              items={activityByKind[kind]}
            />
          ))}
        </div>
      </RecordSection>

      <RecordSection id="related" title="Related" summary="Deal created from this lead — no policy until bind">
        {deal ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <RecordLink href={`/deals/${deal.id}`}>Open deal · {deal.title}</RecordLink>
            <StagePill stage={deal.pipelineStage} />
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No deal yet. Convert when you start the shop. Line files already on this lead come with
            it.
          </p>
        )}
      </RecordSection>
    </AppShell>
  );
}
