import Link from "next/link";
import { PolicyInformationCard } from "@/components/policy/policy-information";
import { LobOverviewSections } from "@/components/policy/lob-overview-sections";
import { PremiumChangeSummary } from "@/components/policy/premium-change";
import { RecordLink } from "@/components/record-links";
import { VehiclesList } from "@/components/desk-ams-panels";
import { TermHistoryPanel } from "@/components/ams/term-history-panel";
import { ServicingChecklistCard } from "@/components/ams/servicing-checklist";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/domain";
import { isInForceStatus } from "@/lib/policy/status";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import { resolveDwellingFacts } from "@/lib/policy/dwelling-facts";

export function PolicyOverviewTab({
  policy,
  carrierId,
  carrierName,
  contact,
  account,
  deal,
  locationLabel,
  mailing,
  sheet,
  vehicles,
  isAuto,
  terms,
  change,
  checklist,
  packetByKey,
  missingPackets,
  interests,
  risk,
  readOnly = false,
  showCommission = true,
}: {
  policy: {
    id: string;
    policyNumber: string;
    status: string;
    lineOfBusiness: string;
    insuranceType?: string | null;
    policyType?: string | null;
    policySubType?: string | null;
    formType?: string | null;
    effectiveDate: Date | string;
    expirationDate: Date | string;
    renewalDate?: Date | string | null;
    premium?: string | number | null;
    billingFrequency?: string | null;
    premiumFrequency?: string | null;
    producer?: string | null;
    sellingAgency?: string | null;
    premisesAddress?: string | null;
    premisesCity?: string | null;
    premisesState?: string | null;
    premisesZip?: string | null;
    commission4Pct?: string | number | null;
    coverageA: number | null;
    faceAmount?: string | number | null;
    coverageLimits?: Record<string, string> | null;
    contactId?: string | null;
    accountId?: string | null;
  };
  carrierId?: string | null;
  carrierName?: string | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: {
    id: string;
    name: string;
    wcClassCode?: string | null;
    payrollTotal?: string | number | null;
    operations?: string | null;
    operationsDescription?: string | null;
  } | null;
  deal?: { id: string; title: string } | null;
  locationLabel?: string | null;
  mailing?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  sheet?: Record<string, { value?: string | null } | undefined> | null;
  vehicles: Parameters<typeof VehiclesList>[0]["vehicles"];
  isAuto: boolean;
  terms: Parameters<typeof TermHistoryPanel>[0]["terms"];
  change: Parameters<typeof PremiumChangeSummary>[0]["change"] | null;
  checklist: Parameters<typeof ServicingChecklistCard>[0]["checklist"] | null;
  packetByKey: Parameters<typeof ServicingChecklistCard>[0]["packetByKey"];
  missingPackets: Parameters<typeof ServicingChecklistCard>[0]["missingPackets"];
  interests: Array<{ kind: string }>;
  risk?: {
    roofYear?: number | null;
    yearBuilt?: number | null;
    construction?: string | null;
  } | null;
  readOnly?: boolean;
  showCommission?: boolean;
}) {
  const renewalLine = policy.renewalDate
    ? `Renewal ${formatDay(policy.renewalDate)}`
    : `Expires ${formatDay(policy.expirationDate)}`;
  const family = resolveLobOverviewFamily(policy);
  const mortgageeCount = interests.filter((row) => row.kind === "mortgagee").length;
  const additionalInsuredCount = interests.filter(
    (row) =>
      row.kind === "additional_insured" ||
      row.kind === "additional_interest" ||
      row.kind === "certificate_holder",
  ).length;
  const dwelling = resolveDwellingFacts({ risk, sheet });

  return (
    <div className="space-y-4" data-ff-policy-tab="overview">
      <PolicyInformationCard
        policy={policy}
        carrierId={carrierId}
        carrierName={carrierName}
        contact={contact}
        account={account}
        locationLabel={locationLabel}
        mailing={mailing}
        readOnly={readOnly}
        showCommission={showCommission}
      />

      <section className="ff-card space-y-3 p-4">
        <h2 className="text-base font-semibold text-navy">Links & renewal</h2>
        <p className="text-sm text-muted-foreground" data-ff-policy-renewal-status="">
          Renewal status · {renewalLine}
          {isInForceStatus(policy.status) ? " · Active term" : ""}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          {contact ? (
            <RecordLink href={`/contacts/${contact.id}?fromPolicy=${policy.id}`}>
              Contact {contact.lastName}, {contact.firstName}
            </RecordLink>
          ) : null}
          {account ? (
            <RecordLink href={`/accounts/${account.id}?fromPolicy=${policy.id}`}>
              Business {account.name}
            </RecordLink>
          ) : null}
          {deal ? (
            <RecordLink href={`/deals/${deal.id}?fromPolicy=${policy.id}`}>Deal {deal.title}</RecordLink>
          ) : null}
          {isInForceStatus(policy.status) ? (
            <Link
              href={`/policies/${policy.id}/compare`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "ff-compare-terms-btn",
              )}
              title="Opens current vs upcoming comparison — does not bind"
              aria-label="Compare terms — opens current vs upcoming comparison, does not bind"
              data-ff-compare-terms=""
            >
              Compare terms
            </Link>
          ) : null}
        </div>
      </section>

      {change && isInForceStatus(policy.status) ? (
        <PremiumChangeSummary change={change} compareHref={`/policies/${policy.id}/compare`} />
      ) : null}

      <LobOverviewSections
        readOnly={readOnly}
        input={{
          policyId: policy.id,
          lineOfBusiness: policy.lineOfBusiness,
          policyType: policy.policyType,
          insuranceType: policy.insuranceType,
          policySubType: policy.policySubType,
          formType: policy.formType,
          coverageA: policy.coverageA,
          faceAmount: policy.faceAmount,
          coverageLimits: policy.coverageLimits,
          premisesAddress: policy.premisesAddress,
          premisesCity: policy.premisesCity,
          premisesState: policy.premisesState,
          premisesZip: policy.premisesZip,
          roofYear: dwelling.roofYear,
          yearBuilt: dwelling.yearBuilt,
          construction: dwelling.construction,
          vehicleCount: vehicles?.length ?? 0,
          account,
          mortgageeCount,
          additionalInsuredCount,
        }}
      />

      {isAuto || family === "auto" ? <VehiclesList vehicles={vehicles} /> : null}

      {checklist ? (
        <ServicingChecklistCard
          checklist={checklist}
          policyId={policy.id}
          packetByKey={packetByKey}
          missingPackets={missingPackets}
        />
      ) : null}

      <p className="text-sm text-muted-foreground">
        Mortgagee / additional insured forms live on{" "}
        <Link href={`/policies/${policy.id}?tab=coverage`} className="text-primary hover:underline">
          Coverage
        </Link>
        .
      </p>

      <TermHistoryPanel policyId={policy.id} terms={terms} />
    </div>
  );
}
