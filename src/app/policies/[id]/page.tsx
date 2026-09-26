import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { formatDay, formatMoney, DEFAULT_TENANT_ID, SERVICING_DOC_LABELS } from "@/lib/domain";
import { getLatestInDeskEnvelope, getPolicyWorkspace, listDocumentAccessLogsForPolicy, listRecordActivities } from "@/lib/db/queries";
import { resolvePolicyProducerName } from "@/lib/activity/producer";
import {
  loadPolicyServicing,
  listPolicyInstallments,
  listServiceTimeline,
} from "@/lib/ams/queries";
import { listClaimsForPolicy } from "@/lib/db/claim-queries";
import { currentDeskSession } from "@/lib/auth/session";
import { PolicyOutcomeBanner } from "@/components/policy/change-desk";
import { PolicyStatusDot } from "@/components/policy/policy-status-dot";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";
import { PolicyOverflowMenu } from "@/components/policy/policy-overflow-menu";
import { RecordListPager } from "@/components/records/record-list-pager";
import { PolicyBreadcrumb } from "@/components/policy/policy-breadcrumb";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { loadRecordContext } from "@/lib/record-context";
import { parseMoney, premiumChange } from "@/lib/renewal/compare";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { PolicyDetailWorkspace } from "@/components/policy/policy-detail-workspace";
import { PolicyTabsNav } from "@/components/policy/policy-tabs";
import { PolicyCareStrip } from "@/components/policy/policy-care-strip";
import { buildPolicyCareItems, policyTabCareCounts } from "@/lib/policy/care-strip";
import { isRenewalHandledStageValue } from "@/lib/renewal/handled";
import { deskNow } from "@/lib/home/as-of";
import {
  bandIsOffBook,
  deskTermBandLabel,
  matchingCurrentTerm,
  normalizeNamedInsured,
  resolveCurrentTerm,
} from "@/lib/policies/current-term";
import { PolicyOverviewTab } from "@/components/policy/tabs/overview-tab";
import { pickPolicyDecDocument } from "@/lib/policy/fill-from-dec";
import { PolicyCoverageTab } from "@/components/policy/tabs/coverage-tab";
import { PolicyEndorsementsTab } from "@/components/policy/tabs/endorsements-tab";
import { PolicyBillingTab } from "@/components/policy/tabs/billing-tab";
import { PolicyDocumentsTab } from "@/components/policy/tabs/documents-tab";
import { blobStoreReady } from "@/lib/files/object-store";
import { quoteFileUploadMode } from "@/lib/files/upload-plan";
import { PolicyActivityTab } from "@/components/policy/tabs/activity-tab";
import { PolicyClaimsTab } from "@/components/policy/tabs/claims-tab";
import { PolicyAgencyTab } from "@/components/policy/tabs/agency-tab";
import { parseAgentPolicyTab, policyTabsForViewer } from "@/lib/policy/tabs";
import { parseMintPayload, policyNeedsMintConfirm } from "@/lib/policy/mint-gate";
import { notifyAdminUnpublishedMint } from "@/app/actions/policy-mint";
import { FromDealStrip } from "@/components/policy/from-deal-strip";
import { MintConfirmQueue } from "@/components/policy/mint-confirm-queue";
import { IdCardsPrompt } from "@/components/policy/id-cards-prompt";
import { hasServicingDoc } from "@/lib/ams/checklist";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { homeAddressFromRecords, officeMeetingAddress } from "@/lib/meetings/types";
import { buildPolicyLabel } from "@/lib/policy/auto-label";
import { getAgencyPolicyLabelTemplate } from "@/lib/policy/auto-label-prefs";
import { getRenewalQueueForPolicy } from "@/lib/ams/queries";
import { getAgentPolicyAccess } from "@/lib/policy/agent-policy-access-prefs";
import { resolvePolicyViewerAccess } from "@/lib/policy/agent-policy-access";
import { listDealInspectionDocuments } from "@/lib/documents/deal-inspection-docs";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";

export const dynamic = "force-dynamic";
/** Fill from declaration reads a DEC with Gemini. Same ceiling as the deal Fill page. */
export const maxDuration = 300;

