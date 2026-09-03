export const POLICY_STATUSES = [
  "bound",
  "active",
  "pending",
  "lapse",
  "cancellation",
  "non_renewal",
] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const IN_FORCE_STATUSES: readonly PolicyStatus[] = ["bound", "active", "pending"];
export const ENDED_STATUSES: readonly PolicyStatus[] = [
  "lapse",
  "cancellation",
  "non_renewal",
];

export const POLICY_CHANGE_KINDS = [
  "endorsement",
  "cancellation",
  "non_renewal",
] as const;
export type PolicyChangeKind = (typeof POLICY_CHANGE_KINDS)[number];

const STATUS_LABELS: Record<PolicyStatus, string> = {
  bound: "Bound",
  active: "Active",
  pending: "Pending",
  lapse: "Lapse",
  cancellation: "Cancellation",
  non_renewal: "Non-renewal",
};

export function isPolicyStatus(value: string): value is PolicyStatus {
  return (POLICY_STATUSES as readonly string[]).includes(value);
}

export function isInForceStatus(status: string): boolean {
  return (IN_FORCE_STATUSES as readonly string[]).includes(status);
}

export function isEndedStatus(status: string): boolean {
  return (ENDED_STATUSES as readonly string[]).includes(status);
}

export function policyStatusLabel(status: string): string {
  return isPolicyStatus(status) ? STATUS_LABELS[status] : status;
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
