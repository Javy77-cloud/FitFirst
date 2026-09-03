import { notFound } from "next/navigation";
import { createDealFromLead } from "@/app/actions/crm";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { getLead, listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row, templates] = await Promise.all([getLead(id), listEmailTemplates()]);
  if (!row) notFound();
  const { lead, deal, timeline } = row;

  return (
    <AppShell title={`${lead.lastName}, ${lead.firstName}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="uppercase text-muted-foreground">{lead.status}</span>
        <span className="text-muted-foreground">{lead.source ?? "manual"}</span>
      </div>

      <RecordSection id="record" title="This lead" summary="Info, convert, and communications">
        <div className="mb-4 space-y-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Phone</span>
            <div>{lead.phone ?? "—"}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Email</span>
            <div>{lead.email ?? "—"}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Notes</span>
            <p className="whitespace-pre-wrap text-muted-foreground">{lead.notes ?? "—"}</p>
          </div>
          {!deal ? (
            <form action={createDealFromLead} className="pt-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <Button type="submit" size="sm">
                Convert to deal
              </Button>
            </form>
          ) : null}
        </div>
        <ActivityTimeline
          items={timeline}
          leadId={lead.id}
          dealId={deal?.id}
          phone={lead.phone}
          email={lead.email}
          templates={templates}
        />
      </RecordSection>

      <RecordSection id="related" title="Related" summary="Deal created from this lead">
        {deal ? (
          <RecordLink href={`/deals/${deal.id}`}>Open deal · {deal.title}</RecordLink>
        ) : (
          <p className="text-sm text-muted-foreground">No deal yet. Convert when you start the shop.</p>
        )}
      </RecordSection>
    </AppShell>
  );
}
