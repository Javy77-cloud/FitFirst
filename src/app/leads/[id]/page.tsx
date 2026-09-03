import { notFound } from "next/navigation";
import { createDealFromLead } from "@/app/actions/crm";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { ClickToCall } from "@/components/click-to-call";
import { RecordAskPanel } from "@/components/record-ask";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLead, listEmailTemplates, listRecordAsks } from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row, templates, asks, users] = await Promise.all([
    getLead(id),
    listEmailTemplates(),
    listRecordAsks("lead", id),
    listDeskUsers(),
  ]);
  if (!row) notFound();
  const { lead, deal, timeline } = row;

  return (
    <AppShell title={`${lead.lastName}, ${lead.firstName}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="uppercase text-muted-foreground">{lead.status}</span>
        <span className="text-muted-foreground">{lead.source ?? "manual"}</span>
        <ClickToCall
          entityType="lead"
          entityId={lead.id}
          name={`${lead.firstName} ${lead.lastName}`}
          phone={lead.phone}
        />
      </div>

      <RecordSection id="record" title="This lead" summary="Info already on the lead — do not retype">
        <form action={updateLeadRecord} className="mb-4 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <div>
            <Label className="text-xs">First</Label>
            <Input name="firstName" defaultValue={lead.firstName} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Last</Label>
            <Input name="lastName" defaultValue={lead.lastName} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input name="phone" defaultValue={lead.phone ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input name="email" defaultValue={lead.email ?? ""} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Mailing</Label>
            <Input name="mailingAddress" defaultValue={lead.mailingAddress ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input name="city" defaultValue={lead.city ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input name="state" defaultValue={lead.state ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">ZIP</Label>
            <Input name="zip" defaultValue={lead.zip ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Date of birth</Label>
            <Input name="dateOfBirth" defaultValue={lead.dateOfBirth ?? ""} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input name="notes" defaultValue={lead.notes ?? ""} className="mt-1 h-8" />
          </div>
          <Button type="submit" size="sm">
            Save lead
          </Button>
        </form>
        {!deal ? (
          <form action={createDealFromLead} className="mb-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="state" value={lead.state ?? "FL"} />
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
          <p className="text-sm text-muted-foreground">No deal yet. Convert when you start the shop.</p>
        )}
      </RecordSection>
    </AppShell>
  );
}
