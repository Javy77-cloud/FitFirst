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
      headline: "Commercial · Account + Policy",
      button: "Bind Closed Won — Account + Policy",
      whatHappens: `One click copies the Risk Profile onto an Account and writes one ${lineLabel} Policy. Quotes stay on the deal. You do not retype name, EIN, or address.`,
      partyLabel: "Account",
      policyLabel: "Policy",
    };
  }
  return {
    target,
    headline: "Personal · Contact + Policy",
    button: "Bind Closed Won — Contact + Policy",
    whatHappens: `One click copies the Risk Profile onto a Contact and writes one ${lineLabel} Policy. Quotes stay on the deal. You do not retype name, phone, or mailing.`,
    partyLabel: "Contact",
    policyLabel: "Policy",
  };
}

export function dealBindParty(input: {
  bindTarget: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  account: { id: string; name: string } | null;
  boundPolicies?: Array<{ contactId?: string | null; accountId?: string | null }>;
}): { kind: BindPathTarget; id: string; name: string; href: string } | null {
  const owner = input.boundPolicies?.find((policy) => policy.accountId || policy.contactId);
  if (owner?.accountId && input.account) {
    return {
      kind: "account",
      id: input.account.id,
      name: input.account.name,
      href: `/accounts/${input.account.id}`,
    };
  }
  if (owner?.contactId && input.contact) {
    return {
      kind: "contact",
      id: input.contact.id,
      name: `${input.contact.lastName}, ${input.contact.firstName}`,
      href: `/contacts/${input.contact.id}`,
    };
  }
  if (input.bindTarget === "account" && input.account) {
    return {
      kind: "account",
      id: input.account.id,
      name: input.account.name,
      href: `/accounts/${input.account.id}`,
    };
  }
  if (input.contact) {
    return {
      kind: "contact",
      id: input.contact.id,
      name: `${input.contact.lastName}, ${input.contact.firstName}`,
      href: `/contacts/${input.contact.id}`,
    };
  }
  if (input.account) {
    return {
      kind: "account",
      id: input.account.id,
      name: input.account.name,
      href: `/accounts/${input.account.id}`,
    };
  }
  return null;
}

export function dealGapPartyName(input: {
  bindTarget: string;
  contactName: string | null;
  accountName: string | null;
  fallback: string;
}): string {
  if (input.bindTarget === "account" && input.accountName) return input.accountName;
  return input.contactName ?? input.accountName ?? input.fallback;
}

export function closedWonPathSentence(input: {
  partyKind: "contact" | "account";
  partyName: string;
  policyNumber: string;
}): string {
  const party = input.partyKind === "account" ? "Account" : "Contact";
  return `Closed Won wrote ${party} ${input.partyName} + Policy ${input.policyNumber}. Quotes on this deal stayed quotes.`;
}
