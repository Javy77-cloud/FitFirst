import { isEndedStatus, isInForceStatus } from "@/lib/policy/status";

/** Typical FL P&C rate-increase / notice window. Flag before it so the desk can shop. */
export const RATE_INCREASE_WINDOW = {
  startDays: 45,
  endDays: 75,
  flagBeforeDays: 90,
  watchDays: 120,
} as const;

export const RENEWAL_RISK_BANDS = ["watch", "elevated", "high", "critical"] as const;
export type RenewalRiskBand = (typeof RENEWAL_RISK_BANDS)[number];

export type RenewalRiskFactorId =
  | "days_to_renewal"
  | "premium_change"
  | "monoline"
  | "lapse_history"
  | "no_contact_60d"
  | "reply_gap"
  | "tenure"
  | "adds_cancels";

export type RenewalRiskFactor = {
  id: RenewalRiskFactorId;
  label: string;
  points: number;
  detail: string;
};

export type RenewalRiskInput = {
  daysToRenewal: number | null;
  premiumChangePct: number | null;
  inForceCount: number;
  hasLapseHistory: boolean;
  daysSinceContact: number | null;
  /** Days since we last reached out (outbound). */
  daysSinceOurTouch?: number | null;
  /** Days since they last wrote or called us (inbound). */
  daysSinceTheirReply?: number | null;
  /** Days this household has been with the agency. */
  tenureDays?: number | null;
  /** Ended / cancelled policies on the household. */
  cancelCount?: number;
  /** In-force adds in the last year. */
  addCount?: number;
};

export type RenewalRiskScore = {
  score: number;
  band: RenewalRiskBand;
  label: string;
  factors: RenewalRiskFactor[];
  flagged: boolean;
  inRateIncreaseWindow: boolean;
  beforeRateIncreaseWindow: boolean;
};

const BAND_LABEL: Record<RenewalRiskBand, string> = {
  watch: "Watch",
  elevated: "Elevated",
  high: "High",
  critical: "Critical",
};

export function daysUntil(from: Date, until: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

export function bandForScore(score: number): RenewalRiskBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "watch";
}

export function isInRateIncreaseWindow(daysToRenewal: number | null): boolean {
  if (daysToRenewal == null) return false;
  return daysToRenewal >= 0 && daysToRenewal <= RATE_INCREASE_WINDOW.endDays;
}

export function isBeforeRateIncreaseWindow(daysToRenewal: number | null): boolean {
  if (daysToRenewal == null) return false;
  return (
    daysToRenewal > RATE_INCREASE_WINDOW.endDays &&
    daysToRenewal <= RATE_INCREASE_WINDOW.flagBeforeDays
  );
}

function daysToRenewalFactor(days: number | null): RenewalRiskFactor {
  if (days == null) {
    return {
      id: "days_to_renewal",
      label: "Days to renewal",
      points: 0,
      detail: "No in-force expiration on file.",
    };
  }
  if (days < 0) {
    return {
      id: "days_to_renewal",
      label: "Days to renewal",
      points: 25,
      detail: `Expired ${Math.abs(days)} days ago — still marked in-force.`,
    };
  }
  if (days <= 30) {
    return {
      id: "days_to_renewal",
      label: "Days to renewal",
      points: 25,
      detail: `${days} days — already inside the rate-increase window.`,
    };
  }
  if (days <= 60) {
    return {
      id: "days_to_renewal",
      label: "Days to renewal",
      points: 30,
      detail: `${days} days — inside the typical 45–75 day rate-increase window.`,
    };
  }
  if (days <= 90) {
    return {
      id: "days_to_renewal",
      label: "Days to renewal",
      points: 20,
      detail: `${days} days — flag now, before the rate-increase window.`,
    };
  }
  if (days <= 120) {
    return {
      id: "days_to_renewal",
      label: "Days to renewal",
      points: 10,
      detail: `${days} days — early watch.`,
    };
  }
  return {
    id: "days_to_renewal",
    label: "Days to renewal",
    points: 0,
    detail: `${days} days — outside the 120-day watch.`,
  };
}

function premiumChangeFactor(pct: number | null): RenewalRiskFactor {
  if (pct == null || !Number.isFinite(pct)) {
    return {
      id: "premium_change",
      label: "Premium change",
      points: 0,
      detail: "Proposed premium not on file yet.",
    };
  }
  const display = `${pct > 0 ? "+" : ""}${(pct * 100).toFixed(1)}%`;
  if (pct >= 0.15) {
    return {
      id: "premium_change",
      label: "Premium change",
      points: 25,
      detail: `${display} proposed increase.`,
    };
  }
  if (pct >= 0.08) {
    return {
      id: "premium_change",
      label: "Premium change",
      points: 18,
      detail: `${display} proposed increase.`,
    };
  }
  if (pct > 0) {
    return {
      id: "premium_change",
      label: "Premium change",
      points: 10,
      detail: `${display} proposed increase.`,
    };
  }
  if (pct < 0) {
    return {
      id: "premium_change",
      label: "Premium change",
      points: 0,
      detail: `${display} proposed decrease.`,
    };
  }
  return {
    id: "premium_change",
    label: "Premium change",
    points: 0,
    detail: "Proposed premium is flat.",
  };
}

