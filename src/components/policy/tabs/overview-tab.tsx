import Link from "next/link";
import { ClientStayingButton } from "@/components/renewals/client-staying-button";
import { RenewalAgreedStamp } from "@/components/policy/renewal-agreed-stamp";
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
import { isInForceStatus, isOffBookStatus, policyStatusLabel } from "@/lib/policy/status";
import {
  bandIsOffBook,
  deskTermBandLabel,
  type CurrentTermResolution,
} from "@/lib/policies/current-term";
import { renewalDaysPhrase } from "@/lib/renewal/urgency";
import { showRenewalAgreedStamp } from "@/lib/policies/renewal-agreed";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import { resolveDwellingFacts } from "@/lib/policy/dwelling-facts";
import { parsePropertyProtectionSnapshot } from "@/lib/policy/property-protection";
import { buildHomeOverviewInspections, type HomeInspectionDocument } from "@/lib/policy/home-overview-inspections";
import { HomeInspectionSections } from "@/components/policy/home-inspection-sections";
import { DecDocumentEye, type DeclarationDocumentLink } from "@/components/policy/dec-document-eye";
import { isDwellingFireProduct } from "@/lib/deals/dwelling-addresses";
import { mailingAddressLine } from "@/lib/desk/policy-information";

export function PolicyOverviewTab({
  policy,
  carrierId,
  carrierName,
  contact,
  account,
  deal,
  sheet,
  vehicles,
  isAuto,
  terms,
  change,
  checklist,
  packetByKey,
  missingPackets,
  packetOnFile,
  interests,
  risk,
  producerDisplayName,
  readOnly = false,
  showCommission = true,
  termView = null,
  renewalHandled = false,
  inspectionDocs = [],
  declaration = null,
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
    propertyProtection?: {
      values?: Record<string, string>;
      updatedAt?: string | null;
      source?: string | null;
    } | null;
  };
  carrierId?: string | null;
  carrierName?: string | null;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  account?: {
    id: string;
    name: string;
    wcClassCode?: string | null;
    payrollTotal?: string | number | null;
    operations?: string | null;
    operationsDescription?: string | null;
  } | null;
  deal?: { id: string; title: string } | null;
  sheet?: Record<string, { value?: string | null } | undefined> | null;
  vehicles: Parameters<typeof VehiclesList>[0]["vehicles"];
  isAuto: boolean;
  terms: Parameters<typeof TermHistoryPanel>[0]["terms"];
  change: Parameters<typeof PremiumChangeSummary>[0]["change"] | null;
  checklist: Parameters<typeof ServicingChecklistCard>[0]["checklist"] | null;
  packetByKey: Parameters<typeof ServicingChecklistCard>[0]["packetByKey"];
  missingPackets: Parameters<typeof ServicingChecklistCard>[0]["missingPackets"];
  packetOnFile?: Parameters<typeof ServicingChecklistCard>[0]["packetOnFile"];
  interests: Array<{ kind: string }>;
  risk?: {
    roofYear?: number | null;
    yearBuilt?: number | null;
    construction?: string | null;
    occupancy?: string | null;
    county?: string | null;
    roofCovering?: string | null;
    openingProtection?: string | null;
  } | null;
  /** Owner profile Name (person), never AFA / selling agency. */
  producerDisplayName?: string | null;
  readOnly?: boolean;
  showCommission?: boolean;
  termView?: CurrentTermResolution | null;
  /** renewal_queue stage === handled ("Client staying"). */
  renewalHandled?: boolean;
  /** Deal-library wind mit / four-point files. Ids only — the PDF stays on the deal. */
  inspectionDocs?: HomeInspectionDocument[];
  /** Policy declaration. The eye opens it in the document popup. */
  declaration?: DeclarationDocumentLink | null;
}) {
  const offBook = termView ? bandIsOffBook(termView.band) : isOffBookStatus(policy.status);
  const inForce = termView ? termView.countsAsInForce : isInForceStatus(policy.status);
  const stayingDate = termView?.renewalAnchor ?? policy.renewalDate;
  const renewalLine = offBook
    ? termView
      ? deskTermBandLabel(termView.band, policy.status)
      : policyStatusLabel(policy.status)
    : termView?.current
      ? `${deskTermBandLabel(termView.band, policy.status)} · ${renewalDaysPhrase(termView.daysLeft ?? 0)} · Expires ${formatDay(termView.current.expiration)}`
      : policy.renewalDate
        ? `Renewal ${formatDay(policy.renewalDate)}`
        : `Expires ${formatDay(policy.expirationDate)}`;
  const family = resolveLobOverviewFamily(policy);
  const limits = policy.coverageLimits ?? {};
  const protectionValues = parsePropertyProtectionSnapshot(policy.propertyProtection)?.values ?? {};
  const mobileHomeUnit = [
    limits.unit_year,
    limits.unit_make,
    limits.unit_serial,
    limits.unit_length && limits.unit_width ? `${limits.unit_length} x ${limits.unit_width}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const scheduledStructures = [
    limits.scheduled_carport ? `Carport ${limits.scheduled_carport}` : null,
    limits.scheduled_screen_room ? `Screen room ${limits.scheduled_screen_room}` : null,
    limits.scheduled_shed ? `Shed ${limits.scheduled_shed}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const showDwellingMailing = !isDwellingFireProduct(policy.policySubType, policy.formType);
  const mortgageeCount = interests.filter((row) => row.kind === "mortgagee").length;
  const additionalInsuredCount = interests.filter(
    (row) =>
      row.kind === "additional_insured" ||
      row.kind === "additional_interest" ||
      row.kind === "certificate_holder",
  ).length;
  const dwelling = resolveDwellingFacts({ risk, sheet });
  const inspectionSections =
    family === "homeowners"
      ? buildHomeOverviewInspections({
          documents: inspectionDocs,
          risk,
          sheet,
          protection: protectionValues,
          roofInstallDate: limits.date_of_roof_installation,
        })
      : [];
  const showRenewalAgreed = showRenewalAgreedStamp({
    clientStaying: renewalHandled,
    // Stored policies.renewal_date. Swap for renewalDateFor(policy) when that helper lands.
    renewalDate: policy.renewalDate,
    effectiveDate: termView?.current?.effective ?? termView?.bookEffective ?? policy.effectiveDate,
    expirationDate: termView?.current?.expiration ?? termView?.bookExpiration ?? policy.expirationDate,
    renewedEffectiveDate: termView?.upcoming?.effective,
    terms,
  });

  return (
    <div className="space-y-4" data-ff-policy-tab="overview">
      <PolicyInformationCard
        policy={policy}
        carrierId={carrierId}
        carrierName={carrierName}
        contact={contact}
        account={account}
        producerDisplayName={producerDisplayName}
        readOnly={readOnly}
        showCommission={showCommission}
        mailing={
          isDwellingFireProduct(policy.policySubType, policy.formType) && contact
            ? {
                address: contact.mailingAddress,
                city: contact.city,
                state: contact.state,
                zip: contact.zip,
              }
            : null
        }
      />

      <section className="ff-card relative p-4" data-ff-policy-links-renewal="">
        {showRenewalAgreed ? <RenewalAgreedStamp /> : null}
        <div className="ff-links-renewal-copy space-y-3">
          <h2 className="text-base font-semibold text-navy">Links & renewal</h2>
          <p className="text-sm text-muted-foreground" data-ff-policy-renewal-status="">
            Renewal status · {renewalLine}
            {inForce ? " · Active term" : ""}
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
          {inForce ? (
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
            {inForce ? (
              <span className="ff-links-renewal-staying">
                <ClientStayingButton policyId={policy.id} renewalDate={stayingDate} size="sm" />
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {change && inForce ? (
        <PremiumChangeSummary change={change} compareHref={`/policies/${policy.id}/compare`} />
      ) : null}

      <LobOverviewSections
        readOnly={readOnly}
        headingAside={
          family === "homeowners" && declaration
            ? { dwelling: <DecDocumentEye document={declaration} /> }
            : undefined
        }
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
          yearBuilt: dwelling.yearBuilt,
          roofYear: dwelling.roofYear,
          construction: dwelling.construction,
          typeOfResidence: limits.type_of_residence,
          monthsOccupied: limits.months_occupied,
          vehicleCount: vehicles?.length ?? 0,
          account,
          mortgageeCount,
          additionalInsuredCount,
          occupancy: risk?.occupancy,
          families: limits.number_of_families,
          dwellingType: limits.dwelling_type,
          county: risk?.county,
          dwellingReplacementCost: limits.dwelling_replacement_cost,
          personalPropertyReplacementCost: limits.personal_property_replacement_cost,
          mailingAddress: showDwellingMailing
            ? mailingAddressLine({
                address: contact?.mailingAddress,
                city: contact?.city,
                state: contact?.state,
                zip: contact?.zip,
              })
            : null,
          mobileHomeUnit: mobileHomeUnit || null,
          scheduledStructures: scheduledStructures || null,
        }}
        insertAfter={
          family === "homeowners"
            ? { dwelling: <HomeInspectionSections sections={inspectionSections} /> }
            : undefined
        }
      />

      {isAuto || family === "auto" ? (
        <VehiclesList
          vehicles={vehicles}
          bodilyInjury={limits.liability_bi || limits.bodily_injury}
          propertyDamage={limits.liability_pd || limits.property_damage}
        />
      ) : null}

      {checklist ? (
        <ServicingChecklistCard
          checklist={checklist}
          policyId={policy.id}
          packetByKey={packetByKey}
          missingPackets={missingPackets}
          packetOnFile={packetOnFile}
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
