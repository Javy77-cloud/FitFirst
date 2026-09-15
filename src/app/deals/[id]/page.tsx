import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { DealMotivation } from "@/components/deal/deal-motivation";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import {
  getDealWorkspace,
  listCarriers,
  listPipelines,
  listQuoteLogs,
  listRecordActivities,
} from "@/lib/db/queries";
import { ensureSeededPipelines } from "@/lib/wire/ensure-pipelines";
import { listEnabledScriptsFor } from "@/lib/db/developer-hub-queries";
import {
  AGENT_DEAL_TAB_LABELS,
  AGENT_DEAL_TABS,
  hasMeaningfulDealFieldValues,
  parseAgentDealTab,
  resolveDealResumeTab,
} from "@/lib/deals/tabs";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { reportFromSheet } from "@/lib/completeness/report";
import { parseSheetFieldParam } from "@/lib/completeness/fix-href";
import { SheetFieldFocus } from "@/components/completeness/sheet-field-focus";
import { loadRecordContext } from "@/lib/record-context";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import { resolveDealProduct, resolveDealSheetLine } from "@/lib/deals/deal-line";
import { resolveDealHeaderAddresses } from "@/lib/deals/header-addresses";
import {
  logBelongsToLine,
  quoteBelongsToLine,
  resolveActivePackageLine,
  resolveLineQuotingForm,
  resolveVisiblePackageLines,
  sheetHasUserData,
} from "@/lib/deals/package-lines";
import {
  dealProductDef,
  familyForProducts,
  resolveActiveDealProduct,
  resolveVisibleDealProducts,
  sheetLineForProduct,
} from "@/lib/deals/deal-products";
import { productSectionComplete, productSectionProgress } from "@/lib/deals/product-layout";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
import { DealStatusStamp } from "@/components/deal/deal-status-stamp";
import {
  lineQuoteCompleteness,
  packageQuotesComplete,
} from "@/lib/deals/quote-completeness";
import { pickBoundQuoteId, resolveDealStampStage } from "@/lib/deals/status-stamp";
import { DealPackageLinesForm } from "@/components/deal/deal-package-lines-form";
import { DealFlowRail } from "@/components/deals/deal-flow-rail";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import {
  parseShopFlow,
  resolveShopFlowCompletion,
  riskFingerprint,
} from "@/lib/deals/shop-flow";
import { DealPackageShell } from "@/components/deal/deal-package-shell";
import { DealHeaderStage } from "@/components/deals/deal-header-stage";
import { relabelConvertActivityTitle } from "@/lib/crm/convert";
import { dealStageView } from "@/lib/deals/deal-columns";
import { uniqueDisplayPhones } from "@/lib/deals/header-addresses";
import {
  excludedCarrierIdsFromLogs,
  hasShopMarketAction,
  manualCarrierIdsFromLogs,
  sheetHasMarketFacts,
} from "@/lib/deals/manual-markets";
import { loadDealMotivationStats } from "@/lib/deals/motivation-data";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { mergeDealSystemValues } from "@/lib/custom-fields/values";
import { HAS_CO_APPLICANT_KEY } from "@/lib/custom-fields/co-applicant-fields";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { DEFAULT_HEALTH_SUBFILTERS, DEFAULT_LIFE_SUBFILTERS } from "@/lib/desk/line-settings";
import { SavedToast } from "@/components/desk/saved-toast";
import { ACTION_FLASH, ACTION_FLASH_MESSAGE, isActionFlash } from "@/lib/desk/action-flash";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencySettings, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID, SHOP_LINE_TO_LOB } from "@/lib/domain";
import { homeAddressFromRecords, officeMeetingAddress } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    notice?: string;
    field?: string;
    line?: string;
    product?: string;
    fromPolicy?: string;
  }>;
}) {
  const { id } = await params;
  const { tab, field, line: lineParam, product, notice, fromPolicy } = await searchParams;
  const focusField = parseSheetFieldParam(field);
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const {
    deal,
    risk,
    docs,
    fileVersions,
    fields,
    quotes,
    quoteNotes,
    logs,
    lead,
    contact,
    account,
    sheets,
    jobs,
  } = workspace;
  const [comms, scripts, carrierRows, allQuoteLogs, motivation, dealLayoutBundle, deskLineSettings, ownerRow, pipelines, context, agencyRow] =
    await Promise.all([
      listRecordActivities({ dealId: deal.id }),
      listEnabledScriptsFor("deals", "edit"),
      listCarriers(),
      listQuoteLogs(),
      loadDealMotivationStats(),
      loadModuleLayoutBundle("deals", deal.id, deal.lineOfBusiness).catch(() => null),
      loadDeskLineSettings().catch(() => null),
      deal.ownerId
        ? db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, deal.ownerId))
            .then((rows) => rows[0] ?? null)
            .catch(() => null)
        : Promise.resolve(null),
      ensureSeededPipelines()
        .catch(() => null)
        .then(() => listPipelines().catch(() => [])),
      loadRecordContext({
        dealId: deal.id,
        leadId: deal.leadId,
        contactId: deal.contactId,
        accountId: deal.accountId,
      }),
      db
        .select()
        .from(agencySettings)
        .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);
  const stageView = dealStageView(deal, pipelines);
  const dealLayout = dealLayoutBundle?.layout ?? null;
  const dealFields = dealLayoutBundle?.fields ?? [];
  const dealValues = dealLayoutBundle?.stored ?? {};
  const isAna = deal.id === DEAL_ID;
  const partyName =
    deal.primaryNamedInsured ??
    (contact ? `${contact.firstName} ${contact.lastName}` : lead ? `${lead.firstName} ${lead.lastName}` : deal.title);
  const headerAddresses = resolveDealHeaderAddresses({
    stored: dealValues,
    risk,
    contact,
    lead,
    account,
  });
  const clientAddress = homeAddressFromRecords({ risk, lead, contact });
  const officeAddress = officeMeetingAddress({
    agencyName: agencyRow?.agencyName,
    officeAddress: agencyRow?.officeAddress,
  });
  // Do NOT invent HO3 when quotingForm is blank — LIFE/HEALTH would open Homeowners.
  const quotingForm = quotingFormById(deal.quotingForm ?? "");
  const dealProducts = resolveVisibleDealProducts({
    shopProducts: (deal as { shopProducts?: string[] | null }).shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const packageLines = resolveVisiblePackageLines({
    shopProducts: (deal as { shopProducts?: string[] | null }).shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const activeProduct = resolveActiveDealProduct({
    productParam: product,
    lineParam,
    products: dealProducts,
    quotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
    quotingForm: deal.quotingForm,
    lineOfBusiness: deal.lineOfBusiness,
  });
  const activePackageLine = resolveActivePackageLine({
    lineParam,
    packageLines,
    quotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
    lineOfBusiness: deal.lineOfBusiness,
  });
  const sheetLine =
    sheetLineForProduct(activeProduct) ??
    activePackageLine ??
    resolveDealSheetLine({
      lineParam,
      quotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
      lineOfBusiness: deal.lineOfBusiness,
    });
  const activeSheet =
    sheets.find((row) => row.line === sheetLine) ?? (await ensureQuoteSheet(deal.id, sheetLine));
  const lineForm = resolveLineQuotingForm({
    sheetValues: activeSheet.values,
    sheetLine,
    dealQuotingForm: deal.quotingForm,
    dealQuotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
    dealLineOfBusiness: deal.lineOfBusiness,
  });
  const lineQuotingForm = quotingFormById(lineForm);
  const activeLob = SHOP_LINE_TO_LOB[sheetLine] ?? deal.lineOfBusiness;
  const isPrimaryPackageLine = !packageLines.length || packageLines[0] === sheetLine;
  const lineLogs =
    packageLines.length > 1
      ? logs.filter((row) => logBelongsToLine(row.log.lineOfBusiness, activeLob, isPrimaryPackageLine))
      : logs;
  const lineQuotes = quotes.filter((row) =>
    quoteBelongsToLine({
      quoteAttemptLogId: row.quote.quoteAttemptLogId,
      shopLine: row.quote.shopLine,
      notes: row.quote.notes,
      logs: logs.map((item) => item.log),
      lob: activeLob,
      isPrimaryLine: isPrimaryPackageLine,
      multiLine: packageLines.length > 1,
    }),
  );
  const dealLogs = lineLogs.map((row) => row.log);
  const excludedMarketIds = new Set(excludedCarrierIdsFromLogs(dealLogs));
  const shopMarketsAction = hasShopMarketAction(
    dealLogs,
    lineQuotes.map((row) => row.quote),
  );
  const rawMatches =
    shopMarketsAction && risk ? await evaluateDealMarkets(risk, activeSheet.values) : [];
  const matches = rawMatches.filter((row) => !excludedMarketIds.has(row.carrierId));
  const agentMarketsAction = shopMarketsAction || manualCarrierIdsFromLogs(dealLogs).some((id) => !excludedMarketIds.has(id));
  const selectedProduct = resolveDealProduct({
    productParam: product,
    sheetProduct: activeSheet.values.sheet_product?.value,
    policySubType: deal.policySubType,
    lineOfBusiness: activeLob,
    quotingLine: sheetLine,
    quotingForm: lineForm,
  });
  const masterFormLabel =
    lineQuotingForm?.label ||
    lineForm ||
    deal.policySubType ||
    deal.quotingForm ||
    (selectedProduct === "life"
      ? "Term Life"
      : selectedProduct === "health"
        ? "Health"
        : "HO3");
  const health = activeSheet ? reportFromSheet(sheetLine, activeSheet.values) : null;
  const unlocked = quotingUnlockedForDeal(deal);
  const tabParam = tab;
  const activeTab = tabParam
    ? parseAgentDealTab(tabParam)
    : resolveDealResumeTab({
        recordValues: dealValues,
        quotingUnlocked: unlocked,
        sheetFilled: sheetHasMarketFacts(activeSheet?.values),
        quotesRequested: hasShopMarketAction(
          dealLogs,
          lineQuotes.map((row) => row.quote),
        ),
        hasNonStubQuotes: lineQuotes.some((row) => row.quote.stub === false),
      });
  const currentFingerprint = riskFingerprint({
    sheets,
    docs: docs.filter((doc) => isDocumentsSourceDoc(doc)),
  });
  const shopFlow = parseShopFlow(deal.shopFlow);
  const packageShopLines = [
    ...new Set(
      dealProducts.length
        ? dealProducts.map((id) => dealProductDef(id).shopLine)
        : packageLines.length
          ? packageLines
          : [sheetLine],
    ),
  ];
  const quoteCompletenessByLine = Object.fromEntries(
    packageShopLines.map((line) => [
      line,
      lineQuoteCompleteness({
        line,
        logs: logs.map((row) => row.log),
        quotes: quotes.map((row) => row.quote),
        carriers: carrierRows.map((row) => ({ id: row.carrier.id, name: row.carrier.name })),
      }),
    ]),
  );
  const quotesPackageComplete = packageQuotesComplete(packageShopLines, quoteCompletenessByLine);
  const flowCompletion = resolveShopFlowCompletion({
    detailsComplete:
      hasMeaningfulDealFieldValues(dealValues) ||
      dealProducts.some((id) => productSectionComplete(id, dealValues)) ||
      sheets.some((row) => sheetHasUserData(row.values)),
    documentsComplete:
      Boolean(health && sheetHasUserData(activeSheet.values)) ||
      sheets.some((row) => sheetHasUserData(row.values)),
    hasMarkets: shopMarketsAction || agentMarketsAction,
    hasQuotes: quotesPackageComplete,
    currentFingerprint,
    saved: shopFlow,
  });
  const stampStage = resolveDealStampStage(stageView.slug, deal.pipelineStage, deal.boundAt);
  const boundQuoteId = pickBoundQuoteId({
    dealBound: Boolean(deal.boundAt) || stampStage === "bound",
    quotes: lineQuotes.map((row) => row.quote),
  });
  const activeQuoteCompleteness = quoteCompletenessByLine[sheetLine] ?? null;
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
      <DeskPageTrail
        backLabel={fromPolicy ? "Back to policy" : "Back"}
        fallbackHref={fromPolicy ? `/policies/${fromPolicy}` : "/deals"}
        crumbs={[
          { href: "/deals", label: "Deals" },
          ...(fromPolicy
            ? [{ href: `/policies/${fromPolicy}`, label: "Policy" }]
            : []),
          { label: "Deal" },
        ]}
      />
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
        <div className="relative w-full" data-ff-deal-flush-tabs data-ff-deal-topband>
        <DealStatusStamp stage={stampStage} />
        <SectionTabs
          defaultValue="details"
          active={activeTab}
          extraQuery={{ line: sheetLine, product: activeProduct }}
          panelClassName="mt-0"
          toolbar={activeTab === "details" ? <EditLayoutLink module="deals" line={activeLob} /> : null}
          heading={
            <div className="min-w-0">
              <h1 className="min-w-0 text-xl font-semibold text-navy" data-ff-deal-title>
                {deal.title}
              </h1>
              <DealPackageShell
                name={partyName}
                phones={uniqueDisplayPhones([
                  contact?.phone ?? lead?.phone,
                  dealValues.phone,
                  dealValues.mobile_phone,
                  dealValues.secondary_phone,
                ])}
                dob={dealValues.date_of_birth || contact?.dateOfBirth || lead?.dateOfBirth}
                insuredAddress={headerAddresses.insured}
                mailingAddress={headerAddresses.mailing}
                stage={stageView.name}
                owner={ownerRow?.name}
                activity={
                  relabelConvertActivityTitle(comms[0]?.title ?? null, {
                    lineOfBusiness: deal.lineOfBusiness,
                    quotingForm: deal.quotingForm,
                    policySubType: deal.policySubType,
                  }) ?? (comms.length ? `${comms.length} activities` : null)
                }
                stageControl={
                  <DealHeaderStage
                    dealId={deal.id}
                    pipelineSlug={stageView.pipelineSlug}
                    stageSlug={stageView.slug}
                    stages={stageView.stages}
                    dealTitle={deal.title}
                    toastOnSave
                  />
                }
              />
              {dealProducts.length ? (
                <>
                  <div className="mt-3">
                    <DealFlowRail
                      current={activeTab}
                      completed={flowCompletion.completed}
                      activeLabel={dealProductDef(activeProduct).label}
                      productComplete={
                        productSectionComplete(activeProduct, dealValues) ||
                        Boolean(
                          sheets.find((row) => row.line === sheetLineForProduct(activeProduct)) &&
                            sheetHasUserData(
                              sheets.find((row) => row.line === sheetLineForProduct(activeProduct))!
                                .values,
                            ),
                        )
                      }
                    />
                  </div>
                  <DealPackageLinesForm
                    dealId={deal.id}
                    selected={dealProducts}
                    activeLine={sheetLine}
                    tab={activeTab}
                  />
                  <DealLineSwitcher
                    dealId={deal.id}
                    products={dealProducts}
                    active={activeProduct}
                    tab={activeTab}
                    quoteGaps={Object.fromEntries(
                      dealProducts.map((id) => {
                        const gap = quoteCompletenessByLine[dealProductDef(id).shopLine];
                        return [
                          id,
                          gap
                            ? {
                                complete: gap.complete,
                                shopped: gap.shopped,
                                summary: gap.summary,
                              }
                            : { complete: false, shopped: false, summary: "Missing quotes" },
                        ];
                      }),
                    )}
                    complete={Object.fromEntries(
                      dealProducts.map((id) => [
                        id,
                        productSectionComplete(id, dealValues) ||
                          (sheets.find((row) => row.line === sheetLineForProduct(id))
                            ? sheetHasUserData(
                                sheets.find((row) => row.line === sheetLineForProduct(id))!.values,
                              )
                            : false),
                      ]),
                    )}
                    progress={Object.fromEntries(
                      dealProducts.map((id) => {
                        const sheet = sheets.find((row) => row.line === sheetLineForProduct(id));
                        const fromFields = productSectionProgress(id, dealValues);
                        const fromSheet = sheet && sheetHasUserData(sheet.values);
                        return [
                          id,
                          fromSheet ? { ...fromFields, complete: true, pct: 100 } : fromFields,
                        ];
                      }),
                    )}
                  />
                </>
              ) : null}
            </div>
          }
          corner={
            <div
              className="w-full"
              style={{ marginBottom: "calc(-50px + 0.75rem)" }}
              data-ff-deal-motivation-gap=""
            >
              <DealMotivation stats={motivation} />
            </div>
          }
          banner={
            isAna ? (
              <div className="mt-2 rounded-md bg-fit-yellow-bg px-3 py-2 text-base text-fit-yellow">
                Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Do not
                bind this shop. Quotes are not coverage.
              </div>
            ) : null
          }
          sidePanel={
            <>
              <div className="min-w-0 w-full max-w-full" data-ff-deal-quick-comms="">
                <QuickCommsBoard
                  items={comms}
                  dealId={deal.id}
                  leadId={deal.leadId}
                  contactId={deal.contactId}
                  accountId={deal.accountId}
                  contactName={partyName}
                  contactPhone={contact?.phone ?? lead?.phone}
                  contactEmail={contact?.email ?? lead?.email}
                  officeAddress={officeAddress}
                  clientAddress={clientAddress}
                  quoteFiles={docs
                    .filter(
                      (doc) =>
                        doc.slot === "quote_file" ||
                        doc.docType === "agency_quote" ||
                        (Array.isArray(doc.tags) &&
                          doc.tags.some(
                            (tag) =>
                              tag.startsWith("quote:") ||
                              tag === "source:agency" ||
                              tag === "source:carrier",
                          )),
                    )
                    .map((doc) => {
                      const quoteTag = Array.isArray(doc.tags)
                        ? doc.tags.find((tag) => tag.startsWith("quote:"))
                        : null;
                      return {
                        id: doc.id,
                        name: doc.filename,
                        quoteId: quoteTag ? quoteTag.slice("quote:".length) : null,
                      };
                    })}
                />
              </div>
              <RecordContextRail context={context} />
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
                        line={activeLob}
                        layout={dealLayout ?? defaultLayoutForModule("deals")}
                        fields={dealFields.length ? dealFields : resolveLayoutFields(dealLayout ?? defaultLayoutForModule("deals"), dealFields)}
                        values={mergeDealSystemValues(deal, lead, dealValues, dealFields)}
                        pipelineFamily={familyForProducts(dealProducts)}
                        quotingForm={lineForm}
                        policySubType={lineQuotingForm?.label ?? deal.policySubType}
                        packageLines={packageLines}
                        activePackageLine={activePackageLine}
                        activeProduct={activeProduct}
                        lifeOptions={(deskLineSettings?.lifeOptions?.length ? deskLineSettings.lifeOptions : DEFAULT_LIFE_SUBFILTERS)}
                        healthOptions={(deskLineSettings?.healthOptions?.length ? deskLineSettings.healthOptions : DEFAULT_HEALTH_SUBFILTERS)}
                        lifeHealthOptions={(deskLineSettings?.lifeOptions?.length ? deskLineSettings.lifeOptions : DEFAULT_LIFE_SUBFILTERS)}
                        lineSettings={deskLineSettings ?? undefined}
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
                        formLabel={masterFormLabel}
                        unlocked={unlocked}
                        approvedBy={deal.sheetApprovedBy}
                        product={selectedProduct}
                        hasCoApplicantFlag={dealValues[HAS_CO_APPLICANT_KEY] ?? null}
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
                        dealLine={activeLob}
                        shopLine={sheetLine}
                      />
                    ) : (
                      <QuotesPanel
                        dealId={deal.id}
                        quotes={lineQuotes}
                        logs={lineLogs}
                        quoteNotes={quoteNotes}
                        quoteResultsNote={deal.quoteResultsNote}
                        formId={lineQuotingForm?.id ?? lineForm ?? masterFormLabel}
                        shopLine={sheetLine}
                        currentQuoteRunId={shopFlow.quoteRuns?.[sheetLine] ?? null}
                        multiLine={packageLines.length > 1}
                        completeness={activeQuoteCompleteness}
                        boundQuoteId={boundQuoteId}
                        confirmLogs={allQuoteLogs.map((row) => ({
                          carrierId: row.log.carrierId,
                          why: row.log.why,
                        }))}
                        requestedCoverageA={deal.coverageAmount ?? null}
                        docs={docs}
                        fileVersions={fileVersions}
                        carriers={carrierOptions}
                        dealLine={activeLob}
                      />
                    )}

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
      )}
    </AppShell>
  );
}
