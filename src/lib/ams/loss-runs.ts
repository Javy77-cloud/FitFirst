import { formatDay } from "@/lib/domain";
import { LOSS_RUN_STUB_DISCLAIMER } from "@/lib/domain-ams";
import { toCsv } from "@/lib/api/v1/csv";

export const LOSS_RUN_HEADERS = [
  "Date of loss",
  "Reported",
  "Cause",
  "Status",
  "Carrier claim #",
  "Location",
  "Description",
  "Reporter",
] as const;

export type LossRunClaim = {
  dateOfLoss: Date | string | null;
  dateReported: Date | string | null;
  causeType: string | null;
  status: string;
  carrierClaimNumber: string | null;
  lossLocation: string | null;
  description: string | null;
  reporterName: string | null;
};

export function lossRunRows(claims: LossRunClaim[]): string[][] {
  return claims.map((claim) => [
    formatDay(claim.dateOfLoss),
    formatDay(claim.dateReported),
    claim.causeType ?? "",
    claim.status,
    claim.carrierClaimNumber ?? "",
    claim.lossLocation ?? "",
    claim.description ?? "",
    claim.reporterName ?? "",
  ]);
}

export function lossRunCsv(claims: LossRunClaim[]): string {
  const header = `# ${LOSS_RUN_STUB_DISCLAIMER}`;
  return `${header}\r\n${toCsv([...LOSS_RUN_HEADERS], lossRunRows(claims))}`;
}

export function lossRunFilename(policyNumber: string, at = new Date()): string {
  const day = at.toISOString().slice(0, 10);
  const slug = policyNumber.replace(/[^A-Za-z0-9_-]+/g, "-");
  return `loss-run-${slug}-stub-${day}.csv`;
}

export { LOSS_RUN_STUB_DISCLAIMER };
