import { notFound } from "next/navigation";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { LifeHealthQuotesPanel } from "@/components/deal/life-health-quotes-panel";
import { HealthMarketsEmpty, LifeAppetiteHelper } from "@/components/deal/life-appetite-helper";
import {
  loadHealthSherpaAcaPublicStatus,
  loadHealthSherpaMedicarePublicStatus,
} from "@/lib/healthsherpa/vault";
import { loadDealHealthSherpaEnrollment } from "@/lib/healthsherpa/sync";
import { isUsingHealthSherpa } from "@/lib/healthsherpa/sheet";
import { predictLifeAppetite } from "@/lib/life/appetite";
import { resolveDealLifeProductType } from "@/lib/life/product-type";
import { DealMotivation } from "@/components/deal/deal-motivation";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import {
  getDealWorkspace,
  getReviewTask,
  listCarriers,
  listPipelines,
  listQuoteLogs,
  listRecordActivities,
} from "@/lib/db/queries";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";
import { isRenderableNoticeStamp, noticePicklistForFamily, noticeTypesForFamily } from "@/lib/deals/notices";
import { DealNotices } from "@/components/deal/deal-notices";
import { taskDueInputParts } from "@/lib/tasks/due-at";
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
import { resolvePartyEmail } from "@/lib/comms/resolve-party-email";
import { ACTIVITY_RAIL_ASIDE_CLASS, ACTIVITY_RAIL_LOCK } from "@/lib/desk/activity-rail";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { reportFromSheet } from "@/lib/completeness/report";
import { parseSheetFieldParam } from "@/lib/completeness/fix-href";
import { SheetFieldFocus } from "@/components/completeness/sheet-field-focus";
import { loadRecordContext } from "@/lib/record-context";
import { quotingFormById, quotingUnlockedForLine } from "@/lib/quoting/forms";
import { resolveDealProduct, resolveDealSheetLine } from "@/lib/deals/deal-line";
import { quotingFormIsManufacturedHome } from "@/lib/quote-sheet/home-address-fill";
import { resolveDealHeaderAddresses } from "@/lib/deals/header-addresses";
import {
  logBelongsToLine,
  quotingFormFromSheet,
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
  isLifeHealthShopLine,
  sheetLineForProduct,
  splitHomeProducts,
} from "@/lib/deals/deal-products";
import { productSectionComplete, productSectionProgress } from "@/lib/deals/product-layout";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
import { DealStatusStamp } from "@/components/deal/deal-status-stamp";
import { OutsideFitFirstStamp } from "@/components/deal/outside-fitfirst-stamp";
import { CreatePolicyFromDecModal } from "@/components/deal/create-policy-from-dec-modal";
import { ensureRosaDeclarationRetag } from "@/app/actions/declaration";
import { allowCreatePolicyPrompt, ROSA_DEC_DEAL_ID } from "@/lib/policy/dec-prompt";
import {
  lineQuoteCompleteness,
  productQuoteCompleteness,
} from "@/lib/deals/quote-completeness";
import { pickBoundQuoteId } from "@/lib/deals/status-stamp";
import {
  displayProductStage,
  isHeatherCamirandDeal,
  parseProductStages,
  productChipBound,
  productStageFor,
  productChipLabel,
  productStampStage,
  sheetFormForProduct,
  stripStaleCamirandProductNotices,
} from "@/lib/deals/product-stages";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import {
  hydrateCopiedLineFingerprints,
  lineRiskFingerprint,
  quoteMatchesDealProduct,
  requestScopeForLine,
  resolveShopFlowCompletion,
  sheetNeedsRecheckCue,
  STALE_SHOP_FINGERPRINT,
} from "@/lib/deals/shop-flow";
import {
  mergeShopFlowProductStages,
  normalizeDealPageStageSlug,
} from "@/lib/deals/new-deal-write";
import { DealPackageShell } from "@/components/deal/deal-package-shell";
import { PromiseChips } from "@/components/notifications/promise-chips";
import { loadCommitmentsForEntities } from "@/lib/notifications/load-commitments";
import { serializeCommitments } from "@/lib/notifications/commitments";
import { DealHeaderStage } from "@/components/deals/deal-header-stage";
import { DealOnHoldControl } from "@/components/deals/deal-on-hold-control";
import { dealHasOnHoldTag } from "@/lib/deals/on-hold";
import { quoteIdsWithFolderPolicy } from "@/lib/policy/mint-gate";
import { relabelConvertActivityTitle } from "@/lib/crm/convert";
import { dealStageView } from "@/lib/deals/deal-columns";
import { uniqueDisplayPhones } from "@/lib/deals/header-addresses";
import { dealTitleForActiveProduct } from "@/lib/deals/deal-title";
import {
  excludedCarrierIdsFromLogs,
  hasShopMarketAction,
  manualCarrierIdsFromLogs,
  sheetHasMarketFacts,
  shopListCarrierIdsFromLogs,
} from "@/lib/deals/manual-markets";
import { loadDealMotivationStats } from "@/lib/deals/motivation-data";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { loadModuleLayoutBundle, loadRecordValues } from "@/lib/custom-fields/store";
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
import { carriersForDealLine } from "@/lib/deals/carriers-for-line";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID, SHOP_LINE_TO_LOB, formatMoney } from "@/lib/domain";
import { parseQuickCommsKind } from "@/lib/desk/quick-comms-open";
import { homeAddressFromRecords, officeMeetingAddress } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";
/**
 * Fill Risk Profile → Docs calls Gemini. Without this, Vercel uses the platform
 * default (often 10–60s) and kills the action with a non-Flight 504. The client
 * then cannot read a Fill result. Must stay above the Docs step deadline (120s).
 */
