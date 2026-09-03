import { isInForceStatus, type PolicyChangeKind } from "./status";

export type PolicySnapshot = {
  id: string;
  status: string;
  coverageA: number | null;
  premium: string | null;
  endedAt: Date | null;
  endReason: string | null;
};

export type PolicyChangeInput = {
  kind: PolicyChangeKind;
  effectiveDate: Date;
  reason: string;
  summary?: string;
  coverageA?: number | null;
  premium?: string | null;
};

export type PolicyEventDraft = {
  kind: PolicyChangeKind;
  effectiveDate: Date;
  reason: string;
  summary: string;
  changeSet: Record<string, unknown>;
};

export type PolicyChangeResult =
  | { ok: true; policy: PolicySnapshot; event: PolicyEventDraft }
  | { ok: false; error: string };

export function applyPolicyChange(
  policy: PolicySnapshot,
  input: PolicyChangeInput,
): PolicyChangeResult {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "Reason is required." };
  if (Number.isNaN(input.effectiveDate.getTime())) {
    return { ok: false, error: "A valid effective date is required." };
  }

  if (input.kind === "endorsement") {
    if (!isInForceStatus(policy.status)) {
      return { ok: false, error: "Endorsements only apply to a policy still in force." };
    }
    const next: PolicySnapshot = {
      ...policy,
      coverageA: input.coverageA ?? policy.coverageA,
      premium: input.premium ?? policy.premium,
    };
    return {
      ok: true,
      policy: next,
      event: {
        kind: "endorsement",
        effectiveDate: input.effectiveDate,
        reason,
        summary: input.summary?.trim() || `Endorsement — ${reason}`,
        changeSet: {
          coverageA: { from: policy.coverageA, to: next.coverageA },
          premium: { from: policy.premium, to: next.premium },
        },
      },
    };
  }

  if (!isInForceStatus(policy.status)) {
    return { ok: false, error: "This policy is already off the book." };
  }

  const endedStatus = input.kind === "cancellation" ? "cancellation" : "non_renewal";
  const noun = input.kind === "cancellation" ? "Cancellation" : "Non-renewal";
  return {
    ok: true,
    policy: {
      ...policy,
      status: endedStatus,
      endedAt: input.effectiveDate,
      endReason: reason,
    },
    event: {
      kind: input.kind,
      effectiveDate: input.effectiveDate,
      reason,
      summary: input.summary?.trim() || `${noun} — ${reason}`,
      changeSet: { status: { from: policy.status, to: endedStatus } },
    },
  };
}

export function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const day = trimmed.length === 10 ? `${trimmed}T12:00:00.000Z` : trimmed;
  const date = new Date(day);
  return Number.isNaN(date.getTime()) ? null : date;
}
