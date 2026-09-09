import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { SheetHealthToggle } from "@/components/deal/sheet-health-toggle";
import { DealMotivation } from "@/components/deal/deal-motivation";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { RecordDeveloperActions } from "@/components/developer-hub/record-actions";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import {
  getDealWorkspace,
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
import { reportFromSheet } from "@/lib/completeness/report";
import { parseSheetFieldParam } from "@/lib/completeness/fix-href";
import { SheetFieldFocus } from "@/components/completeness/sheet-field-focus";
import { loadRecordContext } from "@/lib/record-context";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import { resolveDealProduct, resolveDealSheetLine } from "@/lib/deals/deal-line";
import { excludedCarrierIdsFromLogs, hasShopMarketAction, manualCarrierIdsFromLogs } from "@/lib/deals/manual-markets";
import { loadDealMotivationStats } from "@/lib/deals/motivation-data";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { listDealFieldDefs, loadLayoutForModule, loadRecordValues } from "@/lib/custom-fields/store";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { mergeDealSystemValues } from "@/lib/custom-fields/values";
import { SavedToast } from "@/components/desk/saved-toast";
import { ACTION_FLASH, ACTION_FLASH_MESSAGE, isActionFlash } from "@/lib/desk/action-flash";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; notice?: string; field?: string; line?: string; product?: string }>;
}) {
  const { id } = await params;
  const { tab, field, line: lineParam, product, notice } = await searchParams;
  const focusField = parseSheetFieldParam(field);
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const {
    deal,
    risk,
    docs,
    fields,
    quotes,
    quoteNotes,
    logs,
    lead,
    contact,
    sheets,
    jobs,
  } = workspace;
  const [comms, macros, buttons, scripts, relatedWidgets, carrierRows, allQuoteLogs, motivation, dealLayout, dealFields, dealValues] =
    await Promise.all([
      listRecordActivities({ dealId: deal.id }),
      listEnabledMacrosFor("deals"),
      listVisibleButtons({ module: "deals", placement: "detail" }),
      listEnabledScriptsFor("deals", "edit"),
      listEnabledWidgetsByType("related_list"),
      listCarriers(),
      listQuoteLogs(),
      loadDealMotivationStats(),
      loadLayoutForModule("deals").catch(() => null),
      listDealFieldDefs().catch(() => []),
      loadRecordValues(deal.id).catch(() => ({}) as Record<string, string>),
    ]);
  const context = await loadRecordContext({
    dealId: deal.id,
    leadId: deal.leadId,
    contactId: deal.contactId,
    accountId: deal.accountId,
  });
  const isAna = deal.id === DEAL_ID;
  const partyName =
    deal.primaryNamedInsured ??
    (contact ? `${contact.firstName} ${contact.lastName}` : lead ? `${lead.firstName} ${lead.lastName}` : deal.title);
  const activeTab = parseAgentDealTab(tab);
  const quotingForm = quotingFormById(deal.quotingForm ?? "") ?? quotingFormById("HO3");
  const sheetLine = resolveDealSheetLine({
    lineParam,
    quotingLine: deal.quotingLine ?? quotingForm?.shopLine,
    lineOfBusiness: deal.lineOfBusiness,
  });
  const activeSheet =
    sheets.find((row) => row.line === sheetLine) ?? (await ensureQuoteSheet(deal.id, sheetLine));
  const dealLogs = logs.map((row) => row.log);
  const excludedMarketIds = new Set(excludedCarrierIdsFromLogs(dealLogs));
  const shopMarketsAction = hasShopMarketAction(
    dealLogs,
    quotes.map((row) => row.quote),
  );
  const rawMatches =
    shopMarketsAction && risk ? await evaluateDealMarkets(risk, activeSheet.values) : [];
  const matches = rawMatches.filter((row) => !excludedMarketIds.has(row.carrierId));
  const agentMarketsAction = shopMarketsAction || manualCarrierIdsFromLogs(dealLogs).some((id) => !excludedMarketIds.has(id));
  const selectedProduct = resolveDealProduct({
    productParam: product,
    sheetProduct: activeSheet.values.sheet_product?.value,
    policySubType: deal.policySubType,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? sheetLine,
    quotingForm: deal.quotingForm ?? quotingForm?.id,
  });
  const health = activeSheet ? reportFromSheet(sheetLine, activeSheet.values) : null;
  const unlocked = quotingUnlockedForDeal(deal);
  const manualIds = manualCarrierIdsFromLogs(dealLogs).filter((id) => !excludedMarketIds.has(id));
  const carrierOptions = carrierRows.map((row) => ({
    id: row.carrier.id,
    name: row.carrier.name,
    writtenLines: row.carrier.writtenLines,
  }));
  return (
    <AppShell
      title="Deals"
      utilityChrome
      showBrand={false}
      recordContext={{
        dealId: deal.id,
        leadId: deal.leadId,
        contactId: deal.contactId,
        accountId: deal.accountId,
        name: partyName,
        phone: contact?.phone ?? lead?.phone,
        email: contact?.email ?? lead?.email,
      }}
    >
      <ClientScriptRunner
        scripts={scripts.map((script) => ({
          id: script.id,
          event: script.event,
          fieldName: script.fieldName,
          body: script.body,
        }))}
      />
      {isActionFlash(notice, "sheetSaved") ? (
        <>
          <p
            hidden
            data-ff-action-flash={ACTION_FLASH.sheetSaved}
            data-ff-action-flash-message={ACTION_FLASH_MESSAGE[ACTION_FLASH.sheetSaved]}
          >
            {ACTION_FLASH_MESSAGE[ACTION_FLASH.sheetSaved]}
          </p>
          <SavedToast
            show
            message={ACTION_FLASH_MESSAGE[ACTION_FLASH.sheetSaved]}
            listHref={`/deals/${deal.id}?tab=documents&line=${sheetLine}`}
          />
        </>
      ) : null}
      {health ? <SheetFieldFocus field={focusField} /> : null}

      {!risk ? (
        <p className="text-base text-muted-foreground">This deal is missing a risk row.</p>
      ) : (
        <div className="-mt-5 flex w-full items-start gap-5" data-ff-deal-flush-tabs data-ff-deal-topband>
          <div className="min-w-0 flex-1 space-y-4 basis-0" data-ff-deal-top-left>
          <h1 className="min-w-0 text-xl font-semibold text-navy" data-ff-deal-title>
            {deal.title}
          </h1>
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
        <SectionTabs
          defaultValue="details"
          active={activeTab}
          extraQuery={{ line: sheetLine, product: selectedProduct }}
          panelClassName="mt-0"
          toolbar={<EditLayoutLink module="deals" line={deal.lineOfBusiness} />}
          banner={
            isAna ? (
              <div className="mt-2 rounded-md bg-fit-yellow-bg px-3 py-2 text-base text-fit-yellow">
                Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Do not
                bind this shop. Quotes are not coverage.
              </div>
            ) : null
          }
          tabs={AGENT_DEAL_TABS.map((id) => ({
            id,
            label: AGENT_DEAL_TAB_LABELS[id],
            content: (
                  <div>
                    {id === "details" ? (
                      <DealDetailsPanel
                        dealId={deal.id}
                        line={deal.lineOfBusiness}
                        layout={dealLayout ?? defaultLayoutForModule("deals")}
                        fields={resolveLayoutFields(dealLayout ?? defaultLayoutForModule("deals"), dealFields)}
                        values={mergeDealSystemValues(deal, lead, dealValues, dealFields)}
                      />
                    ) : id === "documents" ? (
                      <DocumentsPanel
                        dealId={deal.id}
                        riskId={risk.id}
                        docs={docs}
                        fields={fields}
                        jobs={jobs}
                        pendingFill={notice === "filled"}
                        health={health}
                        sheetLine={sheetLine}
                        sheetValues={activeSheet.values}
                        formLabel={quotingForm?.label ?? "HO3"}
                        unlocked={unlocked}
                        approvedBy={deal.sheetApprovedBy}
                        product={selectedProduct}
                      />
                    ) : id === "markets" ? (
                      <MarketsPanel
                        key={agentMarketsAction ? `markets-${activeSheet.id}` : "markets-empty"}
                        dealId={deal.id}
                        matches={shopMarketsAction ? matches : []}
                        unlocked={unlocked}
                        manualIds={manualIds}
                        explicitLookup={shopMarketsAction}
                        sheetHasValues={agentMarketsAction}
                        carriers={carrierOptions}
                        dealLine={deal.lineOfBusiness}
                      />
                    ) : (
                      <QuotesPanel
                        dealId={deal.id}
                        quotes={quotes}
                        logs={logs}
                        quoteNotes={quoteNotes}
                        quoteResultsNote={deal.quoteResultsNote}
                        formId={quotingForm?.id ?? "HO3"}
                        confirmLogs={allQuoteLogs.map((row) => ({
                          carrierId: row.log.carrierId,
                          why: row.log.why,
                        }))}
                        requestedCoverageA={deal.coverageAmount ?? null}
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
            ),
          }))}
        />
          </div>
          <aside
            className="w-[400px] min-w-[400px] max-w-[400px] shrink-0 overflow-x-hidden grow-0 basis-[400px] space-y-3 lg:sticky lg:top-4"
            data-ff-deal-right-rail
            data-ff-deal-rail-lock="400"
          >
            <div className="flex w-full min-w-0 max-w-full flex-col items-end" data-ff-deal-quotes-corner>
              {health ? (
                <SheetHealthToggle
                  report={health}
                  href={`/deals/${deal.id}?tab=documents&line=${sheetLine}`}
                  dealId={deal.id}
                />
              ) : null}
              <DealMotivation stats={motivation} />
            </div>
            <div className="min-w-0 w-full max-w-full" data-ff-deal-quick-comms>
              <QuickCommsBoard items={comms} dealId={deal.id} />
            </div>
            <RecordContextRail context={context} />
          </aside>
        </div>
      )}
    </AppShell>
  );
}
