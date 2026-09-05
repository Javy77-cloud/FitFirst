import {
  formatDay,
  formatMoney,
  formatRatePct,
  sellingAgencyLabel,
} from "@/lib/domain";
import { partyLabel } from "@/lib/desk/policy-name";

export type PolicyInfoField = {
  key: string;
  label: string;
  value: string;
  href?: string;
};

export type PolicyInfoSource = {
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
  originalEffectiveDate?: Date | string | null;
  createdAt?: Date | string | null;
  premium?: string | number | null;
  billingFrequency?: string | null;
  premiumFrequency?: string | null;
  coverageA?: number | null;
  coverageLimits?: Record<string, string> | null;
  faceAmount?: string | number | null;
  premisesAddress?: string | null;
  premisesCity?: string | null;
  premisesState?: string | null;
  premisesZip?: string | null;
  sellingAgency?: string | null;
  commission4Pct?: string | number | null;
  commission4?: string | number | null;
  producer?: string | null;
  policyTerm?: string | null;
  termMonths?: number | null;
  insuredCount?: number | null;
  numberOfInsured?: number | null;
  endedAt?: Date | string | null;
  endReason?: string | null;
};

function dash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function premisesLine(policy: PolicyInfoSource): string | null {
  const street = policy.premisesAddress?.trim();
  const cityLine = [policy.premisesCity, policy.premisesState, policy.premisesZip]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  if (!street && !cityLine) return null;
  return [street, cityLine].filter(Boolean).join(", ");
}

function coverageLimitsLine(limits: Record<string, string> | null | undefined): string | null {
  if (!limits) return null;
  const parts = Object.entries(limits)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => `${titleCase(key)} ${value.trim()}`);
  return parts.length ? parts.join(" · ") : null;
}

function push(
  fields: PolicyInfoField[],
  key: string,
  label: string,
  value: string | null | undefined,
  href?: string,
  opts?: { always?: boolean },
) {
  const shown = dash(value ?? undefined);
  if (shown === "—" && !opts?.always) return;
  fields.push(href ? { key, label, value: shown, href } : { key, label, value: shown });
}

/** Core policy columns already on `policies` — display order for the record card. */
export function policyInformationFields(input: {
  policy: PolicyInfoSource;
  carrierName?: string | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
  locationLabel?: string | null;
}): PolicyInfoField[] {
  const { policy } = input;
  const fields: PolicyInfoField[] = [];
  const lineProduct = [policy.lineOfBusiness, policy.policyType || policy.formType]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part, index, all) => all.findIndex((other) => other.toLowerCase() === part.toLowerCase()) === index)
    .join(" · ");
  const insured = partyLabel(input.contact, input.account);
  const insuredHref = input.contact
    ? `/contacts/${input.contact.id}`
    : input.account
      ? `/accounts/${input.account.id}`
      : undefined;
  const billing = policy.billingFrequency || policy.premiumFrequency;
  const commission =
    policy.commission4Pct != null && policy.commission4Pct !== ""
      ? formatRatePct(policy.commission4Pct)
      : policy.commission4 != null && policy.commission4 !== ""
        ? formatRatePct(policy.commission4)
        : null;
  const written = policy.originalEffectiveDate ?? policy.createdAt;
  const insuredCount = policy.insuredCount ?? policy.numberOfInsured;
  const term =
    policy.policyTerm?.trim() ||
    (policy.termMonths != null ? `${policy.termMonths} months` : null);

  push(fields, "policyNumber", "Policy number", policy.policyNumber, undefined, { always: true });
  push(fields, "status", "Status", policy.status, undefined, { always: true });
  push(fields, "carrier", "Carrier", input.carrierName ?? "Carrier TBD", undefined, { always: true });
  push(fields, "line", "Line / product", lineProduct || policy.lineOfBusiness, undefined, { always: true });
  push(fields, "subType", "Subtype", policy.policySubType);
  push(fields, "insuranceType", "Insurance type", policy.insuranceType);
  push(fields, "effective", "Effective", formatDay(policy.effectiveDate), undefined, { always: true });
  push(fields, "expiration", "Expiration", formatDay(policy.expirationDate), undefined, { always: true });
  push(fields, "renewal", "Renewal", formatDay(policy.renewalDate));
  push(fields, "premium", "Premium", formatMoney(policy.premium), undefined, { always: true });
  push(fields, "billing", "Billing", billing ? titleCase(billing) : null);
  push(fields, "coverageA", "Coverage A", policy.coverageA != null ? formatMoney(policy.coverageA) : null);
  push(fields, "limits", "Key limits", coverageLimitsLine(policy.coverageLimits));
  push(fields, "faceAmount", "Face amount", policy.faceAmount != null ? formatMoney(policy.faceAmount) : null);
  push(fields, "insured", "Insured", insured || null, insuredHref, { always: true });
  push(fields, "premises", "Premises", premisesLine(policy));
  push(fields, "location", "Location", input.locationLabel);
  push(fields, "commission", "Commission", commission);
  push(fields, "sellingAgency", "Selling agency", sellingAgencyLabel(policy.sellingAgency));
  push(fields, "written", "Written", formatDay(written));
  push(fields, "producer", "Producer", policy.producer);
  push(fields, "term", "Term", term);
  push(fields, "insuredCount", "Number of insured", insuredCount != null ? String(insuredCount) : null);
  push(fields, "ended", "Ended", policy.endedAt ? `${formatDay(policy.endedAt)} · ${dash(policy.endReason)}` : null);

  return fields;
}

export function policyInformationCoreKeys(): string[] {
  return ["policyNumber", "status", "carrier", "line", "effective", "expiration", "premium", "insured"];
}
