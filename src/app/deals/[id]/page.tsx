import Link from "next/link";
import { notFound } from "next/navigation";
import { sourceLabel } from "@/lib/crm/sources";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { InDeskEsignPanel } from "@/components/esign/in-desk-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuoteSheetPanel } from "@/components/deal/quote-sheet-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { SheetHealthToggle } from "@/components/deal/sheet-health-toggle";
import { DealMotivation } from "@/components/deal/deal-motivation";
import { RelatedRecordNav } from "@/components/crm/related-record-nav";
import { StagePill } from "@/components/fit-badge";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { RecordDeveloperActions } from "@/components/developer-hub/record-actions";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import {
  getDealWorkspace,
  getLatestInDeskEnvelope,
  listCarriers,
  listQuoteLogs,
  listRecordActivities,
} from "@/lib/db/queries";
import {
  listEnabledMacrosFor,
  listEnabledScriptsFor,
  listEnabledWidgetsByType,
  listVisibleButtons,
} from "@/lib/db/developer-hub-queries";
import { AGENT_DEAL_TAB_LABELS, AGENT_DEAL_TABS, parseAgentDealTab } from "@/lib/deals/tabs";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { reportFromSheet } from "@/lib/completeness/report";
import { parseSheetFieldParam } from "@/lib/completeness/fix-href";
import { SheetFieldFocus } from "@/components/completeness/sheet-field-focus";
import { loadRecordContext } from "@/lib/record-context";
import { parseShopLine, SHOP_LINE_LABELS } from "@/lib/domain";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import { manualCarrierIdsFromLogs } from "@/lib/deals/manual-markets";
import { loadDealMotivationStats } from "@/lib/deals/motivation-data";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; notice?: string; field?: string; line?: string }>;
}) {
  const { id } = await params;
  const { tab, notice, field, line: lineParam } = await searchParams;
  const focusField = parseSheetFieldParam(field);
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
  const [comms, macros, buttons, scripts, relatedWidgets, carrierRows, allQuoteLogs, motivation] =
    await Promise.all([
      listRecordActivities({ dealId: deal.id }),
      listEnabledMacrosFor("deals"),
      listVisibleButtons({ module: "deals", placement: "detail" }),
      listEnabledScriptsFor("deals", "edit"),
      listEnabledWidgetsByType("related_list"),
      listCarriers(),
      listQuoteLogs(),
      loadDealMotivationStats(),
    ]);
  const context = await loadRecordContext({
    dealId: deal.id,
    leadId: deal.leadId,
    contactId: deal.contactId,
    accountId: deal.accountId,
  });
  const isAna = deal.id === DEAL_ID;
  const envelope = await getLatestInDeskEnvelope({ dealId: deal.id });
  const partyName =
    deal.primaryNamedInsured ??
    (contact ? `${contact.firstName} ${contact.lastName}` : lead ? `${lead.firstName} ${lead.lastName}` : deal.title);
  const activeTab = parseAgentDealTab(tab);
  const sheetLine = parseShopLine(
    lineParam,
    parseShopLine(quoteSheet?.line ?? deal.shopLines?.[0]),
  );
  const activeSheet =
    sheets.find((row) => row.line === sheetLine) ?? (await ensureQuoteSheet(deal.id, sheetLine));
  const sourceDocCount = docs.filter(
    (doc) => doc.slot !== "quote_pdf" && doc.slot !== "policy_file",
  ).length;
  const health = activeSheet ? reportFromSheet(sheetLine, activeSheet.values) : null;
  const quotingForm = quotingFormById(deal.quotingForm ?? "") ?? quotingFormById("HO3");
  const unlocked = quotingUnlockedForDeal(deal);
  const manualIds = manualCarrierIdsFromLogs(logs.map((row) => row.log));
  const carrierOptions = carrierRows.map((row) => ({
    id: row.carrier.id,
    name: row.carrier.name,
  }));
  const bound =
    deal.pipelineStage === "bound" ||
    deal.pipelineStage === "closed_won" ||
    boundPolicies.length > 0;
  const party = contact
    ? {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        href: `/contacts/${contact.id}`,
        kind: "contact" as const,
      }
    : account
      ? {
          id: account.id,
          name: account.name,
          href: `/accounts/${account.id}`,
          kind: "account" as const,
        }
      : null;

  return (
    <AppShell title={deal.title} utilityChrome>
      <RecordDeveloperActions
        module="deals"
        recordId={deal.id}
        macros={macros.map((macro) => ({ id: macro.id, name: macro.name, kind: macro.kind }))}
        buttons={buttons.map((button) => ({
          id: button.id,
          label: button.label,
          actionKind: button.actionKind,
        }))}
      />
      <ClientScriptRunner
        scripts={scripts.map((script) => ({
          id: script.id,
          event: script.event,
          fieldName: script.fieldName,
          body: script.body,
        }))}
      />
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm" data-ff-deal-identity>
          <h1 className="text-xl font-semibold text-navy">{deal.title}</h1>
          <StagePill stage={deal.pipelineStage} />
          <span>{deal.lineOfBusiness}</span>
          <span className="text-muted-foreground">Source · {sourceLabel(deal.source ?? lead?.source)}</span>
          {lead ? (
            <RelatedRecordNav
              href={`/leads/${lead.id}`}
              label="View source lead"
              testId="view-source-lead"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          {health ? (
            <SheetHealthToggle
              report={health}
              href={`/deals/${deal.id}?tab=quote-sheet&line=${sheetLine}`}
              dealId={deal.id}
            />
          ) : null}
          <DealMotivation stats={motivation} />
        </div>
      </div>
      {health ? <SheetFieldFocus field={focusField} /> : null}

      {isAna ? (
        <div className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-base text-fit-yellow">
          Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Do not
          bind this shop. Quotes are not coverage.
        </div>
      ) : null}

      <RecordDetailLayout
        main={
          <div>
            {!risk ? (
              <p className="text-base text-muted-foreground">This deal is missing a risk row.</p>
            ) : (
              <SectionTabs
                defaultValue="documents"
                active={activeTab}
                extraQuery={{ line: sheetLine }}
                tabs={AGENT_DEAL_TABS.map((id) => ({
                  id,
                  label: AGENT_DEAL_TAB_LABELS[id],
                  content:
                    id === "documents" ? (
                      <div className="space-y-4">
                        <DocumentsPanel
                          dealId={deal.id}
                          riskId={risk.id}
                          docs={docs}
                          fields={fields}
                          jobs={jobs}
                          health={health}
                          sheetLine={sheetLine}
                          sheetValues={activeSheet.values}
                          formLabel={quotingForm?.label ?? "HO3"}
                          unlocked={unlocked}
                          approvedBy={deal.sheetApprovedBy}
                        />
                        <InDeskEsignPanel
                          recordKind="deal"
                          recordId={deal.id}
                          riskId={risk.id}
                          partyName={partyName}
                          status={deal.esignStatus}
                          requestedAt={deal.esignRequestedAt}
                          signedAt={deal.esignSignedAt}
                          signerName={deal.esignSignerName}
                          docs={docs}
                          envelope={envelope}
                          notice={notice}
                        />
                      </div>
                    ) : id === "quote-sheet" ? (
                      <div className="space-y-4">
                        <QuoteSheetPanel
                          dealId={deal.id}
                          dealTitle={deal.title}
                          line={sheetLine}
                          shopLines={deal.shopLines ?? ["home"]}
                          sheet={activeSheet}
                          contact={contact}
                          riskId={risk.id}
                          sourceDocCount={sourceDocCount}
                          docs={docs.filter((doc) => doc.slot !== "quote_pdf" && doc.slot !== "policy_file")}
                        />
                        <SheetApproveGate
                          dealId={deal.id}
                          line={sheetLine}
                          formLabel={quotingForm?.label ?? "HO3"}
                          unlocked={unlocked}
                          approvedBy={deal.sheetApprovedBy}
                        />
                      </div>
                    ) : id === "markets" ? (
                      <MarketsPanel
                        dealId={deal.id}
                        matches={matches}
                        unlocked={unlocked}
                        manualIds={manualIds}
                        carriers={carrierOptions}
                      />
                    ) : (
                      <QuotesPanel
                        dealId={deal.id}
                        quotes={quotes}
                        logs={logs}
                        quoteResultsNote={deal.quoteResultsNote}
                        formId={quotingForm?.id ?? "HO3"}
                        confirmLogs={allQuoteLogs.map((row) => ({
                          carrierId: row.log.carrierId,
                          why: row.log.why,
                        }))}
                        bind={{
                          defaultTarget: deal.bindTarget === "account" ? "account" : "contact",
                          lineLabel: SHOP_LINE_LABELS[sheetLine] ?? deal.lineOfBusiness,
                          isAna,
                          bound,
                          party,
                          policies: boundPolicies.map((policy) => ({
                            id: policy.id,
                            policyNumber: policy.policyNumber,
                          })),
                        }}
                      />
                    ),
                }))}
              />
            )}

            {relatedWidgets.length ? (
              <div className="mt-4 space-y-3">
                {relatedWidgets.map((widget) => (
                  <WidgetHost key={widget.id} name={widget.name} url={widget.externalUrl} compact />
                ))}
              </div>
            ) : null}

            <p className="mt-4 text-base text-muted-foreground">
              Shopping lives here.{" "}
              <Link href="/get-started" className="text-primary hover:underline">
                Run the test path
              </Link>
              .
            </p>
          </div>
        }
        rail={
          <div className="space-y-4 lg:sticky lg:top-4">
            <div data-ff-deal-quick-comms>
              <QuickCommsBoard items={comms} dealId={deal.id} />
            </div>
            <RecordContextRail context={context} />
          </div>
        }
      />
    </AppShell>
  );
}
