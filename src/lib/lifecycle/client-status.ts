import {
  IN_FORCE_POLICY_STATUSES,
  type ClientStatus,
  type InForcePolicyStatus,
} from "@/lib/domain";

export function isInForcePolicyStatus(status: string | null | undefined): boolean {
  return IN_FORCE_POLICY_STATUSES.includes(
    (status ?? "").toLowerCase() as InForcePolicyStatus,
  );
}

export function clientStatusFromCounts(
  lifetimeCount: number,
  inForceCount: number,
): ClientStatus {
  if (inForceCount > 0) return "client";
  if (lifetimeCount > 0) return "former_client";
  return "not_a_client";
}

export function countPolicies(
  statuses: Array<string | null | undefined>,
): { lifetime: number; inForce: number; status: ClientStatus } {
  const lifetime = statuses.length;
  const inForce = statuses.filter((s) => isInForcePolicyStatus(s)).length;
  return { lifetime, inForce, status: clientStatusFromCounts(lifetime, inForce) };
}