function replyGapFactor(input: RenewalRiskInput): RenewalRiskFactor {
  const ours = input.daysSinceOurTouch;
  const theirs = input.daysSinceTheirReply;
  if (ours != null && (theirs == null || theirs > ours + 13)) {
    const gap = theirs == null ? ours : theirs;
    return {
      id: "reply_gap",
      label: "Reply gap",
      points: gap >= 30 ? 12 : 8,
      detail: theirs == null ? `We reached out ${ours}d ago — no reply yet.` : `Reply gap ${gap}d.`,
    };
  }
  return {
    id: "reply_gap",
    label: "Reply gap",
    points: 0,
    detail: theirs != null ? `They replied ${theirs}d ago.` : "No outbound waiting on a reply.",
  };
}

function tenureFactor(days: number | null | undefined): RenewalRiskFactor {
  if (days == null) {
    return { id: "tenure", label: "Tenure", points: 0, detail: "Tenure not on file." };
  }
  if (days < 365) {
    return {
      id: "tenure",
      label: "Tenure",
      points: 8,
      detail: `With us ${Math.max(1, Math.round(days / 30))} mo — newer book.`,
    };
  }
  return {
    id: "tenure",
    label: "Tenure",
    points: 0,
    detail: `With us ${Math.round(days / 365)} yr.`,
  };
}

function addsCancelsFactor(input: RenewalRiskInput): RenewalRiskFactor {
  const cancels = input.cancelCount ?? 0;
  const adds = input.addCount ?? 0;
  if (cancels > 0) {
    return {
      id: "adds_cancels",
      label: "Adds / cancels",
      points: Math.min(15, 8 + cancels * 4),
      detail: `${cancels} cancel${cancels === 1 ? "" : "s"} on the book${adds ? ` · ${adds} add${adds === 1 ? "" : "s"}` : ""}.`,
    };
  }
  if (adds > 0) {
    return {
      id: "adds_cancels",
      label: "Adds / cancels",
      points: 0,
      detail: `${adds} add${adds === 1 ? "" : "s"} this year.`,
    };
  }
  return { id: "adds_cancels", label: "Adds / cancels", points: 0, detail: "No recent adds or cancels." };
}

export function scoreRenewalRisk(input: RenewalRiskInput): RenewalRiskScore {
  const factors: RenewalRiskFactor[] = [
    daysToRenewalFactor(input.daysToRenewal),
    premiumChangeFactor(input.premiumChangePct),
    {
      id: "monoline",
      label: "Monoline",
      points: input.inForceCount === 1 ? 15 : 0,
      detail:
        input.inForceCount === 1
          ? "One in-force policy — easier to shop away."
          : input.inForceCount <= 0
            ? "No in-force policies."
            : `${input.inForceCount} in-force policies.`,
    },
    {
      id: "lapse_history",
      label: "Lapse history",
      points: input.hasLapseHistory ? 20 : 0,
      detail: input.hasLapseHistory
        ? "Household has a lapse, cancellation, or non-renewal."
        : "No lapse or cancellation on file.",
    },
    {
      id: "no_contact_60d",
      label: "No contact 60d",
      points: input.daysSinceContact == null || input.daysSinceContact >= 60 ? 15 : 0,
      detail:
        input.daysSinceContact == null
          ? "No call, email, SMS, or meeting on this household."
          : input.daysSinceContact >= 60
            ? `Last contact ${input.daysSinceContact} days ago.`
            : `Last contact ${input.daysSinceContact} days ago.`,
    },
    replyGapFactor(input),
    tenureFactor(input.tenureDays),
    addsCancelsFactor(input),
  ];

  const score = Math.min(
    100,
    factors.reduce((sum, factor) => sum + factor.points, 0),
  );
  const band = bandForScore(score);
  const inWindow = isInRateIncreaseWindow(input.daysToRenewal);
  const beforeWindow = isBeforeRateIncreaseWindow(input.daysToRenewal);
  const approaching =
    input.daysToRenewal != null &&
    input.daysToRenewal >= 0 &&
    input.daysToRenewal <= RATE_INCREASE_WINDOW.flagBeforeDays;
  const flagged = approaching || score >= 25;

  return {
    score,
    band,
    label: BAND_LABEL[band],
    factors: factors.filter((factor) => factor.points > 0 || factor.id === "days_to_renewal"),
    flagged,
    inRateIncreaseWindow: inWindow,
    beforeRateIncreaseWindow: beforeWindow,
  };
}

export function nearestRenewalDays(
  policies: { status: string; expirationDate: Date | null; renewalDate?: Date | null }[],
  asOf: Date,
): number | null {
  const dates = policies
    .filter((policy) => isInForceStatus(policy.status))
    .map((policy) => policy.renewalDate ?? policy.expirationDate)
    .filter((date): date is Date => date instanceof Date);
  if (dates.length === 0) return null;
  return Math.min(...dates.map((date) => daysUntil(asOf, date)));
}

export function householdHasLapse(policies: { status: string }[]): boolean {
  return policies.some((policy) => isEndedStatus(policy.status) || /lapse|lapsed|expired|cancelled|canceled/.test(policy.status.toLowerCase()));
}

export function householdInForceCount(policies: { status: string }[]): number {
  return policies.filter((policy) => isInForceStatus(policy.status)).length;
}
