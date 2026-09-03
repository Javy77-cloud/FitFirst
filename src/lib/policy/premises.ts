import { isEndedStatus, isInForceStatus } from "./status";

export type PremisesParts = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

function cleanPart(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[.#,/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePremises(parts: PremisesParts): string {
  const zip5 = (parts.zip ?? "").replace(/\D/g, "").slice(0, 5);
  return [cleanPart(parts.address1), cleanPart(parts.city), cleanPart(parts.state), zip5]
    .filter(Boolean)
    .join(" | ");
}

export type MatchablePolicy = {
  id: string;
  policyNumber: string;
  status: string;
  premisesKey: string;
};

/**
 * Replacement notices resolve the written policy at the insured premises.
 * A cancelled / non-renewed policy number is never a match key — that number
 * should not exist as the way to find a rewrite.
 */
export function matchReplacementPolicies(
  policies: MatchablePolicy[],
  query: PremisesParts & { policyNumber?: string | null },
): MatchablePolicy[] {
  const key = normalizePremises(query);
  void query.policyNumber;
  if (!key) return [];
  return policies.filter((policy) => isInForceStatus(policy.status) && policy.premisesKey === key);
}

export function resolvePolicyNumberForNotice(
  policies: MatchablePolicy[],
  policyNumber: string | null | undefined,
): { policy: MatchablePolicy | null; ignoredCancelledNumber: string | null } {
  const needle = (policyNumber ?? "").trim();
  if (!needle) return { policy: null, ignoredCancelledNumber: null };
  const hit = policies.find((policy) => policy.policyNumber === needle);
  if (!hit) return { policy: null, ignoredCancelledNumber: null };
  if (isEndedStatus(hit.status)) {
    return { policy: null, ignoredCancelledNumber: hit.policyNumber };
  }
  return { policy: hit, ignoredCancelledNumber: null };
}