export const maxDuration = 300;

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
    issue?: string;
    createPolicy?: string;
    doc?: string;
    docSlot?: string;
    carrier?: string;
    qc?: string;
  }>;
}) {
  const { id } = await params;
  const { tab, field, line: lineParam, product, notice, fromPolicy, issue, createPolicy, doc, docSlot, carrier, qc } =
    await searchParams;
  const focusField = parseSheetFieldParam(field);
  if (id === ROSA_DEC_DEAL_ID) {
    await ensureRosaDeclarationRetag().catch(() => null);
  }
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
    boundPolicies,
  } = workspace;
  // Deal Details CF (email etc.) — do not rely only on layout bundle for Open Compose To.
  const dealCfValuesPromise = loadRecordValues(deal.id, "deals").catch(
    () => ({} as Record<string, string>),
  );
  const [comms, scripts, carrierRows, allQuoteLogs, motivation, dealLayoutBundle, deskLineSettings, ownerRow, pipelines, context, agencyRow, noticePicklists, session, hsMedicare, hsAca, hsEnrollment, dealPromises] =
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
        .select({
          agencyName: agencySettings.agencyName,
          officeAddress: agencySettings.officeAddress,
        })
        .from(agencySettings)
        .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      listFieldPicklists().catch(() => []),
      currentDeskSession(),
      loadHealthSherpaMedicarePublicStatus().catch(() => ({ configured: false })),
      loadHealthSherpaAcaPublicStatus().catch(() => ({ configured: false })),
      loadDealHealthSherpaEnrollment(deal.id),
      loadCommitmentsForEntities({
        dealIds: [deal.id],
        contactIds: deal.contactId ? [deal.contactId] : [],
      }).catch(() => []),
    ]);
  const stageView = dealStageView(
    {
      ...deal,
      pipelineStage: normalizeDealPageStageSlug(deal.pipelineStageSlug || deal.pipelineStage),
      pipelineStageSlug: normalizeDealPageStageSlug(deal.pipelineStageSlug || deal.pipelineStage),
    },
    pipelines,
  );
  const dealLayout = dealLayoutBundle?.layout ?? null;
  const dealFields = dealLayoutBundle?.fields ?? [];
  const dealCfValues = await dealCfValuesPromise;
  const dealValues = { ...dealCfValues, ...(dealLayoutBundle?.stored ?? {}) };
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
  const splitHome = splitHomeProducts(dealProducts);
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
  const allQuoteLogsForMatch = logs.map((item) => item.log);
  const shopFlow = mergeShopFlowProductStages(deal.shopFlow, dealProducts);
  const lineQuotes = quotes.filter((row) =>
    quoteMatchesDealProduct(
      {
        shopLine: row.quote.shopLine,
        quoteAttemptLogId: row.quote.quoteAttemptLogId,
        notes: row.quote.notes,
        logs: allQuoteLogsForMatch,
        quoteRunId: row.quote.quoteRunId,
        quoteRuns: shopFlow.quoteRuns,
      },
      activeProduct,
      {
        multiLine: dealProducts.length > 1,
        isPrimaryLine: dealProducts[0] === activeProduct,
        splitHomeProducts: splitHome,
      },
    ),
  );
  const dealLogs = lineLogs.map((row) => row.log);
  const excludedMarketIds = new Set(excludedCarrierIdsFromLogs(dealLogs));
  const shopMarketsAction = hasShopMarketAction(
    dealLogs,
    lineQuotes.map((row) => row.quote),
  );
  const shopListIds = shopListCarrierIdsFromLogs(dealLogs).filter((id) => !excludedMarketIds.has(id));
  // Every MarketsPanel line (home HO3/MHO/DP, auto, flood, and the other sheet
  // lines) scores appetite_rules from the filled sheet. Life and Health keep
  // their own helpers. Shop lists and manual adds overlay carriers; they are
  // not required to see In appetite / Stretch / Skip. This does not request quotes.
  const sheetFilled = sheetHasMarketFacts(activeSheet?.values);
  const marketsUseSheet = !isLifeHealthShopLine(sheetLine);
  const sheetReady = marketsUseSheet && sheetFilled;
  const evalMarkets = Boolean(risk && sheetReady);
  const rawMatches = evalMarkets ? await evaluateDealMarkets(risk, activeSheet.values, activeLob) : [];
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
  const unlocked = quotingUnlockedForLine({ deal, sheet: activeSheet });
  const tabParam = tab;
  const activeTab = tabParam
    ? parseAgentDealTab(tabParam)
    : resolveDealResumeTab({
        recordValues: dealValues,
        quotingUnlocked: unlocked,
        sheetFilled,
        quotesRequested: hasShopMarketAction(
          dealLogs,
          lineQuotes.map((row) => row.quote),
        ),
        hasNonStubQuotes: lineQuotes.some((row) => row.quote.stub === false),
      });
  const sourceDocs = docs.filter((doc) => isDocumentsSourceDoc(doc));
  const shopFlowLive = hydrateCopiedLineFingerprints({
    saved: shopFlow,
    sheets,
    docs: sourceDocs,
  });
  const currentFingerprint = lineRiskFingerprint({
    line: sheetLine,
    sheets,
    docs: sourceDocs,
  });
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
  const quoteCompletenessByProduct = Object.fromEntries(
    dealProducts.map((id) => [
      id,
      productQuoteCompleteness({
        product: id,
        logs: logs.map((row) => row.log),
        quotes: quotes.map((row) => row.quote),
        carriers: carrierRows.map((row) => ({ id: row.carrier.id, name: row.carrier.name })),
        multiLine: dealProducts.length > 1,
        splitHomeProducts: splitHome,
        quoteRuns: shopFlow.quoteRuns,
      }),
    ]),
  );
  const flowCompletion = resolveShopFlowCompletion({
    detailsComplete:
      hasMeaningfulDealFieldValues(dealValues) ||
      dealProducts.some((id) => productSectionComplete(id, dealValues)) ||
      sheets.some((row) => sheetHasUserData(row.values)),
    // Risk Profile Confirm unlocks quoting → Documents tab check (RP lives on Documents).
    documentsComplete: Boolean(unlocked),
    hasMarkets: shopMarketsAction || agentMarketsAction,
    // Request quotes writes market logs + fingerprints before premiums arrive.
    hasQuotes: Boolean(
      quoteCompletenessByProduct[activeProduct]?.shopped ||
        quoteCompletenessByProduct[activeProduct]?.complete ||
        lineQuotes.some((row) => row.quote.stub !== true) ||
        shopMarketsAction,
    ),
    currentFingerprint,
    saved: shopFlowLive,
    line: sheetLine,
  });
  const productStages = isHeatherCamirandDeal(deal)
    ? stripStaleCamirandProductNotices(parseProductStages(shopFlow.productStages))
    : parseProductStages(shopFlow.productStages);
  const activeProductState = productStageFor(
    productStages,
    activeProduct,
    stageView.slug ?? deal.pipelineStage,
  );
  const issuedFolderQuoteIds = quoteIdsWithFolderPolicy(docs, dealProductDef(activeProduct).shopLine);
  const noticeFamily = familyForProducts(dealProducts);
  const dealNoticeTypes = noticeTypesForFamily(noticePicklists, noticeFamily);
  const dealNoticePicklist = noticePicklistForFamily(noticePicklists, noticeFamily);
  const noticeTask = activeProductState.noticeTaskId
    ? await getReviewTask(activeProductState.noticeTaskId)
    : null;
  const noticeDue = taskDueInputParts(noticeTask?.dueDate);
  const noticeReturnTo = `/deals/${deal.id}?tab=${activeTab}&product=${activeProduct}`;
  const noticeProps = {
    dealId: deal.id,
    dealName: deal.title,
    contactId: deal.contactId,
    product: activeProduct,
    stage: activeProductState.stage,
    noticeType: activeProductState.noticeType ?? activeProductState.inspectionStatus,
    noticeTypes: dealNoticeTypes,
    noticeTaskId: activeProductState.noticeTaskId,
    noticeNote: activeProductState.noticeNote,
    noticeNotes: activeProductState.noticeNotes,
    taskDueDate: noticeDue.date || null,
    taskDueTime: noticeDue.time || null,
    returnTo: noticeReturnTo,
    family: noticeFamily,
    picklistId: dealNoticePicklist?.id ?? null,
  };
  const liveQuoteIds = lineQuotes
    .filter((row) => row.quote.stub !== true)
    .map((row) => row.quote.id);
  const stampStage = productStampStage(
    activeProductState,
    stageView.slug ?? deal.pipelineStage,
    deal.boundAt,
    liveQuoteIds,
  );
  const boundQuoteId = pickBoundQuoteId({
    selectedQuoteIds: productChipBound(activeProductState.stage)
      ? activeProductState.selectedQuoteIds
      : [],
    quotes: lineQuotes.map((row) => row.quote),
  });
  const sheetStale =
    sheetNeedsRecheckCue(shopFlow, sheetLine) ||
    shopFlow.lineFingerprints?.[sheetLine]?.quotes === STALE_SHOP_FINGERPRINT ||
    shopFlow.quotesFingerprint === STALE_SHOP_FINGERPRINT;
  const needsVisualReapprove = !unlocked && Boolean(deal.sheetApprovedAt || deal.sheetApprovedBy);
  const hasRequestedQuotes =
    shopMarketsAction || lineQuotes.some((row) => row.quote.stub !== true);
  const noticeStampVisible = isRenderableNoticeStamp(noticeProps.noticeType);
  const titleForm =
    sheetFormForProduct(activeProduct, lineForm) ?? dealProductDef(activeProduct).quotingForm;
  const docSlotProducts = dealProducts.map((id) => {
    const productLine = sheetLineForProduct(id);
    const sheet = sheets.find((row) => row.line === productLine);
    const fromSheet =
      quotingFormFromSheet(sheet?.values) ??
      resolveLineQuotingForm({
        sheetValues: sheet?.values,
        sheetLine: productLine ?? sheetLine,
        dealQuotingForm: deal.quotingForm,
        dealQuotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
        dealLineOfBusiness: deal.lineOfBusiness,
      });
    const form = sheetFormForProduct(id, fromSheet) ?? dealProductDef(id).quotingForm;
    return {
      id,
      label: productChipLabel({ product: id, quotingForm: form }),
      shopLine: productLine,
      quotingForm: form,
    };
  });
  const visibleDealTitle = dealTitleForActiveProduct({
    title: deal.title,
    product: activeProduct,
    quotingForm: titleForm,
    sheetForm: titleForm,
  });
  const quoteChoices = lineQuotes
    .filter((row) => row.quote.stub !== true)
    .map((row) => ({
      id: row.quote.id,
      carrierName: row.carrier.name,
      premium: formatMoney(row.quote.premium),
    }));
  const activeQuoteCompleteness = quoteCompletenessByLine[sheetLine] ?? null;
  const manualIds = manualCarrierIdsFromLogs(dealLogs).filter((id) => !excludedMarketIds.has(id));
  const carrierOptions = carriersForDealLine(
    carrierRows.map((row) => ({
      id: row.carrier.id,
      name: row.carrier.name,
      writtenLines: row.carrier.writtenLines,
    })),
    activeLob,
  );
  const allCarrierOptions = carrierRows.map((row) => ({
    id: row.carrier.id,
    name: row.carrier.name,
    writtenLines: row.carrier.writtenLines,
  }));
  const lifeHealthLine = isLifeHealthShopLine(sheetLine);
  const requestedLifeProductType = resolveDealLifeProductType({
    productId: activeProduct,
    quotingForm: titleForm || lineForm || deal.quotingForm,
    policySubType: deal.policySubType,
    lifeProductType: dealValues.life_product_type,
    sheetProductType: activeSheet.values.product_type?.value ?? "",
  });
  const lifeAppetite =
    sheetLine === "life"
      ? predictLifeAppetite({
          medicalConditions: activeSheet.values.medical_conditions?.value ?? "",
          tobaccoStatus: activeSheet.values.tobacco_status?.value ?? "",
          heightFt: activeSheet.values.height_ft?.value ?? "",
          heightIn: activeSheet.values.height_in?.value ?? "",
          weightLbs: activeSheet.values.weight?.value ?? "",
          sex: activeSheet.values.applicant_gender?.value || dealValues.applicant_gender || "",
          dateOfBirth:
            dealValues.date_of_birth || contact?.dateOfBirth || lead?.dateOfBirth || "",
          productType: requestedLifeProductType,
          productId: activeProduct,
          quotingForm: titleForm || lineForm || deal.quotingForm,
          policySubType: deal.policySubType,
          lifeProductType: dealValues.life_product_type,
        })
      : {
          selectedLabels: [],
          conditionKeys: [],
          predictions: [],
          coverageNote: "",
          build: {
            heightInches: null,
            weightLbs: null,
            bmi: null,
            sex: "" as const,
            band: "unknown",
            tablePending: true,
            note: "",
          },
          ageYears: null,
          thin: true,
          requestedProductType: requestedLifeProductType,
        };

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
        email: resolvePartyEmail({ contact, lead, account, dealStored: dealValues }),
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
        <div className="ff-deal-stamp-row" data-ff-deal-stamps="">
          <div className="ff-deal-stamp-stack">
            <DealStatusStamp stage={stampStage} />
            <OutsideFitFirstStamp override={activeProductState.outsideOverride} />
            {stampStage && noticeStampVisible ? (
              <DealNotices {...noticeProps} placement="overlay" />
            ) : null}
          </div>
        </div>
        {(() => {
          const pending = shopFlow.pendingDecPrompt;
          const promptDoc = doc?.trim() || pending?.documentId;
          const showPrompt =
            allowCreatePolicyPrompt({ stage: activeProductState.stage }) &&
            Boolean(promptDoc && (createPolicy === "1" || pending?.documentId));
          if (!showPrompt || !promptDoc) return null;
          return (
            <CreatePolicyFromDecModal
              dealId={deal.id}
              product={pending?.product || activeProduct}
              documentId={promptDoc}
              carrierName={carrier?.trim() || pending?.carrierName}
              selectedQuoteIds={activeProductState.selectedQuoteIds}
            />
          );
        })()}
        <SectionTabs
          defaultValue="details"
          active={activeTab}
          extraQuery={{ line: sheetLine, product: activeProduct }}
          panelClassName="mt-0"
          tabSize="deal"
          toolbar={activeTab === "details" ? <EditLayoutLink module="deals" line={activeLob} /> : null}
          heading={
            <div className="min-w-0 flex-1 space-y-1" data-ff-deal-top-left="">
              <div className="min-w-0">
                <h1 className="min-w-0 text-xl font-semibold text-navy" data-ff-deal-title>
                  {visibleDealTitle}
                </h1>
                <PromiseChips commitments={serializeCommitments(dealPromises)} />
                {!noticeStampVisible ? (
                  <div className="mt-1.5" data-ff-deal-create-notice="">
                    <DealNotices {...noticeProps} placement="header" />
                  </div>
                ) : null}
              </div>
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
                stage={displayProductStage({
                  stage: activeProductState.stage,
                  selectedQuoteIds: activeProductState.selectedQuoteIds,
                  fallback: stageView.slug,
                  liveQuoteIds,
                })}
                owner={ownerRow?.name}
                activity={
                  relabelConvertActivityTitle(comms[0]?.title ?? null, {
                    lineOfBusiness: deal.lineOfBusiness,
                    quotingForm: deal.quotingForm,
                    policySubType: deal.policySubType,
                  }) ?? (comms.length ? `${comms.length} activities` : null)
                }
                stageControl={
                  <div className="flex flex-wrap items-center gap-1.5" data-ff-deal-stage-notice="">
                    <DealHeaderStage
                      dealId={deal.id}
                      pipelineSlug={stageView.pipelineSlug}
                      stageSlug={displayProductStage({
                        stage: activeProductState.stage,
                        selectedQuoteIds: activeProductState.selectedQuoteIds,
                        fallback: stageView.slug,
                        liveQuoteIds,
                        outsideOverride: activeProductState.outsideOverride,
                      })}
                      stages={stageView.stages}
                      dealTitle={visibleDealTitle}
                      toastOnSave
                      product={activeProduct}
                      selectedQuoteIds={activeProductState.selectedQuoteIds}
                      quoteChoices={quoteChoices}
                      workspaceTab={activeTab}
                      issuedFolderQuoteIds={issuedFolderQuoteIds}
                      outsideOverride={Boolean(activeProductState.outsideOverride)}
                    />
                    <DealOnHoldControl
                      dealId={deal.id}
                      onHold={dealHasOnHoldTag(deal.tags)}
                      dealTitle={visibleDealTitle}
                    />
                    {!stampStage && noticeStampVisible ? (
                      <DealNotices {...noticeProps} placement="header" />
                    ) : null}
                  </div>
                }
              />
            </div>
          }
          subnav={
              dealProducts.length ? (
                <>
                  <DealLineSwitcher
                    dealId={deal.id}
                    products={dealProducts}
                    active={activeProduct}
                    tab={activeTab}
                    quoteGaps={Object.fromEntries(
                      dealProducts.map((id) => {
                        const gap = quoteCompletenessByProduct[id];
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
                    stages={Object.fromEntries(
                      dealProducts.map((id) => {
                        const state = productStageFor(
                          productStages,
                          id,
                          stageView.slug ?? deal.pipelineStage,
                        );
                        return [
                          id,
                          {
                            stage: state.stage,
                            lostReason: state.lostReason,
                            selectedQuoteIds: state.selectedQuoteIds,
                            policyId: state.policyId,
                            mintStatus: state.mintStatus,
                            issuedDone: state.issuedDone,
                          },
                        ];
                      }),
                    )}
                    formLabels={Object.fromEntries(
                      dealProducts.map((id) => {
                        const line = sheetLineForProduct(id);
                        const sheet = sheets.find((row) => row.line === line);
                        const fromSheet =
                          quotingFormFromSheet(sheet?.values) ??
                          resolveLineQuotingForm({
                            sheetValues: sheet?.values,
                            sheetLine: line ?? sheetLine,
                            dealQuotingForm: deal.quotingForm,
                            dealQuotingLine: deal.quotingLine ?? quotingForm?.shopLine ?? null,
                            dealLineOfBusiness: deal.lineOfBusiness,
                          });
                        return [
                          id,
                          sheetFormForProduct(id, fromSheet) ?? dealProductDef(id).quotingForm,
                        ];
                      }),
                    )}
                    complete={Object.fromEntries(
                      dealProducts.map((id) => [
                        id,
                        Boolean(quoteCompletenessByProduct[id]?.complete),
                      ]),
                    )}
                    progress={Object.fromEntries(
                      dealProducts.map((id) => {
                        const gap = quoteCompletenessByProduct[id];
                        const fromFields = productSectionProgress(id, dealValues);
                        return [
                          id,
                          gap?.complete
                            ? { ...fromFields, complete: true, pct: 100 }
                            : { ...fromFields, complete: false, pct: 0 },
                        ];
                      }),
                    )}
                  />
                </>
              ) : null
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
            <div
              className={ACTIVITY_RAIL_ASIDE_CLASS}
              data-ff-deal-right-rail=""
              data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
            >
              <div className="min-w-0 w-full max-w-full" data-ff-deal-quick-comms="">
                <QuickCommsBoard
                  items={comms}
                  dealId={deal.id}
                  leadId={deal.leadId}
                  contactId={deal.contactId}
                  accountId={deal.accountId}
                  contactName={partyName}
                  contactPhone={contact?.phone ?? lead?.phone}
                  contactEmail={resolvePartyEmail({ contact, lead, account, dealStored: dealValues })}
                  officeAddress={officeAddress}
                  clientAddress={clientAddress}
                  initialKind={parseQuickCommsKind(qc)}
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
            </div>
          }
          tabs={AGENT_DEAL_TABS.map((id) => ({
            id,
            label: AGENT_DEAL_TAB_LABELS[id],
            complete: flowCompletion.isComplete(id),
            content: (
                  <div>
                    {id === "details" ? (
                      <DealDetailsPanel
                        key={`${deal.id}:${activeProduct}:${lineForm}`}
                        dealId={deal.id}
                        line={activeLob}
                        layout={dealLayout ?? defaultLayoutForModule("deals")}
                        fields={dealFields.length ? dealFields : resolveLayoutFields(dealLayout ?? defaultLayoutForModule("deals"), dealFields)}
                        values={{
                          ...mergeDealSystemValues(deal, lead, dealValues, dealFields),
                          ...(deal.accountKind === "commercial" && !dealValues.business_name
                            ? { business_name: deal.primaryNamedInsured ?? "" }
                            : {}),
                        }}
                        pipelineFamily={familyForProducts(dealProducts)}
                        quotingForm={lineForm}
                        policySubType={lineQuotingForm?.label ?? deal.policySubType}
                        packageLines={packageLines}
                        activePackageLine={activePackageLine}
                        activeProduct={activeProduct}
                        accountKind={deal.accountKind}
                        dealProducts={dealProducts}
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
                        insuredPropertyKind={dealValues.insured_property_kind ?? null}
                        needsReapprove={needsVisualReapprove}
                        hasRequestedQuotes={hasRequestedQuotes}
                        productId={activeProduct}
                        quotingForm={titleForm}
                        sheetQuotingForm={
                          quotingFormIsManufacturedHome(
                            lineForm,
                            deal.quotingForm,
                            deal.policySubType,
                            titleForm,
                            activeSheet.values.quoting_form?.value,
                          )
                            ? "MHO"
                            : lineForm
                        }
                        docSlot={docSlot}
                        marketsDone={flowCompletion.isComplete("markets")}
                        quotesDone={flowCompletion.isComplete("quotes")}
                        packageProducts={docSlotProducts}
                        healthSherpa={{
                          medicareReady: Boolean(hsMedicare.configured),
                          acaReady: Boolean(hsAca.configured),
                        }}
                      />
                    ) : id === "markets" ? (
                      <div className="space-y-3">
                        {sheetLine === "life" ? (
                          <LifeAppetiteHelper
                            selectedLabels={lifeAppetite.selectedLabels}
                            tobaccoStatus={activeSheet.values.tobacco_status?.value ?? null}
                            predictions={lifeAppetite.predictions}
                            coverageNote={lifeAppetite.coverageNote}
                            build={lifeAppetite.build}
                            ageYears={lifeAppetite.ageYears}
                            thin={lifeAppetite.thin}
                            requestedProductType={lifeAppetite.requestedProductType}
                          />
                        ) : sheetLine === "health" ? (
                          <HealthMarketsEmpty
                            usingHealthSherpa={isUsingHealthSherpa(activeSheet.values.using_healthsherpa?.value)}
                          />
                        ) : (
                      <MarketsPanel
                        key={sheetReady || agentMarketsAction ? `markets-${activeSheet.id}` : "markets-empty"}
                        dealId={deal.id}
                        matches={matches}
                        unlocked={unlocked}
                        manualIds={manualIds}
                        shopListIds={shopListIds}
                        explicitLookup={shopMarketsAction}
                        sheetHasValues={sheetReady}
                        carriers={carrierOptions}
                        dealLine={activeLob}
                        shopLine={sheetLine}
                        product={activeProduct}
                        lastRequestCarrierIds={requestScopeForLine(shopFlow, sheetLine)}
                        outsideOverride={Boolean(activeProductState.outsideOverride)}
                        outsideOverrideDetail={activeProductState.outsideOverride ?? null}
                      />
                        )}
                      </div>
                    ) : lifeHealthLine ? (
                      <LifeHealthQuotesPanel
                        dealId={deal.id}
                        quotes={lineQuotes}
                        logs={logs}
                        quoteNotes={quoteNotes}
                        canLogGap={session.isAdmin || session.isDeveloper}
                        formId={lineQuotingForm?.id ?? lineForm ?? masterFormLabel}
                        shopLine={sheetLine}
                        docs={docs}
                        fileVersions={fileVersions}
                        carriers={allCarrierOptions}
                        dealLine={activeLob}
                        product={activeProduct}
                        productStage={displayProductStage({
                          stage: activeProductState.stage,
                          selectedQuoteIds: activeProductState.selectedQuoteIds,
                          fallback: stageView.slug,
                          liveQuoteIds,
                          outsideOverride: activeProductState.outsideOverride,
                        })}
                        boundQuoteId={boundQuoteId}
                        selectedQuoteIds={activeProductState.selectedQuoteIds}
                        mintStatus={activeProductState.mintStatus}
                        issuedPolicy={(() => {
                          const linked =
                            boundPolicies.find((row) => row.id === activeProductState.policyId) ??
                            boundPolicies.find((row) => row.sourceProduct === activeProduct);
                          if (!linked) return null;
                          return {
                            id: linked.id,
                            policyNumber: linked.policyNumber,
                            mintStatus: activeProductState.mintStatus,
                            published: Boolean(linked.publishedAt),
                          };
                        })()}
                        autoIssue={issue === "1"}
                        healthSherpaEnrollment={
                          sheetLine === "health" && hsEnrollment
                            ? {
                                confirmationNumber: hsEnrollment.confirmationNumber,
                                event: hsEnrollment.event,
                                product: hsEnrollment.product,
                                policyId: hsEnrollment.policyId,
                              }
                            : null
                        }
                      />
                    ) : (
                      <QuotesPanel
                        dealId={deal.id}
                        quotes={lineQuotes}
                        logs={logs}
                        quoteNotes={quoteNotes}
                        canLogGap={session.isAdmin || session.isDeveloper}
                        quoteResultsNote={deal.quoteResultsNote}
                        formId={lineQuotingForm?.id ?? lineForm ?? masterFormLabel}
                        shopLine={sheetLine}
                        currentQuoteRunId={shopFlow.quoteRuns?.[sheetLine] ?? null}
                        multiLine={dealProducts.length > 1}
                        isPrimaryLine={dealProducts[0] === activeProduct}
                        completeness={
                          quoteCompletenessByProduct[activeProduct] ?? activeQuoteCompleteness
                        }
                        boundQuoteId={boundQuoteId}
                        productStage={displayProductStage({
                          stage: activeProductState.stage,
                          selectedQuoteIds: activeProductState.selectedQuoteIds,
                          fallback: stageView.slug,
                          liveQuoteIds,
                          outsideOverride: activeProductState.outsideOverride,
                        })}
                        confirmLogs={allQuoteLogs.map((row) => ({
                          carrierId: row.log.carrierId,
                          why: row.log.why,
                        }))}
                        requestedCoverageA={deal.coverageAmount ?? null}
                        docs={docs}
                        fileVersions={fileVersions}
                        carriers={carrierOptions}
                        dealLine={activeLob}
                        product={activeProduct}
                        selectedQuoteIds={activeProductState.selectedQuoteIds}
                        outsideOverride={Boolean(activeProductState.outsideOverride)}
                        outsideOverrideDetail={activeProductState.outsideOverride ?? null}
                        pipelineSlug={stageView.pipelineSlug}
                        sheetStale={sheetStale}
                        splitHomeProducts={splitHome}
                        quoteRuns={shopFlow.quoteRuns}
                        preScoped
                        mintStatus={activeProductState.mintStatus}
                        issuedPolicy={(() => {
                          const linked =
                            boundPolicies.find((row) => row.id === activeProductState.policyId) ??
                            boundPolicies.find((row) => row.sourceProduct === activeProduct);
                          if (!linked) return null;
                          return {
                            id: linked.id,
                            policyNumber: linked.policyNumber,
                            mintStatus: activeProductState.mintStatus,
                            published: Boolean(linked.publishedAt),
                          };
                        })()}
                        autoIssue={issue === "1"}
                      />
                    )}
                  </div>
            ),
          }))}
        />
        </div>
      )}
    </AppShell>
  );
}
