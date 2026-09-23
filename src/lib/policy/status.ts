/**
 * Post-issue policy status model (Javy + Captain lock):
 * - active — in force
 * - lapsed — mid-term off-risk (usually non-pay); reinstate may still be possible. NOT expired.
 * - cancelled — mid-term end (insured request, UW, rewrite/replace, non-pay after reinstate closed)
 * - non_renewed — term ended; we or carrier chose not to continue
 * - expired — natural term end with no continuation on the books
 *
 * Pre-issue / pipeline: unpublished, bound, pending.
 * Legacy DB aliases (lapse, cancellation, canceled, non_renewal) normalize to the above.
 */

export const POLICY_STATUSES = [
  "unpublished",
  "bound",
  "pending",
  "active",
  "lapsed",
  "cancelled",
  "non_renewed",
  "expired",
] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const IN_FORCE_STATUSES: readonly PolicyStatus[] = ["bound", "active", "pending"];

/** Off-book / terminal after issued — not in force; must not drive renewal care. */
export const ENDED_STATUSES: readonly PolicyStatus[] = [
  "lapsed",
  "cancelled",
  "non_renewed",
  "expired",
];

export const POLICY_CHANGE_KINDS = [
  "endorsement",
  "cancellation",
  "non_renewal",
] as const;
export type PolicyChangeKind = (typeof POLICY_CHANGE_KINDS)[number];

const STATUS_LABELS: Record<PolicyStatus, string> = {
  unpublished: "Unpublished",
  bound: "Bound",
  pending: "Pending",
  active: "Active",
  lapsed: "Lapsed",
  cancelled: "Cancelled",
  non_renewed: "Non-renewed",
  expired: "Expired",
};

/** Map legacy / alternate spellings onto the canonical palette. */
const STATUS_ALIASES: Record<string, PolicyStatus> = {
  unpublished: "unpublished",
  bound: "bound",
  pending: "pending",
  active: "active",
  lapsed: "lapsed",
  lapse: "lapsed",
  cancelled: "cancelled",
  canceled: "cancelled",
  cancellation: "cancelled",
  non_renewed: "non_renewed",
  non_renewal: "non_renewed",
  nonrenewed: "non_renewed",
  nonrenewal: "non_renewed",
  expired: "expired",
  terminated: "cancelled",
};

export function normalizePolicyStatus(status: string | null | undefined): string {
  const key = (status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!key) return "";
  return STATUS_ALIASES[key] ?? key;
}

export function isPolicyStatus(value: string): value is PolicyStatus {
  return (POLICY_STATUSES as readonly string[]).includes(normalizePolicyStatus(value));
}

export function isInForceStatus(status: string): boolean {
  return (IN_FORCE_STATUSES as readonly string[]).includes(normalizePolicyStatus(status) as PolicyStatus);
}

export function isEndedStatus(status: string): boolean {
  return (ENDED_STATUSES as readonly string[]).includes(normalizePolicyStatus(status) as PolicyStatus);
}

/** Alias for product copy: off-book = ended / terminal statuses. */
export function isOffBookStatus(status: string | null | undefined): boolean {
  if (!status?.trim()) return false;
  return isEndedStatus(status);
}

export function policyStatusLabel(status: string): string {
  const normalized = normalizePolicyStatus(status);
  if ((POLICY_STATUSES as readonly string[]).includes(normalized)) {
    return STATUS_LABELS[normalized as PolicyStatus];
  }
  return status;
}

export function account360Counts(policies: { status: string }[]): {
  active: number;
  lifetime: number;
} {
  return {
    active: policies.filter((policy) => isInForceStatus(policy.status)).length,
    lifetime: policies.length,
  };
}
