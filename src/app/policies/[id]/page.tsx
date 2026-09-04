import { notFound } from "next/navigation";
import Link from "next/link";
import { AccountClaimsPanel } from "@/components/claims/account-panel";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { VehiclesList } from "@/components/desk-ams-panels";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { dayInput } from "@/components/related-tables";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_TENANT_ID, formatMoney } from "@/lib/domain";
import { listClaimsForPolicy } from "@/lib/db/claim-queries";
import { getPolicyWorkspace, listEmailTemplates, sumCommissionsForPolicies } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { loadGlobalLists, labelsFor } from "@/lib/db/global-lists";
import { db } from "@/lib/db";
import { commissions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ClickToCall } from "@/components/click-to-call";
import { RelatedRollups } from "@/components/related-tables";
import { PolicyCommissionBlock } from "@/components/commissions/policy-commission-block";
import { PolicyFileAttach } from "@/components/policy/policy-file-attach";
import { PolicyChangeTimeline } from "@/components/policy/policy-change-timeline";
import { PolicyRecordForm } from "@/components/policy/policy-record-form";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { partyLabel, policyRecordName } from "@/lib/desk/policy-name";
import { firstFilled } from "@/lib/desk/copy-once";
import { isUuid } from "@/lib/ids";
import {
  INSURANCE_FAMILIES,
  insuranceFamilyFromPolicy,
  type InsuranceFamily,
} from "@/lib/desk/policy-family";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [workspace, templates, lineSettings, lists, claimRows] = await Promise.all([
    getPolicyWorkspace(id),
    listEmailTemplates(),
    loadDeskLineSettings(),
    loadGlobalLists(),
    listClaimsForPolicy(id),
  ]);
  if (!workspace) notFound();
  const { policy, contact, account, carrier, deal, files, fileVersions, changeLogs, timeline, vehicles } =
    workspace;
  const isAuto = policy.lineOfBusiness.toUpperCase() === "AUTO";
  const family = insuranceFamilyFromPolicy(policy);
  const party = partyLabel(contact, account);
  const displayName = policyRecordName({
    contactName: party || null,
    businessName: account?.name,
    subType: policy.policySubType,
    lineOfBusiness: policy.lineOfBusiness,
    formType: policy.policyType ?? policy.formType,
    carrierName: carrier?.name,
    effectiveDate: policy.effectiveDate,
  });
  const thisCommission = await sumCommissionsForPolicies([policy.id]);
  const [commission] = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.tenantId, DEFAULT_TENANT_ID), eq(commissions.policyId, policy.id)));

  const mailing = {
    address: firstFilled(contact?.mailingAddress, account?.mailingAddress),
    city: firstFilled(contact?.city, account?.city),
    state: firstFilled(contact?.state, account?.state),
    zip: firstFilled(contact?.zip, account?.zip),
  };
  const premises = {
    address: firstFilled(policy.premisesAddress, mailing.address),
    city: firstFilled(policy.premisesCity, mailing.city),
    state: firstFilled(policy.premisesState, mailing.state),
    zip: firstFilled(policy.premisesZip, mailing.zip),
  };

  const formLists = {
    types: Object.fromEntries(
      INSURANCE_FAMILIES.map((key) => [key, labelsFor(lists, "policy_type", key)]),
    ) as Record<InsuranceFamily, string[]>,
    subTypes: Object.fromEntries(
      INSURANCE_FAMILIES.map((key) => [key, labelsFor(lists, "policy_sub_type", key)]),
    ) as Record<InsuranceFamily, string[]>,
    terms: Object.fromEntries(
      INSURANCE_FAMILIES.map((key) => [key, labelsFor(lists, "policy_term", key)]),
    ) as Record<InsuranceFamily, string[]>,
  };

  return (
    <AppShell title={displayName}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <PolicyStatusBadge status={policy.status} />
        <span>{policy.policyNumber}</span>
        <span>{formatMoney(policy.premium)}</span>
        <span className="text-xs uppercase text-muted-foreground">{family}</span>
        <ClickToCall
          entityType="policy"
          entityId={policy.id}
          name={displayName}
          phone={contact?.phone ?? account?.phone}
        />
      </div>

      <RecordSection id="record" title="This policy" summary="Family fields, term, files, change history, auto timeline">
        <PolicyRecordForm
          policyId={policy.id}
          family={family}
          policyNumber={policy.policyNumber}
          status={policy.status}
          effectiveDate={dayInput(policy.effectiveDate)}
          expirationDate={dayInput(policy.expirationDate)}
          premium={policy.premium ?? ""}
          billingFrequency={policy.billingFrequency ?? "annual"}
          policySubType={policy.policySubType ?? ""}
          policyType={policy.policyType ?? policy.formType ?? ""}
          policyTerm={policy.policyTerm ?? ""}
          faceAmount={policy.faceAmount ?? ""}
          insuredCount={String(policy.insuredCount ?? 1)}
          oepStart={dayInput(policy.oepStart)}
          sellingAgency={policy.sellingAgency ?? ""}
          showSellingAgency={lineSettings.showSellingAgency}
          insuredSameAsMailing={policy.insuredSameAsMailing}
          premises={premises}
          mailing={mailing}
          partyName={party}
          carrierName={carrier?.name ?? ""}
          lists={formLists}
        />

        {isAuto ? <VehiclesList vehicles={vehicles} /> : null}

        <PolicyFileAttach
          policyId={policy.id}
          dealId={policy.dealId}
          files={files}
          versions={fileVersions}
        />

        <div className="mt-6">
          <PolicyChangeTimeline logs={changeLogs} />
        </div>

        <div className="mt-6">
          <ActivityTimeline
            items={timeline}
            policyId={policy.id}
            contactId={contact?.id}
            accountId={account?.id}
            dealId={deal?.id}
            phone={contact?.phone ?? account?.phone}
            email={contact?.email ?? account?.email}
            templates={templates}
            autoOnly
            heading="Auto activity"
          />
        </div>
      </RecordSection>

      <RecordSection id="commission" title="Commission" summary="Zoho math by Life / Health / P&C">
        <PolicyCommissionBlock
          values={{
            policyId: policy.id,
            commissionId: commission?.id ?? null,
            producerStatus: commission?.status ?? null,
            insuranceType: family,
            policyType: policy.policyType ?? policy.formType ?? "",
            policySubType: policy.policySubType ?? "",
            sellingAgency: policy.sellingAgency ?? "",
            gwp: policy.premium ?? "",
            commission4: policy.commission4Pct ?? "",
            premiumFrequency: policy.billingFrequency ?? "Annual",
            numberOfInsured: String(policy.insuredCount ?? 1),
            paymentStatus: commission?.status === "paid" ? "Paid" : "Outstanding",
            paymentReferenceBatch: "",
            dueDate: commission?.dueDate ? dayInput(commission.dueDate) : "",
            paidDate: commission?.paidDate ? dayInput(commission.paidDate) : "",
            bookPremium: policy.premium ?? "",
          }}
          showSellingAgency={lineSettings.showSellingAgency}
        />
      </RecordSection>

      <RecordSection id="claims" title="Claims" summary="FNOL desk log on this Policy + Contact">
        <AccountClaimsPanel
          contactName={party || displayName}
          contactId={contact?.id}
          policyId={policy.id}
          rows={claimRows.map(({ claim, policy: linkedPolicy, contact: linkedContact }) => ({
            id: claim.id,
            status: claim.status,
            causeType: claim.causeType ?? "other",
            description: claim.description,
            reportedHow: claim.reportedHow ?? "phone",
            dateReported: claim.dateReported ?? claim.createdAt,
            dateOfLoss: claim.dateOfLoss,
            carrierClaimNumber: claim.carrierClaimNumber,
            policyId: claim.policyId ?? linkedPolicy?.id ?? policy.id,
            policyNumber: linkedPolicy?.policyNumber ?? policy.policyNumber,
            contactId: claim.contactId ?? linkedContact?.id ?? contact?.id ?? null,
            contactName: linkedContact
              ? `${linkedContact.lastName}, ${linkedContact.firstName}`
              : party || null,
          }))}
        />
      </RecordSection>

      <RecordSection id="related" title="Related" summary="Insured, deal, carrier, this policy rollup">
        <RelatedRollups premium={Number(policy.premium ?? 0)} commission={thisCommission} />
        <div className="flex flex-wrap gap-3 text-sm">
          {contact ? (
            <RecordLink href={`/contacts/${contact.id}`}>
              Insured {contact.lastName}, {contact.firstName}
            </RecordLink>
          ) : null}
          {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
          {deal ? <RecordLink href={`/deals/${deal.id}`}>Deal {deal.title}</RecordLink> : null}
          {carrier ? <RecordLink href={`/carriers/${carrier.id}`}>{carrier.name}</RecordLink> : null}
          <Link
            href={`/policies/${policy.id}/compare`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Compare renewal
          </Link>
        </div>
      </RecordSection>
    </AppShell>
  );
}
