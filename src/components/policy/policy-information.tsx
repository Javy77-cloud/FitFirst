import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  PolicyCarrierLookup,
  PolicyInlineStatus,
  PolicyInlineText,
} from "@/components/policy/policy-inline-fields";
import {
  policyInformationLayoutName,
  policyInformationSlotOrder,
  type PolicyInfoSlot,
} from "@/components/policy/policy-information-layout";
import { CorrectTermDatesDialog } from "@/components/policy/correct-term-dates-dialog";
import { formatDay } from "@/lib/domain";
import { RecordLink } from "@/components/record-links";
import { POLICY_STATUSES } from "@/lib/policy/status";
import { partyLabel } from "@/lib/desk/policy-name";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import {
  formatPremisesDisplay,
  formatPremisesStacked,
  streetOnlyPremises,
} from "@/lib/policy/premises";
import { distinctMailingLabel, mailingAddressLine } from "@/lib/desk/policy-information";
import { DWELLING_MAILING_ADDRESS_LABEL } from "@/lib/deals/dwelling-addresses";

export function PolicyInformationCard({
  policy,
  carrierId,
  carrierName,
  contact,
  account,
  producerDisplayName,
  readOnly = false,
  showCommission = true,
  mailing = null,
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
  };
  carrierId?: string | null;
  carrierName?: string | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
  /** Resolved person name (owner profile Name); never AFA / selling agency. */
  producerDisplayName?: string | null;
  /** Agents: Overview is fully read-only. Admins can edit (sensitive fields confirm). */
  readOnly?: boolean;
  showCommission?: boolean;
  /** DP1/DP3 owner mailing. Omitted for other products. */
  mailing?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
}) {
  const insured = partyLabel(contact, account);
  const insuredHref = contact
    ? `/contacts/${contact.id}`
    : account
      ? `/accounts/${account.id}`
      : undefined;
  const billing = policy.billingFrequency || policy.premiumFrequency || "";
  const homePc = resolveLobOverviewFamily(policy) === "homeowners";
  const premisesParts = {
    address: policy.premisesAddress,
    city: policy.premisesCity,
    state: policy.premisesState,
    zip: policy.premisesZip,
  };
  const insuredLocation = formatPremisesDisplay(premisesParts);
  const streetOnly = streetOnlyPremises(policy.premisesAddress, {
    city: policy.premisesCity,
    state: policy.premisesState,
    zip: policy.premisesZip,
  });
  const insuredStacked = formatPremisesStacked(premisesParts);
  const producerPerson = producerDisplayName?.trim() || "";
  const ownerMailing = distinctMailingLabel({
    premises: insuredLocation,
    mailing: mailingAddressLine(mailing),
  });
  const layout = policyInformationLayoutName(policy.id);
  const slots = policyInformationSlotOrder(layout, { includeMailing: Boolean(ownerMailing) });
  const cells: Record<PolicyInfoSlot, ReactNode> = {
    insured: (
      <div>
        <dt className="text-helper text-muted-foreground">Insured</dt>
        <dd className="font-medium text-navy">
          {insuredHref && insured ? (
            <RecordLink href={insuredHref}>{insured}</RecordLink>
          ) : (
            insured || "—"
          )}
        </dd>
      </div>
    ),
    carrier: (
      <PolicyCarrierLookup
        policyId={policy.id}
        carrierId={carrierId}
        carrierName={carrierName}
        readOnly={readOnly}
      />
    ),
    policyNumber: (
      <PolicyInlineText
        policyId={policy.id}
        fieldKey="policyNumber"
        label="Policy number"
        value={policy.policyNumber}
        readOnly={readOnly}
      />
    ),
    subType: (
      <PolicyInlineText
        policyId={policy.id}
        fieldKey="policySubType"
        label={homePc ? "Form" : "Subtype"}
        value={policy.policySubType ?? ""}
        readOnly={readOnly}
      />
    ),
    // Single cell: always a two-line stack — never full-span, never one line.
    premises: (
      <div data-ff-policy-premises-row="">
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="premisesAddress"
          label={"Insured location"}
          value={insuredLocation || streetOnly}
          displayText={insuredStacked ?? "—\n"}
          readOnly={readOnly}
        />
      </div>
    ),
    mailing: ownerMailing ? (
      <div data-ff-policy-mailing="">
        <dt className="text-helper text-muted-foreground">{DWELLING_MAILING_ADDRESS_LABEL}</dt>
        <dd className="font-medium text-navy">{ownerMailing}</dd>
      </div>
    ) : null,
    insuranceType: (
      <PolicyInlineText
        policyId={policy.id}
        fieldKey="insuranceType"
        label="Insurance type"
        value={policy.insuranceType ?? ""}
        readOnly={readOnly}
      />
    ),
    sellingAgency: (
      <PolicyInlineText
        policyId={policy.id}
        fieldKey="sellingAgency"
        label="Selling agency"
        value={policy.sellingAgency ?? ""}
        readOnly={readOnly}
      />
    ),
    producer: (
      <div data-ff-policy-inline="producer" data-ff-producer-person="">
        <dt className="text-helper text-muted-foreground">Producer</dt>
        <dd className="font-medium text-navy">{producerPerson || "—"}</dd>
      </div>
    ),
    effective: (
      <div data-ff-policy-inline="effectiveDate" data-ff-term-date-locked="">
        <dt className="text-helper text-muted-foreground">Effective date</dt>
        <dd className="font-medium text-navy">{formatDay(policy.effectiveDate)}</dd>
        <p className="text-[11px] text-muted-foreground">Locked · carrier/API truth</p>
      </div>
    ),
    expiration: (
      <div data-ff-policy-inline="expirationDate" data-ff-term-date-locked="">
        <dt className="text-helper text-muted-foreground">Expiration date</dt>
        <dd className="font-medium text-navy">{formatDay(policy.expirationDate)}</dd>
        <p className="text-[11px] text-muted-foreground">Locked · carrier/API truth</p>
      </div>
    ),
    renewal: (
      <div data-ff-policy-inline="renewalDate" data-ff-term-date-locked="">
        <dt className="text-helper text-muted-foreground">Renewal date</dt>
        <dd className="font-medium text-navy">
          {policy.renewalDate ? formatDay(policy.renewalDate) : "—"}
        </dd>
        <p className="text-[11px] text-muted-foreground">Locked · carrier/API truth</p>
      </div>
    ),
    billing: (
      <PolicyInlineText
        policyId={policy.id}
        fieldKey="billingFrequency"
        label="Billing"
        value={billing}
        readOnly={readOnly}
      />
    ),
    premium: (
      <PolicyInlineText
        policyId={policy.id}
        fieldKey="premium"
        label="Premium"
        value={policy.premium != null ? String(policy.premium) : ""}
        readOnly={readOnly}
      />
    ),
    commission: showCommission ? (
      <div data-ff-policy-inline="commission4Pct-locked">
        <dt className="text-helper text-muted-foreground">Commission %</dt>
        <dd className="font-medium text-navy">
          {policy.commission4Pct != null && String(policy.commission4Pct).trim()
            ? `${policy.commission4Pct}%`
            : "—"}
        </dd>
        <p className="text-[11px] text-muted-foreground">Locked · from carrier schedule</p>
      </div>
    ) : (
      <div className="hidden lg:block" aria-hidden="true" data-ff-date-row-spacer="" />
    ),
    termOverride: !readOnly ? (
      <div className="sm:col-span-2 lg:col-span-4" data-ff-term-override-control="">
        <CorrectTermDatesDialog
          policyId={policy.id}
          effectiveDate={policy.effectiveDate}
          expirationDate={policy.expirationDate}
          renewalDate={policy.renewalDate}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Agency only (admin/owner). Requires a reason; writes Activity + E&O audit.
        </p>
      </div>
    ) : null,
  };

  return (
    <section id="policy-information" className="ff-card mb-4 p-4" data-ff-policy-information="">
      <div className="flex flex-wrap items-center gap-2" data-ff-policy-info-header="">
        <h2 className="text-base font-semibold text-navy">Policy Information</h2>
        <span className="text-muted-foreground" aria-hidden="true">
          —
        </span>
        <PolicyInlineStatus
          policyId={policy.id}
          value={policy.status}
          options={POLICY_STATUSES}
          readOnly={readOnly}
          variant="header"
        />
      </div>
      <dl
        className="mt-3 grid gap-x-3 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4"
        data-ff-policy-info-layout={layout}
      >
        {slots.map((slot) => {
          const node = cells[slot];
          if (node == null) return null;
          return <Fragment key={slot}>{node}</Fragment>;
        })}
      </dl>
      {carrierId ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Open carrier:{" "}
          <Link href={`/carriers/${carrierId}`} className="text-primary hover:underline">
            {carrierName ?? "Carrier record"}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
