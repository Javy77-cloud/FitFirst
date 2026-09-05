import Link from "next/link";
import { notFound } from "next/navigation";
import { bindDeal } from "@/app/actions/crm";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { AppShell } from "@/components/app-shell";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { InDeskEsignPanel } from "@/components/esign/in-desk-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuoteSheetForm } from "@/components/deal/quote-sheet-form";
import { QuoteSheetPanel } from "@/components/deal/quote-sheet-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { RiskForm } from "@/components/deal/risk-form";
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
import { DEAL_ID } from "@/lib/fixtures/ids";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { HealthStrip } from "@/components/completeness/health-strip";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { reportFromSheet } from "@/lib/completeness/report";
import { parseSheetFieldParam } from "@/lib/completeness/fix-href";
import { SheetFieldFocus } from "@/components/completeness/sheet-field-focus";
import { loadRecordContext } from "@/lib/record-context";
import type { ShopLine } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; riskTab?: string; notice?: string; field?: string }>;
}) {
  const { id } = await params;
  const { tab, riskTab, notice, field } = await searchParams;
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
  const sheetLine = (quoteSheet?.line as ShopLine | undefined) ?? "home";
  const health = quoteSheet
    ? reportFromSheet(sheetLine, quoteSheet.values)
    : null;

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
        macros={macros.map((macro) => ({ id: macro.id, name: macro.name }))}
        buttons={buttons.map((button) => ({
          id: button.id,
          label: button.label,
          actionKind: button.actionKind,
        }))}
      />
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
        <div className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-base text-fit-yellow">
          Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Do not
          bind this shop. Quotes are not coverage.
        </div>
      ) : null}

      {health ? (
        <>
          <HealthStrip
            report={health}
            title={`Sheet health · ${health.confirmed} confirmed / ${health.missing} missing`}
            href={`/deals/${deal.id}?tab=quote-sheet`}
            dealId={deal.id}
          />
          <SheetFieldFocus field={focusField} />
        </>
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
                        <DocumentsPanel dealId={deal.id} riskId={risk.id} docs={docs} fields={fields} />
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
                    ),
                  },
                  {
                    id: "quote-sheet",
                    label: "Quote Sheet",
                    content: quoteSheet ? (
                      <div className="space-y-3">
                        <form action={fillQuoteSheetBlanks}>
                          <input type="hidden" name="dealId" value={deal.id} />
                          <input type="hidden" name="line" value={sheetLine} />
                          <Button type="submit" size="sm">
                            Fill blanks from source docs
                          </Button>
                        </form>
                        <QuoteSheetForm
                          dealId={deal.id}
                          dealTitle={deal.title}
                          line={sheetLine}
                          sheet={quoteSheet}
                          contact={contact}
                          riskId={risk.id}
                        />
                      </div>
                    ) : (
                      <QuoteSheetPanel dealId={deal.id} values={null} line={sheetLine} />
                    ),
                  },
                  {
                    id: "risk",
                    label: "Master risk",
                    content: (
                      <div>
                        <ClientScriptRunner
                          scripts={scripts.map((script) => ({
                            id: script.id,
                            event: script.event,
                            fieldName: script.fieldName,
                            body: script.body,
                          }))}
                        />
                        <RiskForm risk={risk} dealId={deal.id} activeTab={riskTab} />
                      </div>
                    ),
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
