import { notFound } from "next/navigation";
import { bindDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { RiskForm } from "@/components/deal/risk-form";
import { StagePill } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { getDealWorkspace } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const { deal, risk, docs, fields, quotes, logs, lead } = workspace;
  const matches = risk ? await evaluateDealMarkets(risk) : [];

  return (
    <AppShell
      title={deal.title}
      actions={
        deal.pipelineStage !== "bound" ? (
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
        ) : null
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
    </AppShell>
  );
}
