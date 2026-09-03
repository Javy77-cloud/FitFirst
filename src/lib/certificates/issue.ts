import { formatDay, formatMoney, isCertifiableLine, lineLabel } from "@/lib/domain";
import type { CertificateLine, CoverageLimits } from "@/lib/db/schema";

export type PolicyForCert = {
  id: string;
  lineOfBusiness: string;
  status: string;
  policyNumber: string;
  carrierName: string;
  effectiveDate: Date | string;
  expirationDate: Date | string;
  coverageLimits: CoverageLimits | null;
};

export type HolderInput = {
  holderName: string;
  holderAddress: string;
  jobLocation?: string | null;
};

export type IssueDraft = {
  holderName: string;
  holderAddress: string;
  jobLocation: string | null;
  lines: CertificateLine[];
};

const LIMIT_LABELS: Record<string, string> = {
  eachOccurrence: "Each occurrence",
  generalAggregate: "General aggregate",
  productsCompletedOps: "Products / completed ops",
  personalAdvertising: "Personal & advertising",
  damageToRented: "Damage to rented premises",
  medicalExpense: "Medical expense",
  wcStatutory: "WC statutory limits",
  elEachAccident: "EL each accident",
  elDiseaseEachEmployee: "EL disease — each employee",
  elDiseasePolicyLimit: "EL disease — policy limit",
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isInForceCertifiable(policy: PolicyForCert, asOf = new Date()): boolean {
  if (policy.status !== "active") return false;
  if (!isCertifiableLine(policy.lineOfBusiness)) return false;
  const exp = asDate(policy.expirationDate);
  if (Number.isNaN(exp.getTime()) || exp < asOf) return false;
  const eff = asDate(policy.effectiveDate);
  if (!Number.isNaN(eff.getTime()) && eff > asOf) return false;
  return true;
}

export function selectCertLines(policies: PolicyForCert[], asOf = new Date()): PolicyForCert[] {
  return policies
    .filter((policy) => isInForceCertifiable(policy, asOf))
    .sort((a, b) => a.lineOfBusiness.localeCompare(b.lineOfBusiness));
}

export function formatLimitValue(value: string | undefined): string {
  if (value == null || value === "") return "—";
  if (/^[a-z]/i.test(value) && Number.isNaN(Number(value))) {
    return value;
  }
  const n = Number(value);
  if (Number.isFinite(n)) return formatMoney(n);
  return value;
}

export function limitsForLine(limits: CoverageLimits | null | undefined): CertificateLine["limits"] {
  if (!limits) return [];
  return Object.entries(LIMIT_LABELS)
    .filter(([key]) => limits[key as keyof CoverageLimits] != null)
    .map(([key, label]) => ({
      key,
      label,
      value: formatLimitValue(limits[key as keyof CoverageLimits]),
    }));
}

export function toCertificateLine(policy: PolicyForCert): CertificateLine {
  return {
    policyId: policy.id,
    lineOfBusiness: policy.lineOfBusiness,
    lineLabel: lineLabel(policy.lineOfBusiness),
    policyNumber: policy.policyNumber,
    carrierName: policy.carrierName,
    status: policy.status,
    effectiveDate: formatDay(policy.effectiveDate),
    expirationDate: formatDay(policy.expirationDate),
    limits: limitsForLine(policy.coverageLimits),
  };
}

export function parseHolderInput(input: HolderInput):
  | { ok: true; holderName: string; holderAddress: string; jobLocation: string | null }
  | { ok: false; error: string } {
  const holderName = input.holderName.trim();
  const holderAddress = input.holderAddress.trim();
  const jobLocation = input.jobLocation?.trim() || null;
  if (!holderName) return { ok: false, error: "Certificate holder name is required." };
  if (!holderAddress) return { ok: false, error: "Certificate holder address is required." };
  return { ok: true, holderName, holderAddress, jobLocation };
}

export function buildCertificateDraft(
  policies: PolicyForCert[],
  input: HolderInput,
  asOf = new Date(),
): { ok: true; draft: IssueDraft } | { ok: false; error: string } {
  const holder = parseHolderInput(input);
  if (!holder.ok) return holder;
  const lines = selectCertLines(policies, asOf).map(toCertificateLine);
  if (lines.length === 0) {
    return {
      ok: false,
      error: "Issue a certificate only when the Business has an active GL or WC policy.",
    };
  }
  return {
    ok: true,
    draft: {
      holderName: holder.holderName,
      holderAddress: holder.holderAddress,
      jobLocation: holder.jobLocation,
      lines,
    },
  };
}

export function nextCertificateNumber(issuedCount: number, issuedAt = new Date()): string {
  const ymd = formatDay(issuedAt).replaceAll("-", "");
  return `COI-${ymd}-${String(issuedCount + 1).padStart(4, "0")}`;
}
