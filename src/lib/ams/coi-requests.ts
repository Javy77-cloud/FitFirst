import { parseHolderInput } from "@/lib/certificates/issue";
import type { CertificateRequestStatus } from "@/lib/domain-ams";

export type CertificateRequestDraft = {
  id: string;
  accountId: string;
  holderName: string;
  holderAddress: string;
  jobLocation: string | null;
  status: CertificateRequestStatus;
  issuedCertificateId: string | null;
};

export type CertificateRequestAction = "issue" | "withdraw";

export function nextCertificateRequestStatus(
  status: CertificateRequestStatus,
  action: CertificateRequestAction,
): CertificateRequestStatus | null {
  if (action === "withdraw" && status === "requested") return "withdrawn";
  if (action === "issue" && status === "requested") return "issued";
  return null;
}

export function validateCertificateRequest(input: {
  holderName: string;
  holderAddress: string;
  jobLocation?: string | null;
}): { ok: true; holderName: string; holderAddress: string; jobLocation: string | null } | { ok: false; error: string } {
  return parseHolderInput(input);
}

export function matchingIssuedCertificate<T extends { holderName: string; status: string }>(
  issued: T[],
  holderName: string,
): T | null {
  const needle = holderName.trim().toLowerCase();
  if (!needle) return null;
  return (
    issued.find(
      (row) => row.status === "issued" && row.holderName.trim().toLowerCase() === needle,
    ) ?? null
  );
}

export const ACORD_STUB_DISCLAIMER =
  "Desk stub only — not a licensed ACORD product. It does not amend, extend, or alter coverage.";
