import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { StartShopForm } from "@/components/leads/start-shop-form";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { RecordLink } from "@/components/record-links";
import { getLead, listRecordActivities } from "@/lib/db/queries";
import { loadRecordContext } from "@/lib/record-context";

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
  const comms = await listRecordActivities({ leadId: lead.id });
  const context = await loadRecordContext({
    leadId: lead.id,
    dealId: deal?.id,
  });

  return (
    <AppShell title={`${lead.lastName}, ${lead.firstName}`} eyebrow="Lead">
      <RecordDetailLayout
        main={
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="uppercase text-muted-foreground">{lead.status}</span>
              <span className="text-muted-foreground">{lead.source ?? "manual"}</span>
              {deal ? <RecordLink href={`/deals/${deal.id}`}>Open deal · {deal.title}</RecordLink> : null}
            </div>
            <section className="ff-card space-y-2 p-4 text-sm">
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
                <p className="whitespace-pre-wrap text-base text-muted-foreground">{lead.notes ?? "—"}</p>
              </div>
              {!deal ? (
                <div className="pt-2">
                  <StartShopForm leadId={lead.id} label="Start shop" showLine size="sm" />
                </div>
              ) : null}
            </section>
            <div className="mt-4">
              <QuickCommsBoard items={comms} leadId={lead.id} />
            </div>
          </div>
        }
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
