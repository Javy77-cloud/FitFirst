import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BindPath } from "@/components/deal/bind-path";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { FillPathStepper } from "@/components/deal/fill-path-stepper";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuoteHandoff } from "@/components/deal/quote-handoff";
import { QuoteSheetForm } from "@/components/deal/quote-sheet-form";
import { QuoteSheetPanel } from "@/components/deal/quote-sheet-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { QuotingLinePicker } from "@/components/deal/quoting-line-picker";
import { ReadyToShopCue } from "@/components/deal/ready-to-shop";
import { RiskForm } from "@/components/deal/risk-form";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { SourceVsSheet } from "@/components/deal/source-vs-sheet";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { getDealWorkspace, listCarriers, listRecordActivities } from "@/lib/db/queries";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { HealthStrip } from "@/components/completeness/health-strip";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { reportFromSheet } from "@/lib/completeness/report";
import { loadRecordContext } from "@/lib/record-context";
import type { ShopLine } from "@/lib/domain";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import { readyToShopCue } from "@/lib/quoting/ready-to-shop";
import { sheetForLine } from "@/lib/quoting/sheet-for-line";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; riskTab?: string; line?: string }>;
}) {
  const { id } = await params;
  const { tab, riskTab, line: lineHint } = await searchParams;
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
    sheets,
    jobs,
    boundPolicies,
  } = workspace;
  const matches = risk ? await evaluateDealMarkets(risk) : [];
  const comms = await listRecordActivities({ dealId: deal.id });
  const context = await loadRecordContext({
    dealId: deal.id,
    leadId: deal.leadId,
    contactId: deal.contactId,
    accountId: deal.accountId,
  });
  const carrierRows = await listCarriers();
  const isAna = deal.id === DEAL_ID;
  const sheetLine = (lineHint as ShopLine | undefined) ?? (quoteSheet?.line as ShopLine | undefined) ?? "home";
  const activeSheet = sheetForLine(sheets, sheetLine) ?? quoteSheet ?? null;
  const health = activeSheet ? reportFromSheet(sheetLine, activeSheet.values) : null;
  const quotingForm = quotingFormById(deal.quotingForm ?? "") ?? quotingFormById("HO3");
  const unlocked = quotingUnlockedForDeal(deal);
  const sourceDocs = docs.filter(
    (doc) => doc.slot !== "quote_pdf" && doc.slot !== "policy_file" && doc.slot !== "proposal",
  );
  const fillFinished = Boolean(
    activeSheet && Object.values(activeSheet.values).some((cell) => cell.value.trim()),
  );
  const cue = readyToShopCue({
    isAna,
    sourceDocCount: sourceDocs.length,
    hasQuotingForm: Boolean(deal.quotingForm || activeSheet),
    fillFinished,
    unlocked,
    health,
  });

  return (
    <AppShell title={deal.title}>
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

      <BindPath
        dealId={deal.id}
        defaultTarget={deal.bindTarget === "account" ? "account" : "contact"}
        lineLabel={quotingForm?.label ?? deal.lineOfBusiness}
        isAna={isAna}
        bound={deal.pipelineStage === "bound" || deal.pipelineStage === "closed_won"}
        party={
          account
            ? { id: account.id, name: account.name, href: `/accounts/${account.id}`, kind: "account" }
            : contact
              ? {
                  id: contact.id,
                  name: `${contact.firstName} ${contact.lastName}`,
                  href: `/contacts/${contact.id}`,
                  kind: "contact",
                }
              : null
        }
        policies={boundPolicies.map((policy) => ({
          id: policy.id,
          policyNumber: policy.policyNumber ?? "Policy",
        }))}
      />

      <ReadyToShopCue cue={cue} />

      {health ? (
        <HealthStrip
          report={health}
          title={`Sheet health · ${health.confirmed} confirmed / ${health.check} CHECK / ${health.missing} missing`}
          href={`/deals/${deal.id}?tab=quote-sheet`}
        />
      ) : null}

      <RecordDetailLayout
        main={
          <div>
            {!risk ? (
              <p className="text-base text-muted-foreground">This deal is missing a master risk.</p>
            ) : (
              <SectionTabs
                defaultValue="documents"
                active={tab}
                tabs={[
                  {
                    id: "documents",
                    label: "Documents",
                    content: (
                      <div className="space-y-4">
                        <FillPathStepper current={cue.fillStep} />
                        <DocumentsPanel
                          dealId={deal.id}
                          riskId={risk.id}
                          docs={docs}
                          fields={fields}
                          jobs={jobs}
                        />
                      </div>
                    ),
                  },
                  {
                    id: "quote-sheet",
                    label: "Quote Sheet",
                    content: (
                      <div className="space-y-4">
                        <FillPathStepper current={cue.fillStep} />
                        <QuotingLinePicker
                          dealId={deal.id}
                          currentForm={deal.quotingForm}
                          sourceDocCount={sourceDocs.length}
                        />
                        {activeSheet ? (
                          <SourceVsSheet
                            line={sheetLine}
                            docs={docs}
                            fields={fields}
                            values={activeSheet.values}
                          />
                        ) : null}
                        {activeSheet ? (
                          <QuoteSheetForm
                            dealId={deal.id}
                            dealTitle={deal.title}
                            line={sheetLine}
                            sheet={activeSheet}
                            contact={contact}
                            riskId={risk.id}
                            carriers={carrierRows.map(({ carrier }) => ({
                              id: carrier.id,
                              name: carrier.name,
                            }))}
                          />
                        ) : (
                          <QuoteSheetPanel dealId={deal.id} values={null} line={sheetLine} />
                        )}
                        <SheetApproveGate
                          dealId={deal.id}
                          line={sheetLine}
                          formLabel={quotingForm?.label ?? "HO3"}
                          unlocked={unlocked}
                          approvedBy={deal.sheetApprovedBy}
                        />
                        <QuoteHandoff
                          dealId={deal.id}
                          line={sheetLine}
                          formLabel={quotingForm?.label ?? "HO3"}
                          unlocked={unlocked}
                        />
                      </div>
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
                    content: (
                      <MarketsPanel dealId={deal.id} matches={matches} unlocked={unlocked} />
                    ),
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

            <div className="mt-4">
              <QuickCommsBoard items={comms} dealId={deal.id} />
            </div>

            <p className="mt-4 text-base text-muted-foreground">
              Shopping lives here. Quotes are not policies.{" "}
              <Link href="/get-started" className="text-primary hover:underline">
                Run the test path
              </Link>
              .
            </p>
          </div>
        }
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
