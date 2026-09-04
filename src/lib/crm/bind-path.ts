import { DEAL_ID } from "@/lib/fixtures/ids";

export const ANA_BIND_BLOCKED = "Ana stays shopping. Do not bind this shop.";

export type BindPathTarget = "contact" | "account";

export type BindPathCopy = {
  target: BindPathTarget;
  headline: string;
  button: string;
  whatHappens: string;
  partyLabel: string;
  policyLabel: string;
};

export function isAnaDeal(dealId: string): boolean {
  return dealId === DEAL_ID;
}

export function assertAnaUnbound(dealId: string): void {
  if (isAnaDeal(dealId)) {
    throw new Error(ANA_BIND_BLOCKED);
  }
}

export function bindPathCopy(target: BindPathTarget, lineLabel = "this line"): BindPathCopy {
  if (target === "account") {
    return {
      target,
      headline: "Commercial · Business + Policy",
      button: "Bind Closed Won — Business + Policy",
      whatHappens: `One click copies the master sheet onto a Business and writes one ${lineLabel} Policy. Quotes stay on the deal. You do not retype name, EIN, or address.`,
      partyLabel: "Business",
      policyLabel: "Policy",
    };
  }
  return {
    target,
    headline: "Personal · Contact + Policy",
    button: "Bind Closed Won — Contact + Policy",
    whatHappens: `One click copies the master sheet onto a Contact and writes one ${lineLabel} Policy. Quotes stay on the deal. You do not retype name, phone, or mailing.`,
    partyLabel: "Contact",
    policyLabel: "Policy",
  };
}

export function closedWonPathSentence(input: {
  partyKind: "contact" | "account";
  partyName: string;
  policyNumber: string;
}): string {
  const party = input.partyKind === "account" ? "Business" : "Contact";
  return `Closed Won wrote ${party} ${input.partyName} + Policy ${input.policyNumber}. Quotes on this deal stayed quotes.`;
}
