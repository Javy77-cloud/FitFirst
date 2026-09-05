import Link from "next/link";
import { notFound } from "next/navigation";
import { bindDeal } from "@/app/actions/crm";
import { updateDealRecord } from "@/app/actions/record-edit";
import { SourceSelect } from "@/components/crm/source-select";
import { sourceLabel } from "@/lib/crm/sources";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { InDeskEsignPanel } from "@/components/esign/in-desk-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuoteSheetPanel } from "@/components/deal/quote-sheet-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { RecordDeveloperActions } from "@/components/developer-hub/record-actions";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import { getDealWorkspace, getLatestInDeskEnvelope, listRecordActivities } from "@/lib/db/queries";
import {
  listEnabledMacrosFor,
  listEnabledScriptsFor,
  listEnabledWidgetsByType,
  listVisibleButtons,
} from "@/lib/db/developer-hub-queries";
import { AGENT_DEAL_TAB_LABELS, AGENT_DEAL_TABS, parseAgentDealTab } from "@/lib/deals/tabs";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { HealthStrip } from "@/components/completeness/health-strip";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { reportFromSheet } from "@/lib/completeness/report";
import { parseSheetFieldParam } from "@/lib/completeness/fix-href";
import { SheetFieldFocus } from "@/components/completeness/sheet-field-focus";
import { loadRecordContext } from "@/lib/record-context";
import { parseShopLine } from "@/lib/domain";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";

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
  const [comms, macros, buttons, scripts, relatedWidgets] = await Promise.all([
    listRecordActivities({ dealId: deal.id }),
    listEnabledMacrosFor("deals"),
    listVisibleButtons({ module: "deals", placement: "detail" }),
    listEnabledScriptsFor("deals", "edit"),
    listEnabledWidgetsByType("related_list"),
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
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StagePill stage={deal.pipelineStage} />
        <span className="text-muted-foreground">Source · {sourceLabel(deal.source ?? lead?.source)}</span>
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
        <div className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-base text-fit-yellow">
          Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Do not
          bind this shop. Quotes are not coverage.
        </div>
      ) : null}

      <form action={updateDealRecord} className="mb-4 flex max-w-sm flex-wrap items-end gap-2">
        <input type="hidden" name="dealId" value={deal.id} />
        <div className="min-w-[12rem] flex-1">
          <SourceSelect defaultValue={deal.source ?? lead?.source} />
        </div>
        <Button type="submit" size="sm" variant="outline">
          Save source
        </Button>
      </form>

      {health ? (
        <>
          <HealthStrip
            report={health}
            title={`Sheet health · ${health.confirmed} confirmed / ${health.missing} missing`}
            href={`/deals/${deal.id}?tab=quote-sheet&line=${sheetLine}`}
            dealId={deal.id}
          />
          <SheetFieldFocus field={focusField} />
        </>
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
                      <MarketsPanel dealId={deal.id} matches={matches} unlocked={unlocked} />
                    ) : (
                      <QuotesPanel
                        dealId={deal.id}
                        quotes={quotes}
                        logs={logs}
                        quoteResultsNote={deal.quoteResultsNote}
                      />
                    ),
                }))}
              />
            )}

            <div className="mt-4">
              <QuickCommsBoard items={comms} dealId={deal.id} />
            </div>
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
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
