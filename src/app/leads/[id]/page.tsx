import { notFound } from "next/navigation";
import { createDealFromLead } from "@/app/actions/crm";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { LeadFormFields } from "@/components/crm/lead-form-fields";
import { LineSelect } from "@/components/crm/line-select";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { formatPersonName } from "@/lib/crm/display";
import { sourceLabel } from "@/lib/crm/sources";
import { LINE_LABELS } from "@/lib/crm/bind";
import { AwardLeadForm } from "@/components/leads/award-form";
import { routeLeadNow } from "@/app/actions/lead-routing";
import { latestRoutingLog } from "@/lib/leads/apply-routing";
import { currentDeskSession } from "@/lib/auth/session";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { RecordDeveloperActions } from "@/components/developer-hub/record-actions";
import { parseMacroKind } from "@/lib/developer-hub/macros";
import { getLead } from "@/lib/db/queries";
import { listEnabledMacrosFor, listEnabledScriptsFor, listVisibleButtons } from "@/lib/db/developer-hub-queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { isInboundSocialSource, listAwardableAgents } from "@/lib/leads/offers";
import type { LineOfBusiness } from "@/lib/domain";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row, users, session, agents, routingLog, macros, buttons, scripts] =
    await Promise.all([
      getLead(id),
      listDeskUsers(),
      currentDeskSession(),
      listAwardableAgents(),
      latestRoutingLog(id),
      listEnabledMacrosFor("leads"),
      listVisibleButtons({ module: "leads", placement: "detail" }),
      listEnabledScriptsFor("leads", "edit"),
    ]);
  if (!row) notFound();
  const { lead, deal } = row;
  const ownerName = users.find((user) => user.id === lead.ownerId)?.name ?? null;
  const lineLabel = lead.insuranceTypeDesired
    ? (LINE_LABELS[lead.insuranceTypeDesired as LineOfBusiness] ?? lead.insuranceTypeDesired)
    : null;

  return (
    <AppShell title={formatPersonName(lead)} utilityChrome>
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
        <h1 className="text-xl font-semibold text-navy">{formatPersonName(lead)}</h1>
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

      <RecordSection id="record" title="This lead" summary="Person and coverage they asked for — source docs wait for the deal">
        <form action={updateLeadRecord} className="mb-4 space-y-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <LeadFormFields lead={lead} />
          <Button type="submit" size="sm">
            Save lead
          </Button>
        </form>
        {!deal ? (
          <form action={createDealFromLead} className="mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="state" value={lead.state ?? "FL"} />
            <LineSelect id="convert-line" defaultValue={lead.insuranceTypeDesired ?? "HO"} />
            <Button type="submit" data-ff-convert-deal>
              Convert to deal
            </Button>
            <p className="w-full text-helper text-muted-foreground">
              Convert when ready to shop. Source docs and the master-sheet approve gate live on
              the Deal — not here.
            </p>
          </form>
        ) : null}
      </RecordSection>

      <RecordSection id="related" title="Related" summary="Deal created from this lead — no policy until bind">
        {deal ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <RecordLink href={`/deals/${deal.id}`}>Open deal · {deal.title}</RecordLink>
            <StagePill stage={deal.pipelineStage} />
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No deal yet. Convert when you start the shop. Drop a dec, wind mit, or 4-point on the
            deal — not here.
          </p>
        )}
      </RecordSection>
    </AppShell>
  );
}
