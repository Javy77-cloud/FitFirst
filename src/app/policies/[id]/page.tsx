import { notFound } from "next/navigation";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import Link from "next/link";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { RecordModuleMacros } from "@/components/developer-hub/record-module-macros";
import { ChooseFiles } from "@/components/choose-files";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { deletePolicyFilingAttachment } from "@/app/actions/policies";
import { VehiclesList } from "@/components/desk-ams-panels";
import { RecordLink } from "@/components/record-links";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { formatDay, formatMoney } from "@/lib/domain";
import { getLatestInDeskEnvelope, getPolicyWorkspace } from "@/lib/db/queries";
import { loadPolicyServicing, listPolicyInspections, listPolicyInstallments, listServiceTimeline } from "@/lib/ams/queries";
import { AdditionalInterestPanel } from "@/components/ams/additional-interest-panel";
import { InspectionPanel } from "@/components/ams/inspection-panel";
import { InstallmentPanel } from "@/components/ams/installment-panel";
import { ServiceTimelinePanel } from "@/components/ams/service-timeline-panel";
import { LossRunPanel } from "@/components/ams/loss-run-panel";
import { PolicyClaimsPanel } from "@/components/ams/policy-claims-panel";
import { EndorsementDraftPanel } from "@/components/ams/endorsement-draft-panel";
import { NoticePanel } from "@/components/ams/notice-panel";
import { ServicingChecklistCard } from "@/components/ams/servicing-checklist";
import { ServiceRequestPanel } from "@/components/ams/service-request-panel";
import { SuspensePanel } from "@/components/ams/suspense-panel";
import { TermHistoryPanel } from "@/components/ams/term-history-panel";
import { InDeskEsignPanel } from "@/components/esign/in-desk-panel";
import { allowedInterestKinds, canHoldInterests, isPersonalLinesPolicy } from "@/lib/ams/additional-interests";
import { listClaimsForPolicy } from "@/lib/db/claim-queries";
import { currentDeskSession } from "@/lib/auth/session";
import { PolicyChangeTimeline } from "@/components/policy/policy-change-timeline";
import { PolicyInformationCard } from "@/components/policy/policy-information";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { PolicyChangeDesk, PolicyOutcomeBanner } from "@/components/policy/change-desk";
import { PolicyWorkPanel } from "@/components/work-queue/work-panel";
import { PremiumChangeSummary } from "@/components/policy/premium-change";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { loadRecordContext } from "@/lib/record-context";
import { parseMoney, premiumChange } from "@/lib/renewal/compare";
import { isInForceStatus } from "@/lib/policy/status";
import { RecordTags } from "@/components/tags/record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { colorsFromModuleTags } from "@/lib/tags/tag-colors";
import { suggestedTagsFor } from "@/lib/tags/module-tags";