export default async function PolicyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();
  const inspectionDealId =
    resolveLobOverviewFamily(workspace.policy) === "homeowners"
      ? (workspace.deal?.id ?? workspace.policy.dealId)
      : null;
  const [
    servicing,
    policyClaims,
    session,
    envelope,
    serviceTimeline,
    installments,
    tagExtra,
    agencyRow,
    comms,
    renewalQueueRow,
    accessLogRows,
    producerDisplayName,
    agentAccessPref,
    inspectionDocs,
  ] = await Promise.all([
    loadPolicyServicing(id),
    listClaimsForPolicy(id),
    currentDeskSession(),
    getLatestInDeskEnvelope({ policyId: id }),
    listServiceTimeline(id),
    listPolicyInstallments(id),
    listModuleTags("policies").catch(() => [] as { name: string; color: string | null }[]),
    db
      .select({
        agencyName: agencySettings.agencyName,
        officeAddress: agencySettings.officeAddress,
      })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1)
      .then((rows) => rows[0] ?? null)
      .catch(() => null),
    listRecordActivities({ policyId: id }),
    getRenewalQueueForPolicy(id).catch(() => null),
    listDocumentAccessLogsForPolicy(id).catch(() => []),
    resolvePolicyProducerName(id),
    getAgentPolicyAccess(),
    inspectionDealId ? listDealInspectionDocuments(inspectionDealId) : Promise.resolve([]),
  ]);
  const {
    policy,
    contact,
    account,
    carrier,
    deal,
    files,
    filingAttachments,
    timeline,
    vehicles,
    changeLogs,
    terms,
    location,
    risk,
    quoteSheet,
    overviewSheet,
    fileVersions,
  } = workspace;
  const error = typeof query.error === "string" ? query.error : undefined;
  const filed = typeof query.filed === "string" ? query.filed : undefined;
  const notice = typeof query.notice === "string" ? query.notice : filed;
  const tabParam = typeof query.tab === "string" ? query.tab : undefined;
  const presetDocType = typeof query.docType === "string" ? query.docType : undefined;
  const partyNameRaw = contact
    ? `${contact.firstName} ${contact.lastName}`
    : account?.name ?? policy.policyNumber;
  const partyName = contact ? (normalizeNamedInsured(partyNameRaw) ?? partyNameRaw) : partyNameRaw;
  const printedInsurer = policy.coverageLimits?.insurer_name?.trim() || null;
  const overviewCarrier = carrier?.name?.trim() || printedInsurer;
  const asOf = deskNow();
  const termView = resolveCurrentTerm(
    {
      status: policy.status,
      lineOfBusiness: policy.lineOfBusiness,
      policyNumber: policy.policyNumber,
      carrierName: carrier?.name,
      namedInsured: partyNameRaw,
      effectiveDate: policy.effectiveDate,
      expirationDate: policy.expirationDate,
      renewalDate: policy.renewalDate,
      premium: policy.premium,
      sourceDocumentId: policy.sourceDocumentId,
      terms: terms.map((term) => ({
        id: term.id,
        role: term.role,
        effective: term.termEffective,
        expiration: term.termExpiration,
        premium: term.premium,
        source: term.source,
      })),
    },
    asOf,
  );
  const currentTermRow = matchingCurrentTerm(terms, termView);
  const isAuto = policy.lineOfBusiness.toUpperCase() === "AUTO";
  const context = await loadRecordContext({
    contactId: contact?.id,
    accountId: account?.id,
    dealId: deal?.id,
    policyId: policy.id,
  });
  const currentPremium = parseMoney(termView.current?.premium ?? policy.premium);
  const proposedPremium = parseMoney(termView.upcoming?.premium);
  const change =
    currentPremium != null && proposedPremium != null
      ? premiumChange(currentPremium, proposedPremium)
      : null;

  const claimRowsFromServicing = (servicing?.claims ?? []).map(({ claim }) => claim);
  const claimRowsFromList = policyClaims.map((row) => row.claim);
  const claimById = new Map<string, (typeof claimRowsFromList)[number]>();
  for (const claim of [...claimRowsFromList, ...claimRowsFromServicing]) {
    claimById.set(claim.id, claim);
  }
  const claims = [...claimById.values()];
  const hasClaims = claims.length > 0;
  const isAdmin = Boolean(session.isAdmin);
  const viewer = resolvePolicyViewerAccess(isAdmin, agentAccessPref);
  const showAgencyTab =
    viewer.lifecycleActions.read ||
    viewer.lifecycleActions.write ||
    viewer.commissionBreakdown.read;
  const viewerTabs = policyTabsForViewer({ hasClaims, isAdmin, showAgencyTab });
  const activeTab = parseAgentPolicyTab(tabParam, { hasClaims, isAdmin, showAgencyTab });
  const openClaims = claims.filter((claim) => {
    const status = (claim.status ?? "").toLowerCase();
    return status !== "closed" && status !== "denied" && status !== "withdrawn";
  }).length;
  const pendingEndorsements = (servicing?.drafts ?? []).filter((draft) => {
    const status = (draft.status ?? "").toLowerCase();
    return status !== "withdrawn" && status !== "filed" && status !== "issued";
  }).length;
  const missingPackets = servicing?.missingPackets ?? [];
  const renewalHandled = isRenewalHandledStageValue(renewalQueueRow?.stage);
  const careItems = buildPolicyCareItems({
    expirationDate: termView.bookExpiration ?? policy.expirationDate,
    updatedAt: policy.updatedAt,
    status: bandIsOffBook(termView.band) ? "expired" : policy.status,
    missingDocs: missingPackets.length,
    missingDocNames: missingPackets.map((key) => SERVICING_DOC_LABELS[key]),
    pendingEndorsements,
    openClaims,
    asOf,
    renewalHandled,
  });
  const tabCareCounts = policyTabCareCounts(careItems);

  const officeAddress = officeMeetingAddress({
    agencyName: agencyRow?.agencyName,
    officeAddress: agencyRow?.officeAddress,
  });
  const clientAddress = homeAddressFromRecords({
    risk: risk ?? null,
    contact: contact ?? null,
  });

  const labelTemplate = await getAgencyPolicyLabelTemplate();
  const autoLabel = buildPolicyLabel(labelTemplate, {
    ownerName: partyName,
    carrier: carrier?.name,
    policyType: policy.policyType,
    policyNumber: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
    formType: policy.formType,
    policySubType: policy.policySubType,
    status: policy.status,
    effectiveDate: policy.effectiveDate,
    expirationDate: policy.expirationDate,
  });
  const labelOverride = policy.labelOverride?.trim() || null;
  const displayName = labelOverride || autoLabel;

  const versionCountByDoc = new Map<string, number>();
  for (const ver of fileVersions ?? []) {
    versionCountByDoc.set(ver.documentId, (versionCountByDoc.get(ver.documentId) ?? 0) + 1);
  }
  const filesWithVersions = files.map((file) => ({
    ...file,
    versionCount: Math.max(1, versionCountByDoc.get(file.id) ?? 1),
  }));
  const declarationFile = pickPolicyDecDocument(files, {
    sourceDocumentId: policy.sourceDocumentId,
  });
  const declaration = declarationFile
    ? {
        id: declarationFile.id,
        filename: declarationFile.filename?.trim() || "Declaration",
        mimeType: declarationFile.mimeType,
      }
    : null;
  const accessLog = (accessLogRows ?? []).map((row) => {
    const file = files.find((f) => f.id === row.documentId);
    return {
      id: row.id,
      actorName: row.actorName,
      action: row.action,
      createdAt: row.createdAt,
      filename: file?.filename ?? null,
    };
  });

  const mintPayload = parseMintPayload(policy.mintPayload);
  const agentConfirm = mintPayload?.agentConfirm ?? null;
  if (policyNeedsMintConfirm(policy)) {
    await notifyAdminUnpublishedMint(policy.id).catch(() => null);
  }

  return (
    <AppShell title="Policies">
      <div className="mb-3 space-y-1" data-ff-policy-header-bar="">
        <PolicyBreadcrumb />
        <div className="flex flex-wrap items-start gap-2">
          <div className="mt-2 shrink-0">
            <PolicyStatusDot status={policy.status} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="text-xl font-semibold text-navy">{displayName}</h2>
                <PolicyQuickActions
                  policyId={policy.id}
                  phone={contact?.phone ?? account?.phone ?? null}
                  email={contact?.email ?? account?.email ?? null}
                  contactId={contact?.id ?? policy.contactId}
                  accountId={account?.id ?? policy.accountId}
                />
              </div>
              <RecordListPager module="policies" recordId={policy.id} />
            </div>
            {labelOverride ? (
              <span
                className="inline-flex items-center gap-2 text-[11px] text-muted-foreground"
                data-ff-policy-label-readonly=""
                title="Manual display name. Rename was removed from this page — manage in Settings → Policy labels."
              >
                <span className="rounded-sm bg-muted px-1.5 py-0.5 font-semibold uppercase">
                  Manual name
                </span>
                <span className="hidden sm:inline">Auto-label: {autoLabel}</span>
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground" data-ff-policy-label-readonly="">
                Auto-label
              </span>
            )}
            <div className="max-w-xl" data-ff-policy-header-tags="">
              <AssignRecordTags
                module="policies"
                recordId={policy.id}
                tags={policy.tags}
                catalog={tagExtra.map((row) => ({ name: row.name, color: row.color }))}
                appearance="addLink"
              />
            </div>
          </div>
        </div>
      </div>

      <PolicyCareStrip policyId={policy.id} items={careItems} />

      <PolicyOutcomeBanner filed={filed} error={error} policy={policy} />

      {policy.mintPayload || policy.sourceProduct || policy.sourceDocumentId ? (
        <div className="mb-3">
          <FromDealStrip
            dealId={deal?.id ?? policy.dealId}
            dealTitle={deal?.title}
            decFilename={mintPayload?.decFilename}
            reconciled={Boolean(policy.sourceDocumentId || parseMintPayload(policy.mintPayload)?.decDocumentId)}
          />
        </div>
      ) : null}

      {policyNeedsMintConfirm(policy) ? (
        <>

          <MintConfirmQueue
            policyId={policy.id}
            fields={mintPayload?.fields ?? []}
          />
        </>
      ) : agentConfirm?.confirmedAt ? (
        <p className="mb-3 text-sm text-navy" data-ff-policy-looks-good-audit="">
          Policy looks good · {agentConfirm.name} · {agentConfirm.confirmedAtEt}
        </p>
      ) : null}

      {agentConfirm?.confirmedAt &&
      !mintPayload?.idCardsPrompt?.dismissed &&
      !hasServicingDoc(files, "id_card") ? (
        <IdCardsPrompt policyId={policy.id} dealId={policy.dealId} open />
      ) : null}

      <PolicyDetailWorkspace
        nav={
          <PolicyTabsNav
            policyId={policy.id}
            active={activeTab}
            tabs={viewerTabs}
            counts={tabCareCounts}
            endSlot={
              <PolicyOverflowMenu
                policyId={policy.id}
                contactId={contact?.id}
                isAdmin={isAdmin}
              />
            }
          />
        }
        rail={
          <>
            <div className="min-w-0 w-full max-w-full" data-ff-policy-quick-comms="">
              <QuickCommsBoard
                items={comms}
                policyId={policy.id}
                contactId={contact?.id}
                accountId={account?.id}
                dealId={deal?.id}
                contactName={partyName}
                contactPhone={contact?.phone}
                contactEmail={contact?.email}
                officeAddress={officeAddress}
                clientAddress={clientAddress}
              />
            </div>
            <RecordContextRail
              context={context}
              defaultTab="info"
              policyFacts={{
                number: policy.policyNumber,
                status: deskTermBandLabel(termView.band, policy.status),
                carrier: overviewCarrier ?? "Carrier TBD",
                effective: formatDay(termView.bookEffective ?? policy.effectiveDate),
                expiration: formatDay(termView.bookExpiration ?? policy.expirationDate),
                premium: formatMoney(termView.current?.premium ?? policy.premium),
              }}
            />
          </>
        }
      >
        {activeTab === "overview" ? (
          <PolicyOverviewTab
            policy={policy}
            declaration={declaration}
            carrierId={carrier?.id ?? policy.carrierId}
            carrierName={overviewCarrier}
            contact={contact}
            account={account}
            deal={deal}
            sheet={
              (overviewSheet ??
                quoteSheet?.values ??
                null) as Record<string, { value?: string | null } | undefined> | null
            }
            vehicles={vehicles}
            isAuto={isAuto}
            terms={terms}
            change={change}
            checklist={servicing?.checklist ?? null}
            packetByKey={servicing?.packetByKey ?? {}}
            missingPackets={servicing?.missingPackets ?? []}
            packetOnFile={servicing?.packetOnFile ?? {}}
            interests={servicing?.interests ?? []}
            risk={risk}
            producerDisplayName={producerDisplayName}
            readOnly={!isAdmin}
            showCommission={viewer.commissionBreakdown.read}
            termView={termView}
            renewalHandled={renewalHandled}
            clientStayingMarkedAt={renewalHandled ? renewalQueueRow?.updatedAt : null}
            inspectionDocs={inspectionDocs}
          />
        ) : null}

        {activeTab === "coverage" ? (
          <PolicyCoverageTab
            policy={policy}
            terms={terms}
            currentTerm={currentTermRow}
            interests={servicing?.interests ?? []}
            contactId={contact?.id}
            accountId={account?.id}
            readOnly={!isAdmin}
            vehicles={vehicles}
          />
        ) : null}

        {activeTab === "endorsements" ? (
          <PolicyEndorsementsTab
            policyId={policy.id}
            drafts={servicing?.drafts ?? []}
            changeLogs={changeLogs}
          />
        ) : null}

        {activeTab === "billing" ? (
          <PolicyBillingTab
            policyId={policy.id}
            policy={{
              ...policy,
              paymentMethod:
                parseMintPayload(policy.mintPayload)?.fields.find((row) => row.key === "payment_method")
                  ?.value ?? null,
            }}
            installments={installments.map(({ installment }) => installment)}
            showCommission={viewer.commissionBreakdown.read}
          />
        ) : null}

        {activeTab === "documents" ? (
          <PolicyDocumentsTab
            policy={policy}
            files={filesWithVersions}
            filingAttachments={filingAttachments}
            partyName={partyName}
            envelope={envelope}
            notice={notice}
            accessLog={accessLog}
            isAdmin={isAdmin}
            uploadMode={quoteFileUploadMode({
              vercel: process.env.VERCEL,
              blobReady: blobStoreReady(),
            })}
            presetDocType={presetDocType}
          />
        ) : null}

        {activeTab === "activity" ? (
          <PolicyActivityTab
            policyId={policy.id}
            contactId={contact?.id}
            accountId={account?.id}
            dealId={deal?.id}
            producerName={producerDisplayName}
            notices={servicing?.notices ?? []}
            serviceTimeline={serviceTimeline.map(({ log, activity }) => ({
              id: log.id,
              eventType: log.eventType,
              body: log.body,
              occurredAt: log.occurredAt,
              activityTitle: activity.title,
              producerName: log.producerName,
            }))}
            changeLogs={changeLogs}
            timeline={timeline}
            error={error}
            notice={notice}
          />
        ) : null}

        {activeTab === "claims" && hasClaims ? (
          <PolicyClaimsTab
            policyId={policy.id}
            contactId={contact?.id}
            claims={claims.map((claim) => ({
              id: claim.id,
              status: claim.status,
              causeType: claim.causeType ?? "other",
              description: claim.description,
              dateReported: claim.dateReported ?? claim.createdAt,
              dateOfLoss: claim.dateOfLoss,
              carrierClaimNumber: claim.carrierClaimNumber,
            }))}
          />
        ) : null}

        {activeTab === "agency" && (isAdmin || showAgencyTab) ? (
          <PolicyAgencyTab
            policy={policy}
            contactId={contact?.id}
            renewalStage={renewalQueueRow?.stage ?? null}
            error={error}
            notice={notice}
            showLifecycle={viewer.lifecycleActions.read || viewer.lifecycleActions.write}
            showCommission={viewer.commissionBreakdown.read}
            canWriteLifecycle={viewer.lifecycleActions.write}
          />
        ) : null}
      </PolicyDetailWorkspace>
    </AppShell>
  );
}
