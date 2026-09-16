import Link from "next/link";
import {
  PolicyCarrierLookup,
  PolicyInlineDate,
  PolicyInlineStatus,
  PolicyInlineText,
} from "@/components/policy/policy-inline-fields";
import { RecordLink } from "@/components/record-links";
import { POLICY_STATUSES } from "@/lib/policy/status";
import { partyLabel } from "@/lib/desk/policy-name";
import { distinctMailingLabel, mailingAddressLine } from "@/lib/desk/policy-information";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import { formatPremisesDisplay, streetOnlyPremises } from "@/lib/policy/premises";

export function PolicyInformationCard({
  policy,
  carrierId,
  carrierName,
  contact,
  account,
  locationLabel,
  mailing,
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
  };
  carrierId?: string | null;
  carrierName?: string | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
  locationLabel?: string | null;
  mailing?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  /** Agents: Overview is fully read-only. Admins can edit (sensitive fields confirm). */
  readOnly?: boolean;
  showCommission?: boolean;
}) {
  const insured = partyLabel(contact, account);
  const insuredHref = contact
    ? `/contacts/${contact.id}`
    : account
      ? `/accounts/${account.id}`
      : undefined;
  const billing = policy.billingFrequency || policy.premiumFrequency || "";
  const homePc = resolveLobOverviewFamily(policy) === "homeowners";
  const insuredLocation = formatPremisesDisplay({
    address: policy.premisesAddress,
    city: policy.premisesCity,
    state: policy.premisesState,
    zip: policy.premisesZip,
  });
  const streetOnly = streetOnlyPremises(policy.premisesAddress, {
    city: policy.premisesCity,
    state: policy.premisesState,
    zip: policy.premisesZip,
  });
  const mailingShown = distinctMailingLabel({
    premises: insuredLocation,
    mailing: mailingAddressLine(mailing),
    locationLabel,
  });

  return (
    <section id="policy-information" className="ff-card mb-4 p-4" data-ff-policy-information="">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Policy Information</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {readOnly
          ? "Read-only for agents. Admins can edit fields from Overview."
          : "Click a field to edit. Sensitive dates and the policy number ask for confirmation. Commission % and auto-label stay locked."}
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="policyNumber"
          label="Policy number"
          value={policy.policyNumber}
          readOnly={readOnly}
        />
        <PolicyInlineStatus
          policyId={policy.id}
          value={policy.status}
          options={POLICY_STATUSES}
          readOnly={readOnly}
        />
        <PolicyCarrierLookup
          policyId={policy.id}
          carrierId={carrierId}
          carrierName={carrierName}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="lineOfBusiness"
          label="Line / product"
          value={policy.lineOfBusiness}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="policySubType"
          label={homePc ? "Form" : "Subtype"}
          value={policy.policySubType ?? ""}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="insuranceType"
          label="Insurance type"
          value={policy.insuranceType ?? ""}
          readOnly={readOnly}
        />
        <PolicyInlineDate
          policyId={policy.id}
          fieldKey="effectiveDate"
          label="Effective date"
          value={policy.effectiveDate}
          readOnly={readOnly}
        />
        <PolicyInlineDate
          policyId={policy.id}
          fieldKey="expirationDate"
          label="Expiration date"
          value={policy.expirationDate}
          readOnly={readOnly}
        />
        <PolicyInlineDate
          policyId={policy.id}
          fieldKey="renewalDate"
          label="Renewal date"
          value={policy.renewalDate}
          readOnly={readOnly}
          allowEmpty
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="premium"
          label="Premium"
          value={policy.premium != null ? String(policy.premium) : ""}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="billingFrequency"
          label="Billing"
          value={billing}
          readOnly={readOnly}
        />
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
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="premisesAddress"
          label={homePc ? "Insured location" : "Premises"}
          value={insuredLocation || streetOnly}
          readOnly={readOnly}
        />
        {mailingShown ? (
          <div>
            <dt className="text-helper text-muted-foreground">Mailing address</dt>
            <dd className="font-medium text-navy" data-ff-mailing-address="">
              {mailingShown}
            </dd>
          </div>
        ) : null}
        {showCommission ? (
          <div data-ff-policy-inline="commission4Pct-locked">
            <dt className="text-helper text-muted-foreground">Commission %</dt>
            <dd className="font-medium text-navy">
              {policy.commission4Pct != null && String(policy.commission4Pct).trim()
                ? `${policy.commission4Pct}%`
                : "—"}
            </dd>
            <p className="text-[11px] text-muted-foreground">Locked · from carrier schedule</p>
          </div>
        ) : null}
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="producer"
          label="Producer"
          value={policy.producer ?? ""}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="sellingAgency"
          label="Selling agency"
          value={policy.sellingAgency ?? ""}
          readOnly={readOnly}
        />
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