export const dynamic = "force-dynamic";

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
  const [servicing, policyClaims, session, envelope, serviceTimeline, inspections, installments, tagExtra] = await Promise.all([
    loadPolicyServicing(id),
    listClaimsForPolicy(id),
    currentDeskSession(),
    getLatestInDeskEnvelope({ policyId: id }),
    listServiceTimeline(id),
    listPolicyInspections(id),
    listPolicyInstallments(id),
    listModuleTags("policies").catch(() => [] as { name: string; color: string | null }[]),
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
    work,
    location,
  } = workspace;
  const error = typeof query.error === "string" ? query.error : undefined;
  const filed = typeof query.filed === "string" ? query.filed : undefined;
  const notice = typeof query.notice === "string" ? query.notice : filed;
  const partyName = contact
    ? `${contact.firstName} ${contact.lastName}`
    : account?.name ?? policy.policyNumber;
  const isAuto = policy.lineOfBusiness.toUpperCase() === "AUTO";
  const context = await loadRecordContext({
    contactId: contact?.id,
    accountId: account?.id,
    dealId: deal?.id,
    policyId: policy.id,
  });
  const current = terms.find((term) => term.role === "current");
  const proposed = terms.find((term) => term.role === "proposed");
  const currentPremium = parseMoney(current?.premium ?? policy.premium);
  const proposedPremium = parseMoney(proposed?.premium);
  const change =
    currentPremium != null && proposedPremium != null
      ? premiumChange(currentPremium, proposedPremium)
      : null;

  return (
    <AppShell title={policy.policyNumber}>
      <div className="mb-3 flex justify-end">
        <EditLayoutLink module="policies" />
      </div>
      <RecordModuleMacros module="policies" recordId={policy.id} />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <PolicyStatusBadge status={policy.status} />
        <span>{policy.lineOfBusiness}</span>
        <span>{carrier?.name ?? "Carrier TBD"}</span>
        <span>{formatMoney(policy.premium)}</span>
        <span className="text-muted-foreground">
          {formatDay(policy.effectiveDate)} → {formatDay(policy.expirationDate)}
        </span>
        {policy.endedAt ? (
          <span className="text-fit-red">Ended {formatDay(policy.endedAt)}</span>
        ) : null}
      </div>
      <div className="mb-4 max-w-lg">
        <RecordTags
          module="policies"
          recordId={policy.id}
          tags={policy.tags}
          suggestions={suggestedTagsFor("policies", tagExtra.map((row) => row.name))}
          colors={colorsFromModuleTags(tagExtra)}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {contact ? (
          <RecordLink href={`/contacts/${contact.id}`}>
            Contact {contact.lastName}, {contact.firstName}
          </RecordLink>
        ) : null}
        {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
        {deal ? <RecordLink href={`/deals/${deal.id}`}>Deal {deal.title}</RecordLink> : null}
        <Link
          href={`/policies/${policy.id}/compare`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Compare renewal
        </Link>
        <Link href="/renewals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Renewal list
        </Link>
        <Link href="/book-health" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Book health
        </Link>
        <Link href="/suspense" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Suspense board
        </Link>
        <Link href="/notices" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Notices
        </Link>
        <Link href="/endorsements" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Endorsement drafts
        </Link>
        <Link href="/service-timeline" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Service timeline
        </Link>
        <Link href="/renewals/queue" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Renewal queue
        </Link>
        <Link href="/inspections" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Inspections
        </Link>
        <Link href="/installments" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Installments
        </Link>
        <Link
          href={`/claims/new?policy=${policy.id}${contact ? `&contact=${contact.id}` : ""}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Log FNOL
        </Link>
        <Link href="/work-queue" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Work queue
        </Link>
      </div>

      <PolicyOutcomeBanner filed={filed} error={error} policy={policy} />

      {change && isInForceStatus(policy.status) ? (
        <div className="mb-4">
          <PremiumChangeSummary change={change} />
        </div>
      ) : null}

      <RecordDetailLayout
        main={
          <div className="space-y-4">
      <PolicyInformationCard
        policy={policy}
        carrierName={carrier?.name}
        contact={contact}
        account={account}
        locationLabel={location?.label ?? location?.address1 ?? location?.street ?? null}
      />
      <NoticePanel policyId={policy.id} notices={servicing?.notices ?? []} error={error} />
      <EndorsementDraftPanel
        policyId={policy.id}
        drafts={servicing?.drafts ?? []}
        requests={servicing?.requests ?? []}
        error={error}
      />
      <InspectionPanel
        policyId={policy.id}
        inspections={inspections.map(({ inspection }) => inspection)}
        error={error}
      />
      <InstallmentPanel
        policyId={policy.id}
        installments={installments.map(({ installment }) => installment)}
        error={error}
      />
      <ServiceTimelinePanel
        policyId={policy.id}
        items={serviceTimeline.map(({ log, activity }) => ({
          id: log.id,
          eventType: log.eventType,
          body: log.body,
          occurredAt: log.occurredAt,
          activityTitle: activity.title,
        }))}
        error={error}
        notice={notice}
      />
            {isAuto ? <VehiclesList vehicles={vehicles} /> : null}

            {servicing ? (
              <ServicingChecklistCard
                checklist={servicing.checklist}
                policyId={policy.id}
                packetByKey={servicing.packetByKey}
                missingPackets={servicing.missingPackets}
              />
            ) : null}
            {servicing ? <SuspensePanel packetTasks={servicing.packetTasks} policyId={policy.id} /> : null}
            {canHoldInterests(policy) ? (
              <AdditionalInterestPanel
                policyId={policy.id}
                interests={servicing?.interests ?? []}
                kinds={allowedInterestKinds(policy)}
                variant={isPersonalLinesPolicy(policy) ? "personal" : "commercial"}
              />
            ) : null}
            <TermHistoryPanel policyId={policy.id} terms={terms} />
            <LossRunPanel policyId={policy.id} claims={policyClaims.map((row) => row.claim)} />
            <ServiceRequestPanel
              policyId={policy.id}
              status={policy.status}
              coverageA={policy.coverageA}
              premium={policy.premium}
              requests={servicing?.requests ?? []}
              events={servicing?.events ?? []}
              error={error}
              notice={notice}
            />
            <PolicyClaimsPanel
              policyId={policy.id}
              contactId={contact?.id}
              policyNumber={policy.policyNumber}
              partyName={
                contact
                  ? `${contact.lastName}, ${contact.firstName}`
                  : account?.name ?? "Insured"
              }
              postedBy={session.name || "Javy"}
              claims={(servicing?.claims ?? []).map(({ claim, contact: claimContact }) => ({
                id: claim.id,
                status: claim.status,
                causeType: claim.causeType ?? "other",
                description: claim.description,
                reportedHow: claim.reportedHow ?? "phone",
                dateReported: claim.dateReported ?? claim.createdAt,
                dateOfLoss: claim.dateOfLoss,
                carrierClaimNumber: claim.carrierClaimNumber,
                policyId: claim.policyId,
                policyNumber: policy.policyNumber,
                contactId: claim.contactId,
                contactName: claimContact
                  ? `${claimContact.lastName}, ${claimContact.firstName}`
                  : null,
              }))}
              activity={servicing?.claimActivity ?? []}
            />

            <PolicyChangeDesk
              policyId={policy.id}
              coverageA={policy.coverageA}
              premium={policy.premium}
              status={policy.status}
            />

            <PolicyWorkPanel
              policyId={policy.id}
              actorId={session.userId ?? undefined}
              users={work.users}
              assigneeId={work.item?.assigneeId ?? null}
              workStatus={work.item?.workStatus ?? null}
              flags={work.flags}
              notes={work.notes}
              reminders={work.reminders}
            />

            <section className="ff-card p-4">
              <h2 className="text-base font-semibold text-navy">Issued policy files</h2>
              <p className="mt-1 text-base text-muted-foreground">
                Dec / complete / ID after bind. Shopping docs (source dec, wind mit, quote PDFs) stay
                on the deal.
              </p>
              <form action={uploadDealSlot} className="my-3 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
                <input type="hidden" name="policyId" value={policy.id} />
                <input type="hidden" name="dealId" value={policy.dealId ?? ""} />
                <input type="hidden" name="slot" value="policy_file" />
                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    name="docType"
                    className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                    defaultValue="policy_dec"
                  >
                    <option value="policy_dec">Issued dec</option>
                    <option value="policy_complete">Complete policy</option>
                    <option value="policy_id">ID card</option>
                    <option value="aor">AOR packet</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">File</Label>
                  <ChooseFiles name="file" required className="mt-1" />
                </div>
                <Button type="submit" size="sm">
                  Attach issued file
                </Button>
              </form>
              {files.length === 0 ? (
                <p className="text-base text-muted-foreground">No issued policy files yet.</p>
              ) : (
                <table className="ff-table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Type</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id}>
                        <td className="font-medium">
                          <FileActionMenu
                            documentId={file.id}
                            filename={file.filename}
                            slot={file.slot}
                            docType={file.docType}
                            dealId={policy.dealId}
                            policyId={policy.id}
                          >
                            {file.filename}
                          </FileActionMenu>
                        </td>
                        <td className="uppercase">{file.docType.replaceAll("_", " ")}</td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filingAttachments.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-navy">Change / notice files</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {filingAttachments.map((file) => (
                      <li key={file.id} className="ff-file-row">
                        <span>
                          <span className="font-medium">{file.filename}</span>
                          <span className="ml-2 uppercase text-muted-foreground">
                            {file.docType.replaceAll("_", " ")}
                          </span>
                        </span>
                        <HardDeleteForm
                          action={deletePolicyFilingAttachment}
                          subject={`the file “${file.filename}”`}
                          className="inline"
                        >
                          <input type="hidden" name="policyId" value={policy.id} />
                          <input type="hidden" name="attachmentId" value={file.id} />
                          <FileDeleteIcon />
                        </HardDeleteForm>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <InDeskEsignPanel
              recordKind="policy"
              recordId={policy.id}
              riskId={policy.riskId}
              partyName={partyName}
              status={policy.esignStatus}
              requestedAt={policy.esignRequestedAt}
              signedAt={policy.esignSignedAt}
              signerName={policy.esignSignerName}
              docs={files}
              envelope={envelope}
              notice={notice}
            />
            <PolicyChangeTimeline logs={changeLogs} />
            <ActivityTimeline
              items={timeline}
              policyId={policy.id}
              contactId={contact?.id}
              accountId={account?.id}
              dealId={deal?.id}
            />
          </div>
        }
        rail={
          <RecordContextRail
            context={context}
            policyFacts={{
              number: policy.policyNumber,
              status: policy.status,
              carrier: carrier?.name ?? "Carrier TBD",
              effective: formatDay(policy.effectiveDate),
              expiration: formatDay(policy.expirationDate),
              premium: formatMoney(policy.premium),
            }}
          />
        }
      />
    </AppShell>
  );
}
