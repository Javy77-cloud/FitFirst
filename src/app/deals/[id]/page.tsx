import Link from "next/link";
import { notFound } from "next/navigation";
import { bindDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuoteSheetPanel } from "@/components/deal/quote-sheet-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { RiskForm } from "@/components/deal/risk-form";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { getDealWorkspace } from "@/lib/db/queries";
import { DEAL_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; riskTab?: string }>;
}) {
  const { id } = await params;
  const { tab, riskTab } = await searchParams;
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const {
    deal,
    risk,
    docs,
    fields,
    quotes,
    logs,
    lead,
    contact,
    account,
    quoteSheet,
    boundPolicies,
  } = workspace;
  const matches = risk ? await evaluateDealMarkets(risk) : [];
  const isAna = deal.id === DEAL_ID;

  return (
    <AppShell
      title={deal.title}
      actions={
        deal.pipelineStage !== "bound" && !isAna ? (
          <form action={bindDeal} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <select
              name="bindTarget"
              defaultValue={deal.bindTarget}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            >
              <option value="contact">Personal — create Contact</option>
              <option value="account">Commercial — create Business</option>
            </select>
            <Input name="businessName" placeholder="Business name (commercial)" className="h-8 w-44" />
            <Input name="ein" placeholder="EIN / FEIN" className="h-8 w-32" />
            <Input name="policyNumber" placeholder="Policy # at bind" className="h-8 w-36" />
            <Input name="premium" placeholder="Premium" className="h-8 w-24" />
            <Button type="submit" size="sm" variant="secondary">
              Bind (creates contact/business + policy)
            </Button>
          </form>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StagePill stage={deal.pipelineStage} />
        <span>{deal.lineOfBusiness}</span>
        <span className="text-muted-foreground">{deal.state}</span>
        {lead ? (
          <RecordLink href={`/leads/${lead.id}`}>
            Lead {lead.lastName}, {lead.firstName}
          </RecordLink>
        ) : null}
        {contact ? (
          <RecordLink href={`/contacts/${contact.id}`}>
            Contact {contact.lastName}, {contact.firstName}
          </RecordLink>
        ) : null}
        {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
        {boundPolicies.map((policy) => (
          <RecordLink key={policy.id} href={`/policies/${policy.id}`}>
            Policy {policy.policyNumber}
          </RecordLink>
        ))}
        {risk?.city ? (
          <span className="text-muted-foreground">
            {risk.city}, {risk.county} · Cov A {risk.coverageA ?? "—"}
          </span>
        ) : null}
      </div>

      {isAna ? (
        <div className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-xs text-fit-yellow">
          Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Eight markets, zero bindable.
          Do not bind this shop. No policy from these quotes.
        </div>
      ) : null}

      {!risk ? (
        <p className="text-sm text-muted-foreground">This deal is missing a master risk.</p>
      ) : (
        <SectionTabs
          defaultValue="documents"
          active={tab}
          tabs={[
            {
              id: "documents",
              label: "Documents",
              content: (
                <DocumentsPanel dealId={deal.id} riskId={risk.id} docs={docs} fields={fields} />
              ),
            },
            {
              id: "quote-sheet",
              label: "Quote Sheet",
              content: (
                <QuoteSheetPanel dealId={deal.id} values={quoteSheet?.values ?? null} />
              ),
            },
            {
              id: "risk",
              label: "Master risk",
              content: <RiskForm risk={risk} dealId={deal.id} activeTab={riskTab} />,
            },
            {
              id: "markets",
              label: "Markets",
              content: <MarketsPanel dealId={deal.id} matches={matches} />,
            },
            {
              id: "quotes",
              label: "Quotes",
              content: (
                <QuotesPanel
                  dealId={deal.id}
                  quotes={quotes}
                  logs={logs}
                  quoteResultsNote={deal.quoteResultsNote}
                />
              ),
            },
          ]}
        />
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Shopping lives here.{" "}
        <Link href="/get-started" className="text-primary hover:underline">
          Run the test path
        </Link>
        .
      </p>
    </AppShell>
  );
}
