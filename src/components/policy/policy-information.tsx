import Link from "next/link";
import {
  PolicyCarrierLookup,
  PolicyInlineStatus,
  PolicyInlineText,
} from "@/components/policy/policy-inline-fields";
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

export function PolicyInformationCard({
  policy,
  carrierId,
  carrierName,
  contact,
  account,
  producerDisplayName,
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
  /** Resolved person name (owner profile Name); never AFA / selling agency. */
  producerDisplayName?: string | null;
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
      <dl className="mt-3 grid gap-x-3 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {/* Row 1: Insured | Carrier | Policy number | Form */}
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
        <PolicyCarrierLookup
          policyId={policy.id}
          carrierId={carrierId}
          carrierName={carrierName}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="policyNumber"
          label="Policy number"
          value={policy.policyNumber}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="policySubType"
          label={homePc ? "Form" : "Subtype"}
          value={policy.policySubType ?? ""}
          readOnly={readOnly}
        />

        {/* Row 2: Insured location (1 cell) | Insurance type | Selling agency | Producer */}
        <div data-ff-policy-premises-row="">
          <PolicyInlineText
            policyId={policy.id}
            fieldKey="premisesAddress"
            label={homePc ? "Insured location" : "Premises"}
            value={insuredLocation || streetOnly}
            displayText={insuredStacked ?? undefined}
            readOnly={readOnly}
          />
        </div>
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="insuranceType"
          label="Insurance type"
          value={policy.insuranceType ?? ""}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="sellingAgency"
          label="Selling agency"
          value={policy.sellingAgency ?? ""}
          readOnly={readOnly}
        />
        <div data-ff-policy-inline="producer" data-ff-producer-person="">
          <dt className="text-helper text-muted-foreground">Producer</dt>
          <dd className="font-medium text-navy">{producerPerson || "—"}</dd>
        </div>

        {/* Row 3: Effective | Expiration | Renewal | commission or spacer */}
        <div data-ff-policy-inline="effectiveDate" data-ff-term-date-locked="">
          <dt className="text-helper text-muted-foreground">Effective date</dt>
          <dd className="font-medium text-navy">{formatDay(policy.effectiveDate)}</dd>
          <p className="text-[11px] text-muted-foreground">Locked · carrier/API truth</p>
        </div>
        <div data-ff-policy-inline="expirationDate" data-ff-term-date-locked="">
          <dt className="text-helper text-muted-foreground">Expiration date</dt>
          <dd className="font-medium text-navy">{formatDay(policy.expirationDate)}</dd>
          <p className="text-[11px] text-muted-foreground">Locked · carrier/API truth</p>
        </div>
        <div data-ff-policy-inline="renewalDate" data-ff-term-date-locked="">
          <dt className="text-helper text-muted-foreground">Renewal date</dt>
          <dd className="font-medium text-navy">
            {policy.renewalDate ? formatDay(policy.renewalDate) : "—"}
          </dd>
          <p className="text-[11px] text-muted-foreground">Locked · carrier/API truth</p>
        </div>
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
        ) : (
          <div className="hidden lg:block" aria-hidden="true" data-ff-date-row-spacer="" />
        )}
        {!readOnly ? (
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
        ) : null}

        {/* Row 4: Billing | Premium | two empty cells reserved */}
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="billingFrequency"
          label="Billing"
          value={billing}
          readOnly={readOnly}
        />
        <PolicyInlineText
          policyId={policy.id}
          fieldKey="premium"
          label="Premium"
          value={policy.premium != null ? String(policy.premium) : ""}
          readOnly={readOnly}
        />
        <div className="hidden lg:block" aria-hidden="true" data-ff-billing-row-spacer="1" />
        <div className="hidden lg:block" aria-hidden="true" data-ff-billing-row-spacer="2" />
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
