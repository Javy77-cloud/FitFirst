import { notFound } from "next/navigation";
import { createDealFromLead } from "@/app/actions/crm";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { LeadFormFields } from "@/components/crm/lead-form-fields";
import { LineSelect } from "@/components/crm/line-select";
import { RecordAskPanel } from "@/components/record-ask";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { formatPersonName } from "@/lib/crm/display";
import { LINE_LABELS } from "@/lib/crm/bind";
import { getLead, listEmailTemplates, listRecordAsks } from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
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
  const [row, templates, asks, users] = await Promise.all([
    getLead(id),
    listEmailTemplates(),
    listRecordAsks("lead", id),
    listDeskUsers(),
  ]);
  if (!row) notFound();
  const { lead, deal, timeline } = row;
  const lineLabel = lead.insuranceTypeDesired
    ? (LINE_LABELS[lead.insuranceTypeDesired as LineOfBusiness] ?? lead.insuranceTypeDesired)
    : null;

  return (
    <AppShell title={formatPersonName(lead)}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="uppercase text-muted-foreground">{lead.status}</span>
        <span className="text-muted-foreground">{lead.source ?? "manual"}</span>
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
            <Button type="submit" size="sm" variant="outline">
              Convert to deal
            </Button>
          </form>
        ) : null}
        <RecordAskPanel
          entityType="lead"
          entityId={lead.id}
          asks={asks}
          users={users}
          leadId={lead.id}
          dealId={deal?.id}
        />
        <ActivityTimeline
          items={timeline}
          leadId={lead.id}
          dealId={deal?.id}
          phone={lead.phone}
          email={lead.email}
          templates={templates}
        />
      </RecordSection>

      <RecordSection id="related" title="Related" summary="Deal created from this lead — no policy until bind">
        {deal ? (
          <RecordLink href={`/deals/${deal.id}`}>Open deal · {deal.title}</RecordLink>
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
