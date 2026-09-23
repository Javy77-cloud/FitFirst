import { reasonLabel } from "./reasons";
import { isEndedStatus, isInForceStatus, normalizePolicyStatus, policyStatusLabel, type PolicyChangeKind } from "./status";

export type PolicyOutcome = {
  kind: PolicyChangeKind | "in_force" | "ended";
  title: string;
  body: string;
  tone: "in_force" | "ended" | "info";
};

export function filedChangeOutcome(
  kind: PolicyChangeKind,
  policy: { status: string; endReason?: string | null; endedAt?: Date | null; coverageA?: number | null },
): PolicyOutcome {
  const reason = policy.endReason ? reasonLabel(kind, policy.endReason) : null;
  const when = policy.endedAt ? policy.endedAt.toISOString().slice(0, 10) : null;

  if (kind === "endorsement") {
    return {
      kind,
      title: "Endorsement filed — same policy",
      body: [
        "This Policy stays in force.",
        "Coverage and premium on this record are what the carrier endorsed.",
        "No new Policy was created. Quotes still are not coverage.",
      ].join(" "),
      tone: "in_force",
    };
  }

  if (kind === "cancellation") {
    return {
      kind,
      title: "Cancellation filed — off the book",
      body: [
        `Status is now ${policyStatusLabel(policy.status)}.`,
        when ? `Effective ${when}.` : "",
        reason ? `Reason: ${reason}.` : "",
        "Lifetime count keeps this Policy. In-force count drops it.",
        "A replacement shop is a new Deal — do not reopen this number.",
      ]
        .filter(Boolean)
        .join(" "),
      tone: "ended",
    };
  }

  return {
    kind,
    title: "Non-renewal filed — term will not continue",
    body: [
      `Status is now ${policyStatusLabel(policy.status)}.`,
      when ? `Effective ${when}.` : "",
      reason ? `Reason: ${reason}.` : "",
      "Same end as a cancellation: this Policy is off the book.",
      "Shop a replacement on a new Deal if the insured still needs coverage.",
    ]
      .filter(Boolean)
      .join(" "),
    tone: "ended",
  };
}

export function policyRecordOutcome(policy: {
  status: string;
  endReason?: string | null;
  endedAt?: Date | null;
}): PolicyOutcome {
  if (isInForceStatus(policy.status)) {
    return {
      kind: "in_force",
      title: `${policyStatusLabel(policy.status)} — in force`,
      body: "File an endorsement to change this Policy, or cancel / non-renew to take it off the book. Outcomes stay on this record.",
      tone: "in_force",
    };
  }
  if (isEndedStatus(policy.status)) {
    const kind = normalizePolicyStatus(policy.status) === "non_renewed" ? "non_renewal" : "cancellation";
    return filedChangeOutcome(kind, policy);
  }
  return {
    kind: "ended",
    title: policyStatusLabel(policy.status),
    body: "This Policy is not in force. File a new Deal to shop a replacement.",
    tone: "info",
  };
}
