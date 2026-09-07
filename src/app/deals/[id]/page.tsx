import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { DealLineSelector } from "@/components/deal/deal-line-selector";
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
import { SHOP_LINE_LABELS } from "@/lib/domain";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import { resolveDealProduct, resolveDealSheetLine } from "@/lib/deals/deal-line";
import { manualCarrierIdsFromLogs } from "@/lib/deals/manual-markets";
import { loadDealMotivationStats } from "@/lib/deals/motivation-data";
import { RecordTags } from "@/components/tags/record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { suggestedTagsFor } from "@/lib/tags/module-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { listDealFieldDefs, loadLayoutForLine, loadRecordValues } from "@/lib/custom-fields/store";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
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
    logs,
    lead,
    contact,
    account,
    sheets,
    jobs,
    boundPolicies,
  } = workspace;
  const matches = risk ? await evaluateDealMarkets(risk) : [];
  const [comms, macros, buttons, scripts, relatedWidgets, carrierRows, allQuoteLogs, motivation, dealTagExtra, dealLayout, dealFields, dealValues] =
    await Promise.all([
      listRecordActivities({ dealId: deal.id }),
      listEnabledMacrosFor("deals"),
      listVisibleButtons({ module: "deals", placement: "detail" }),
      listEnabledScriptsFor("deals", "edit"),
      listEnabledWidgetsByType("related_list"),
      listCarriers(),
      listQuoteLogs(),
      loadDealMotivationStats(),
      listModuleTags("deals").catch(() => [] as { name: string; color: string | null }[]),
      loadLayoutForLine(deal.lineOfBusiness).catch(() => null),
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
  const sheetLine = resolveDealSheetLine({
    lineParam,
    quotingLine: deal.quotingLine,
    lineOfBusiness: deal.lineOfBusiness,
  });
  const activeSheet =
    sheets.find((row) => row.line === sheetLine) ?? (await ensureQuoteSheet(deal.id, sheetLine));
  const selectedProduct = resolveDealProduct({
    productParam: product,
    sheetProduct: activeSheet.values.sheet_product?.value,
    policySubType: deal.policySubType,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine ?? sheetLine,
  });
  const health = activeSheet ? reportFromSheet(sheetLine, activeSheet.values) : null;
  const quotingForm = quotingFormById(deal.quotingForm ?? "") ?? quotingFormById("HO3");
  const unlocked = quotingUnlockedForDeal(deal);
  const dealTagColors = colorsFromModuleTags(dealTagExtra);
  const manualIds = manualCarrierIdsFromLogs(logs.map((row) => row.log));
  const carrierOptions = carrierRows.map((row) => ({
    id: row.carrier.id,
    name: row.carrier.name,
    writtenLines: row.carrier.writtenLines,
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
          <div className="min-w-0 flex-1 lg:w-[72%] space-y-1" data-ff-deal-top-left>
          <h1 className="min-w-0 text-xl font-semibold text-navy" data-ff-deal-title>
            {deal.title}
          </h1>
        <SectionTabs
          defaultValue="details"
          active={activeTab}
          extraQuery={{ line: sheetLine, product: selectedProduct }}
          panelClassName="mt-1"
          banner={
            <>
              <DealLineSelector dealId={deal.id} product={selectedProduct} />
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
              {isAna ? (
                <div className="mt-2 rounded-md bg-fit-yellow-bg px-3 py-2 text-base text-fit-yellow">
                  Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Do not
                  bind this shop. Quotes are not coverage.
                </div>
              ) : null}
            </>
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
                        layout={dealLayout ?? defaultLayoutForLine(deal.lineOfBusiness)}
                        fields={dealFields}
                        values={mergeDealSystemValues(deal, lead, dealValues)}
                      />
                    ) : id === "documents" ? (
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
                        product={selectedProduct}
                      />
                    ) : id === "markets" ? (
                      <MarketsPanel
                        dealId={deal.id}
                        matches={matches}
                        unlocked={unlocked}
                        manualIds={manualIds}
                        carriers={carrierOptions}
                        dealLine={deal.lineOfBusiness}
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
            className="w-full space-y-3 lg:sticky lg:top-4 lg:w-[320px] max-w-[320px] shrink-0"
            data-ff-deal-right-rail
          >
            <div className="flex w-full flex-col items-end" data-ff-deal-quotes-corner>
              {health ? (
                <SheetHealthToggle
                  report={health}
                  href={`/deals/${deal.id}?tab=documents&line=${sheetLine}`}
                  dealId={deal.id}
                />
              ) : null}
              <DealMotivation stats={motivation} />
            </div>
            <div className="ff-card p-3">
              <RecordTags
                module="deals"
                recordId={deal.id}
                tags={deal.tags}
                suggestions={suggestedTagsFor("deals", dealTagExtra.map((row) => row.name))}
                colors={dealTagColors}
              />
            </div>
            <div data-ff-deal-quick-comms>
              <QuickCommsBoard items={comms} dealId={deal.id} />
            </div>
            <RecordContextRail context={context} />
          </aside>
        </div>
      )}
    </AppShell>
  );
}
