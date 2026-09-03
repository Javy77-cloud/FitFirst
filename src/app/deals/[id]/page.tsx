import { notFound } from "next/navigation";
import { archiveDeal, bindDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { EmailActivityList, HistoryList } from "@/components/templates/email-activity";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { RiskForm } from "@/components/deal/risk-form";
import { StagePill } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { getDealWorkspace, historyForContact } from "@/lib/db/queries";
import { listEmailJobs } from "@/lib/db/template-queries";
import { formatDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const { deal, risk, docs, fields, quotes, logs, lead, contact } = workspace;
  const matches = risk ? await evaluateDealMarkets(risk) : [];
  const jobs = await listEmailJobs({ dealId: deal.id });
  const history = deal.contactId ? await historyForContact(deal.contactId) : [];

  return (
    <AppShell
      title={deal.title}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {deal.pipelineStage !== "bound" ? (
            <form action={bindDeal} className="flex items-center gap-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <Input
                name="policyNumber"
                placeholder="Policy # at bind"
                className="h-8 w-36"
              />
              <Button type="submit" size="sm" variant="secondary">
                Bind (creates contact + policy)
              </Button>
            </form>
          ) : null}
          {!deal.archivedAt ? (
            <form action={archiveDeal}>
              <input type="hidden" name="dealId" value={deal.id} />
              <Button type="submit" size="sm" variant="outline">
                Archive
              </Button>
            </form>
          ) : (
            <span className="text-xs text-muted-foreground">
              Archived {formatDay(deal.archivedAt)} — client email jobs stay on the won date
            </span>
          )}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StagePill stage={deal.pipelineStage} />
        <span>{deal.lineOfBusiness}</span>
        <span className="text-muted-foreground">{deal.state}</span>
        {deal.primaryNamedInsured ? (
          <span className="text-muted-foreground">
            {deal.primaryNamedInsured}
            {deal.secondaryNamedInsured ? ` · ${deal.secondaryNamedInsured}` : ""}
          </span>
        ) : lead ? (
          <span className="text-muted-foreground">
            Lead {lead.lastName}, {lead.firstName}
          </span>
        ) : null}
        {risk?.city ? (
          <span className="text-muted-foreground">
            {risk.city}, {risk.county} · Cov A {risk.coverageA ?? "—"}
          </span>
        ) : null}
        {deal.wonAt ? (
          <span className="text-muted-foreground">Won {formatDay(deal.wonAt)}</span>
        ) : null}
        {contact ? (
          <a href={`/contacts/${contact.id}`} className="text-primary hover:underline">
            {contact.lastName}, {contact.firstName}
          </a>
        ) : null}
      </div>

      {!risk ? (
        <p className="text-sm text-muted-foreground">This deal is missing a master risk.</p>
      ) : (
        <SectionTabs
          defaultValue="documents"
          tabs={[
            {
              id: "documents",
              label: "Documents",
              content: (
                <DocumentsPanel dealId={deal.id} riskId={risk.id} docs={docs} fields={fields} />
              ),
            },
            {
              id: "risk",
              label: "Master risk",
              content: <RiskForm risk={risk} dealId={deal.id} />,
            },
            {
              id: "markets",
              label: "Markets",
              content: <MarketsPanel dealId={deal.id} matches={matches} />,
            },
            {
              id: "quotes",
              label: "Quotes",
              content: <QuotesPanel quotes={quotes} logs={logs} />,
            },
          ]}
        />
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Client email jobs
          </div>
          <EmailActivityList
            jobs={jobs}
            empty="Closed Won schedules the Google review (+4 days) and four-month check-in from the won date. Ana is never emailed."
          />
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Activity
          </div>
          <HistoryList items={history} />
        </section>
      </div>
    </AppShell>
  );
}
