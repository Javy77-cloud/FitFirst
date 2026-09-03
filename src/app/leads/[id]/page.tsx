import { notFound } from "next/navigation";
import { createDealFromLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { getLead } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getLead(id);
  if (!row) notFound();
  const { lead, deal } = row;

  return (
    <AppShell title={`${lead.lastName}, ${lead.firstName}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="uppercase text-muted-foreground">{lead.status}</span>
        <span className="text-muted-foreground">{lead.source ?? "manual"}</span>
        {deal ? <RecordLink href={`/deals/${deal.id}`}>Open deal · {deal.title}</RecordLink> : null}
      </div>
      <section className="ff-card max-w-xl space-y-2 p-4 text-sm">
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
      </section>
    </AppShell>
  );
}
