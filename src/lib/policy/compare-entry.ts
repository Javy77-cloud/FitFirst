/**
 * Policy compare entry.
 *
 * Compare stays for the whole renewal window. Client staying / the
 * renewal-agreed stamp does not hide it. In-force policies outside that
 * window keep the unstamped current-vs-proposal compare.
 * After the advance demotes the old term to prior, the open compare is
 * prior vs current. A proposed term still on file is the renewal proposal.
 */

import { inRenewalCompareWindow } from "@/lib/renewal/days-to-renewal";

export function showPolicyCompareTerms(input: {
  inForce: boolean;
  /** Renewal agreed stamp is showing. Does not hide Compare. */
  renewalAgreed: boolean;
  /** Days until the renewal the desk is working. */
  daysUntilRenewal?: number | null;
}): boolean {
  return inRenewalCompareWindow(input.daysUntilRenewal) || input.inForce || input.renewalAgreed;
}

export type PolicyCompareKind = "current-proposed" | "prior-current";

export type PolicyComparePair = {
  kind: PolicyCompareKind;
  baselineLabel: string;
  renewalLabel: string;
};

const CURRENT_VS_PROPOSED: PolicyComparePair = {
  kind: "current-proposed",
  baselineLabel: "Current term",
  renewalLabel: "Proposed term",
};

/** Stamp is on and the renewal proposal is still a proposed term. */
const HANDLED_VS_PROPOSAL: PolicyComparePair = {
  kind: "current-proposed",
  baselineLabel: "Prior / current",
  renewalLabel: "Renewal proposal",
};

const PRIOR_VS_CURRENT: PolicyComparePair = {
  kind: "prior-current",
  baselineLabel: "Prior term",
  renewalLabel: "Current term",
};

export function policyComparePair(input: {
  renewalHandled: boolean;
  hasPrior: boolean;
  hasCurrent: boolean;
  hasProposed: boolean;
}): PolicyComparePair {
  if (input.renewalHandled && input.hasCurrent && input.hasProposed) {
    return HANDLED_VS_PROPOSAL;
  }
  if (!input.renewalHandled || input.hasProposed || !input.hasPrior || !input.hasCurrent) {
    return CURRENT_VS_PROPOSED;
  }
  return PRIOR_VS_CURRENT;
}

type TermLike = {
  role: string;
  termEffective: Date | string;
};

function termTime(value: Date | string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Latest prior by effective date. First current / proposed match the compare page. */
export function selectPolicyCompareTerms<T extends TermLike>(
  terms: readonly T[],
  renewalHandled: boolean,
): {
  pair: PolicyComparePair;
  baseline: T | undefined;
  renewal: T | undefined;
  /** Role=current, for the proposed-term form and compare log. */
  roleCurrent: T | undefined;
  /** Role=proposed, for the proposed-term form and compare log. */
  roleProposed: T | undefined;
} {
  const roleCurrent = terms.find((term) => term.role === "current");
  const roleProposed = terms.find((term) => term.role === "proposed");
  const priors = terms.filter((term) => term.role === "prior");
  const prior =
    priors.length === 0
      ? undefined
      : [...priors].sort((a, b) => termTime(b.termEffective) - termTime(a.termEffective))[0];
  const pair = policyComparePair({
    renewalHandled,
    hasPrior: Boolean(prior),
    hasCurrent: Boolean(roleCurrent),
    hasProposed: Boolean(roleProposed),
  });
  if (pair.kind === "prior-current") {
    return {
      pair,
      baseline: prior,
      renewal: roleCurrent,
      roleCurrent,
      roleProposed,
    };
  }
  return {
    pair,
    baseline: roleCurrent,
    renewal: roleProposed,
    roleCurrent,
    roleProposed,
  };
}
