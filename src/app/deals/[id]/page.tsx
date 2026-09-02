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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="risk">Master risk</TabsTrigger>
            <TabsTrigger value="markets">Markets</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
          </TabsList>
          <TabsContent value="documents" className="mt-4">
            <DocumentsPanel dealId={deal.id} riskId={risk.id} docs={docs} fields={fields} />
          </TabsContent>
          <TabsContent value="risk" className="mt-4">
            <RiskForm risk={risk} dealId={deal.id} />
          </TabsContent>
          <TabsContent value="markets" className="mt-4">
            <MarketsPanel dealId={deal.id} matches={matches} />
          </TabsContent>
          <TabsContent value="quotes" className="mt-4">
            <QuotesPanel quotes={quotes} logs={logs} />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
