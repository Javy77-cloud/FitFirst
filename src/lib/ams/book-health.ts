import { isEndedStatus, isInForceStatus } from "@/lib/policy/status";
import {
  SERVICING_DOC_LABELS,
  type ServicingDocKey,
} from "@/lib/domain-ams";
import { missingServicingDocs, type ServicingFile } from "./checklist";

export type BookPolicy = {
  id: string;
  policyNumber: string;
  status: string;
  lineOfBusiness: string;
  expirationDate: Date | string | null;
  partyName: string;
};

export type BookHealthCounts = {
  active: number;
  lapsed: number;
  other: number;
  total: number;
};

export type MissingDocRow = {
  policyId: string;
  policyNumber: string;
  partyName: string;
  missing: ServicingDocKey[];
  labels: string[];
};

export function isLapsedBookStatus(status: string): boolean {
  const raw = status.toLowerCase();
  if (isEndedStatus(raw)) return true;
  return raw === "lapsed" || raw === "expired" || raw === "cancelled" || raw === "canceled";
}

export function bookHealthCounts(policies: { status: string }[]): BookHealthCounts {
  let active = 0;
  let lapsed = 0;
  let other = 0;
  for (const policy of policies) {
    if (isInForceStatus(policy.status)) active += 1;
    else if (isLapsedBookStatus(policy.status)) lapsed += 1;
    else other += 1;
  }
  return { active, lapsed, other, total: policies.length };
}

export function missingDocRows(
  policies: BookPolicy[],
  filesByPolicy: Map<string, ServicingFile[]>,
): MissingDocRow[] {
  const rows: MissingDocRow[] = [];
  for (const policy of policies) {
    if (!isInForceStatus(policy.status)) continue;
    const missing = missingServicingDocs(filesByPolicy.get(policy.id) ?? []);
    if (missing.length === 0) continue;
    rows.push({
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      partyName: policy.partyName,
      missing,
      labels: missing.map((key) => SERVICING_DOC_LABELS[key]),
    });
  }
  rows.sort((a, b) => b.missing.length - a.missing.length || a.policyNumber.localeCompare(b.policyNumber));
  return rows;
}
