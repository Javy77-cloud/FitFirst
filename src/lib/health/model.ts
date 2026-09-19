import type { RenewalRiskLevel } from "@/lib/renewal/urgency";

/** Policy health factor weights. Sum = 100. */
export const POLICY_HEALTH_WEIGHTS = {
  engagement: 24,
  bookShape: 12,
  velocity: 16,
  ratings: 18,
  openRisk: 22,
  deskSignals: 8,
} as const;

/** Client health factor weights. Sum = 100. Client health aggregates policies. */
export const CLIENT_HEALTH_WEIGHTS = {
  engagement: 20,
  bookShape: 20,
  velocity: 12,
  ratings: 16,
  openRisk: 18,
  policyRollup: 14,
} as const;

export type PolicyHealthFactorId = keyof typeof POLICY_HEALTH_WEIGHTS;
export type ClientHealthFactorId = keyof typeof CLIENT_HEALTH_WEIGHTS;

export type HealthFactorSource = "live" | "stub" | "neutral";

export type HealthFactor = {
  id: string;
  label: string;
  score: number;
  weight: number;
  why: string;
  source: HealthFactorSource;
};

export type HealthScore = {
  kind: "policy" | "client";
  score: number;
  band: RenewalRiskLevel;
  factors: HealthFactor[];
  why: string;
  flags: string[];
};

export type EngagementInput = {
  lastCommsDaysAgo: number | null;
  commsLast30: number;
  commsLast90: number;
  medianReplyHours: number | null;
};

export type BookShapeInput = {
  inForceCount: number;
  lifetimeCount: number;
  addedLast180: number;
  endedLast180: number;
  /** Days since first policy / contact tenureStart. */
  tenureDays?: number | null;
};

export type VelocityInput = {
  leadToDealDays: number | null;
  dealToCloseDays: number | null;
  openDealAgeDays: number | null;
  daysUntilRenewal: number | null;
  daysSinceRenewalComms: number | null;
};

export type RatingsInput = {
  ratings: number[];
  average: number | null;
};

export type OpenRiskInput = {
  under30Silence: boolean;
  coldOpenDeals: number;
  highAlertCount: number;
  cancelOrLapse: boolean;
  /** Stub until billing exists. Never changes the number. */
  paymentOverdue: boolean | null;
};

export type DeskSignalsInput = {
  daysUntilRenewal: number | null;
  premiumDelta: number | null;
  premium: number | null;
  inForce: boolean;
};

export const HEALTH_BANDS = {
  high: { max: 57, label: "High" },
  medium: { max: 74, label: "Medium" },
  low: { max: 100, label: "Low" },
} as const;

export function healthBand(score: number): RenewalRiskLevel {
  if (score <= HEALTH_BANDS.high.max) return "high";
  if (score <= HEALTH_BANDS.medium.max) return "medium";
  return "low";
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysToScore(days: number | null, good: number, mid: number, bad: number): number {
  if (days == null) return 58;
  if (days <= good) return 96;
  if (days <= mid) {
    const span = mid - good;
    return clampScore(96 - ((days - good) / Math.max(1, span)) * 28);
  }
  if (days <= bad) {
    const span = bad - mid;
    return clampScore(68 - ((days - mid) / Math.max(1, span)) * 30);
  }
  return clampScore(28 - Math.min(18, (days - bad) / 10));
}

export function scoreEngagement(input: EngagementInput): HealthFactor {
  const silence = daysToScore(input.lastCommsDaysAgo, 3, 10, 21);
  const freq =
    input.commsLast30 >= 4
      ? 100
      : input.commsLast30 === 3
        ? 88
        : input.commsLast30 === 2
          ? 76
          : input.commsLast30 === 1
            ? 62
            : input.commsLast90 >= 2
              ? 46
              : input.commsLast90 === 1
                ? 36
                : input.lastCommsDaysAgo == null
                  ? 52
                  : 22;
  const reply =
    input.medianReplyHours == null
      ? 58
      : input.medianReplyHours <= 4
        ? 100
        : input.medianReplyHours <= 24
          ? 86
          : input.medianReplyHours <= 72
            ? 68
            : input.medianReplyHours <= 168
              ? 48
              : 30;
  const score = clampScore(silence * 0.4 + freq * 0.35 + reply * 0.25);
  const silenceWhy =
    input.lastCommsDaysAgo == null
      ? "No platform-logged comms yet"
      : input.lastCommsDaysAgo === 0
        ? "Talked today"
        : `Silent ${input.lastCommsDaysAgo}d`;
  const replyWhy =
    input.medianReplyHours == null
      ? "reply speed unknown"
      : input.medianReplyHours < 24
        ? `replies in ${Math.max(1, Math.round(input.medianReplyHours))}h`
        : `replies in ${Math.round(input.medianReplyHours / 24)}d`;
  return {
    id: "engagement",
    label: "Conversation",
    score,
    weight: 0,
    why: `${silenceWhy} · ${input.commsLast30} comms / 30d · ${replyWhy}`,
    source: input.lastCommsDaysAgo == null && input.commsLast90 === 0 ? "neutral" : "live",
  };
}

export function tenurePhrase(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return "tenure unknown";
  if (days < 60) return "with us under 2mo";
  if (days < 365) return `with us ${Math.max(1, Math.round(days / 30))}mo`;
  const years = Math.floor(days / 365);
  return years <= 1 ? "with us 1y" : `with us ${years}y`;
}

export function scoreBookShape(input: BookShapeInput): HealthFactor {
  const base =
    input.inForceCount >= 3 ? 94 : input.inForceCount === 2 ? 80 : input.inForceCount === 1 ? 58 : 22;
  const addBoost = Math.min(20, input.addedLast180 * 8);
  const endHit = Math.min(50, input.endedLast180 * 22);
  const tenure =
    input.tenureDays == null
      ? 0
      : input.tenureDays < 90
        ? -8
        : input.tenureDays >= 365 * 3
          ? 6
          : 0;
  const score = clampScore(base + addBoost - endHit + tenure);
  const book =
    input.inForceCount === 0
      ? "No in-force policies"
      : input.inForceCount === 1
        ? "Monoline · 1 policy with us"
        : `${input.inForceCount} in-force policies`;
  const motion =
    input.endedLast180 > 0
      ? `${input.endedLast180} ended in 180d`
      : input.addedLast180 > 0
        ? `${input.addedLast180} added in 180d`
        : "no recent adds or cancels";
  return {
    id: "bookShape",
    label: "Book shape",
    score,
    why: `${book} · ${tenurePhrase(input.tenureDays)} · ${motion}`,
    source: "live",
    weight: 0,
  };
}

/** Last-night dig-in rows — talk, reply, policy count, tenure, adds/cancels, ratings. */
export function lockedHealthDigIn(input: {
  engagement: EngagementInput;
  bookShape: BookShapeInput;
  ratings: RatingsInput;
}): HealthFactor[] {
  const talk = scoreEngagement(input.engagement);
  const replyScore =
    input.engagement.medianReplyHours == null
      ? 58
      : input.engagement.medianReplyHours <= 4
        ? 100
        : input.engagement.medianReplyHours <= 24
          ? 86
          : input.engagement.medianReplyHours <= 72
            ? 68
            : input.engagement.medianReplyHours <= 168
              ? 48
              : 30;
  const replyWhy =
    input.engagement.medianReplyHours == null
      ? "Reply speed unknown"
      : input.engagement.medianReplyHours < 24
        ? `Replies in ${Math.max(1, Math.round(input.engagement.medianReplyHours))}h`
        : `Replies in ${Math.round(input.engagement.medianReplyHours / 24)}d`;
  const talkWhy =
    input.engagement.lastCommsDaysAgo == null
      ? "No platform-logged talk yet"
      : input.engagement.lastCommsDaysAgo === 0
        ? `Talked today · ${input.engagement.commsLast30} comms / 30d`
        : `Last talk ${input.engagement.lastCommsDaysAgo}d · ${input.engagement.commsLast30} comms / 30d`;
  const countScore =
    input.bookShape.inForceCount >= 3 ? 94 : input.bookShape.inForceCount === 2 ? 80 : input.bookShape.inForceCount === 1 ? 58 : 22;
  const tenureScore =
    input.bookShape.tenureDays == null
      ? 58
      : input.bookShape.tenureDays < 90
        ? 42
        : input.bookShape.tenureDays < 365
          ? 70
          : input.bookShape.tenureDays >= 365 * 3
            ? 92
            : 80;
  const motionScore = clampScore(78 + input.bookShape.addedLast180 * 8 - input.bookShape.endedLast180 * 22);
  const motionWhy =
    input.bookShape.endedLast180 > 0
      ? `${input.bookShape.endedLast180} cancel${input.bookShape.endedLast180 === 1 ? "" : "s"} in 180d`
      : input.bookShape.addedLast180 > 0
        ? `${input.bookShape.addedLast180} add${input.bookShape.addedLast180 === 1 ? "" : "s"} in 180d`
        : "No recent adds or cancels";
  const ratings = scoreRatings(input.ratings);
  return [
    {
      id: "interaction",
      label: "Talk history",
      score: talk.score,
      weight: 0,
      why: talkWhy,
      source: talk.source,
    },
    {
      id: "reply",
      label: "Reply",
      score: clampScore(replyScore),
      weight: 0,
      why: replyWhy,
      source: input.engagement.medianReplyHours == null ? "neutral" : "live",
    },
    {
      id: "policyCount",
      label: "Policies with us",
      score: countScore,
      weight: 0,
      why:
        input.bookShape.inForceCount === 0
          ? "No in-force policies"
          : `${input.bookShape.inForceCount} in-force · ${input.bookShape.lifetimeCount} lifetime`,
      source: "live",
    },
    {
      id: "tenure",
      label: "Tenure",
      score: tenureScore,
      weight: 0,
      why: tenurePhrase(input.bookShape.tenureDays),
      source: input.bookShape.tenureDays == null ? "neutral" : "live",
    },
    {
      id: "bookMotion",
      label: "Adds / cancels",
      score: motionScore,
      weight: 0,
      why: motionWhy,
      source: "live",
    },
    {
      id: "ratings",
      label: "Ratings",
      score: ratings.score,
      weight: 0,
      why: ratings.why,
      source: ratings.source,
    },
  ];
}

export function scoreVelocity(input: VelocityInput): HealthFactor {
  const leadDeal =
    input.leadToDealDays == null ? 60 : daysToScore(input.leadToDealDays, 3, 10, 21);
  const close =
    input.dealToCloseDays != null
      ? daysToScore(input.dealToCloseDays, 14, 30, 60)
      : input.openDealAgeDays != null
        ? daysToScore(input.openDealAgeDays, 10, 21, 45)
        : 60;
  let renewal = 62;
  if (input.daysUntilRenewal != null) {
    const silent = input.daysSinceRenewalComms;
    if (input.daysUntilRenewal < 30) {
      renewal = silent == null ? 34 : silent <= 7 ? 90 : silent <= 14 ? 48 : 22;
    } else if (input.daysUntilRenewal < 60) {
      renewal = silent == null ? 52 : silent <= 14 ? 86 : silent <= 28 ? 58 : 36;
    } else {
      renewal = silent == null ? 70 : silent <= 30 ? 88 : 64;
    }
  }
  const hasDealClock = input.leadToDealDays != null || input.dealToCloseDays != null || input.openDealAgeDays != null;
  const score = hasDealClock
    ? clampScore(leadDeal * 0.3 + close * 0.35 + renewal * 0.35)
    : clampScore(renewal);
  const parts: string[] = [];
  if (input.leadToDealDays != null) parts.push(`lead→deal ${input.leadToDealDays}d`);
  if (input.dealToCloseDays != null) parts.push(`deal→close ${input.dealToCloseDays}d`);
  else if (input.openDealAgeDays != null) parts.push(`open deal ${input.openDealAgeDays}d`);
  if (input.daysUntilRenewal != null) {
    parts.push(
      input.daysSinceRenewalComms == null
        ? "no renewal reply yet"
        : `renewal reply ${input.daysSinceRenewalComms}d ago`,
    );
  }
  if (parts.length === 0) parts.push("No velocity clocks yet");
  return {
    id: "velocity",
    label: "Velocity",
    score,
    why: parts.join(" · "),
    source: hasDealClock || input.daysUntilRenewal != null ? "live" : "neutral",
    weight: 0,
  };
}

export function scoreRatings(input: RatingsInput): HealthFactor {
  const underThree = input.ratings.filter((star) => star > 0 && star < 3).length;
  if (input.average == null || input.ratings.length === 0) {
    return {
      id: "ratings",
      label: "Agent ratings",
      score: 62,
      why: "No 5-star reviews yet",
      source: "neutral",
      weight: 0,
    };
  }
  const mapped = clampScore((input.average / 5) * 100);
  const flagged = underThree >= 2;
  const score = flagged ? Math.min(mapped, 35) : mapped;
  return {
    id: "ratings",
    label: "Agent ratings",
    score,
    why: flagged
      ? `${input.average.toFixed(1)}★ · two ratings under 3`
      : `${input.average.toFixed(1)}★ from ${input.ratings.length} review${input.ratings.length === 1 ? "" : "s"}`,
    source: "live",
    weight: 0,
  };
}

export function scoreOpenRisk(input: OpenRiskInput): HealthFactor {
  let score = 100;
  const bits: string[] = [];
  if (input.under30Silence) {
    score -= 35;
    bits.push("Under-30 silence");
  }
  if (input.coldOpenDeals > 0) {
    score -= Math.min(30, input.coldOpenDeals * 20);
    bits.push(`${input.coldOpenDeals} cold deal${input.coldOpenDeals === 1 ? "" : "s"}`);
  }
  if (input.highAlertCount > 0) {
    score -= Math.min(25, input.highAlertCount * 15);
    bits.push(`${input.highAlertCount} High desk alert${input.highAlertCount === 1 ? "" : "s"}`);
  }
  if (input.cancelOrLapse) {
    score -= 40;
    bits.push("Cancel / lapse flag");
  }
  if (input.paymentOverdue === true) {
    bits.push("Payment overdue (stub)");
  } else {
    bits.push("Payment flags stubbed — no billing yet");
  }
  if (bits.filter((bit) => !bit.includes("stub")).length === 1 && bits[0]?.includes("stub")) {
    bits.unshift("No open risk hits");
  }
  return {
    id: "openRisk",
    label: "Open risk",
    score: clampScore(score),
    why: bits.join(" · "),
    source: input.paymentOverdue === true ? "stub" : "live",
    weight: 0,
  };
}

export function scoreDeskSignals(input: DeskSignalsInput): HealthFactor {
  let urgency = 78;
  if (input.daysUntilRenewal != null) {
    if (input.daysUntilRenewal < 0) urgency = 28;
    else if (input.daysUntilRenewal < 30) urgency = 42;
    else if (input.daysUntilRenewal < 60) urgency = 64;
    else if (input.daysUntilRenewal < 90) urgency = 80;
    else urgency = 88;
  }
  let delta = 78;
  if (input.premiumDelta != null && Number.isFinite(input.premiumDelta)) {
    const pct =
      input.premium && input.premium > 0 ? (input.premiumDelta / input.premium) * 100 : null;
    if (input.premiumDelta > 400 || (pct != null && pct >= 15)) delta = 38;
    else if (input.premiumDelta > 150 || (pct != null && pct >= 8)) delta = 58;
    else if (input.premiumDelta > 0) delta = 70;
    else if (input.premiumDelta < 0) delta = 90;
    else delta = 82;
  }
  const status = input.inForce ? 88 : 40;
  const score = clampScore(urgency * 0.45 + delta * 0.4 + status * 0.15);
  const bits = [
    input.daysUntilRenewal == null
      ? "no renewal clock"
      : input.daysUntilRenewal < 0
        ? "overdue"
        : `${input.daysUntilRenewal}d to renewal`,
    input.premiumDelta == null
      ? "no premium delta"
      : input.premiumDelta > 0
        ? "premium up"
        : input.premiumDelta < 0
          ? "premium down"
          : "premium flat",
  ];
  return {
    id: "deskSignals",
    label: "Desk signals",
    score,
    why: bits.join(" · "),
    source: "live",
    weight: 0,
  };
}

function finalize(
  kind: HealthScore["kind"],
  weighted: Array<HealthFactor & { weight: number }>,
  extraFlags: string[] = [],
): HealthScore {
  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0) || 1;
  const raw = weighted.reduce((sum, row) => sum + row.score * row.weight, 0) / totalWeight;
  const score = clampScore(raw);
  const band = healthBand(score);
  const ranked = [...weighted].sort((a, b) => a.score - b.score || b.weight - a.weight);
  const weakest = ranked[0];
  const flags = [
    ...extraFlags,
    ...weighted.filter((row) => row.score <= 40).map((row) => row.label),
  ];
  return {
    kind,
    score,
    band,
    factors: weighted,
    why: weakest ? weakest.why : "Health looks steady",
    flags: [...new Set(flags)],
  };
}

export function computePolicyHealth(input: {
  engagement: EngagementInput;
  bookShape: BookShapeInput;
  velocity: VelocityInput;
  ratings: RatingsInput;
  openRisk: OpenRiskInput;
  deskSignals: DeskSignalsInput;
}): HealthScore {
  const factors: HealthFactor[] = [
    { ...scoreEngagement(input.engagement), weight: POLICY_HEALTH_WEIGHTS.engagement },
    { ...scoreBookShape(input.bookShape), weight: POLICY_HEALTH_WEIGHTS.bookShape },
    { ...scoreVelocity(input.velocity), weight: POLICY_HEALTH_WEIGHTS.velocity },
    { ...scoreRatings(input.ratings), weight: POLICY_HEALTH_WEIGHTS.ratings },
    { ...scoreOpenRisk(input.openRisk), weight: POLICY_HEALTH_WEIGHTS.openRisk },
    { ...scoreDeskSignals(input.deskSignals), weight: POLICY_HEALTH_WEIGHTS.deskSignals },
  ];
  const flags: string[] = [];
  if (input.ratings.ratings.filter((star) => star > 0 && star < 3).length >= 2) {
    flags.push("Two ratings under 3");
  }
  return finalize("policy", factors, flags);
}

export function computeClientHealth(input: {
  engagement: EngagementInput;
  bookShape: BookShapeInput;
  velocity: VelocityInput;
  ratings: RatingsInput;
  openRisk: OpenRiskInput;
  policyScores: number[];
}): HealthScore {
  const rollup =
    input.policyScores.length === 0
      ? 58
      : clampScore(input.policyScores.reduce((sum, row) => sum + row, 0) / input.policyScores.length);
  const rollupFactor: HealthFactor = {
    id: "policyRollup",
    label: "Policy rollup",
    score: rollup,
    weight: CLIENT_HEALTH_WEIGHTS.policyRollup,
    why:
      input.policyScores.length === 0
        ? "No policy scores to roll up"
        : `${input.policyScores.length} polic${input.policyScores.length === 1 ? "y" : "ies"} avg ${rollup}`,
    source: input.policyScores.length === 0 ? "neutral" : "live",
  };
  const factors: HealthFactor[] = [
    { ...scoreEngagement(input.engagement), weight: CLIENT_HEALTH_WEIGHTS.engagement },
    { ...scoreBookShape(input.bookShape), weight: CLIENT_HEALTH_WEIGHTS.bookShape },
    { ...scoreVelocity(input.velocity), weight: CLIENT_HEALTH_WEIGHTS.velocity },
    { ...scoreRatings(input.ratings), weight: CLIENT_HEALTH_WEIGHTS.ratings },
    { ...scoreOpenRisk(input.openRisk), weight: CLIENT_HEALTH_WEIGHTS.openRisk },
    rollupFactor,
  ];
  const flags: string[] = [];
  if (input.ratings.ratings.filter((star) => star > 0 && star < 3).length >= 2) {
    flags.push("Two ratings under 3");
  }
  return finalize("client", factors, flags);
}

export function healthWhyLine(score: HealthScore, fallback: string): string {
  const weak = [...score.factors].sort((a, b) => a.score - b.score)[0];
  if (!weak) return fallback;
  if (weak.score >= 75) return fallback;
  return weak.why;
}

export type HealthChipView = {
  kind: "policy" | "client";
  score: number;
  band: RenewalRiskLevel;
  why: string;
  flags: string[];
  factors: HealthFactor[];
};

export function toHealthChip(score: HealthScore, factors?: HealthFactor[]): HealthChipView {
  return {
    kind: score.kind,
    score: score.score,
    band: score.band,
    why: score.why,
    flags: score.flags,
    factors: factors ?? score.factors,
  };
}

export type AgentHealthRollup = {
  ownerId: string | null;
  ownerName: string;
  clientCount: number;
  averageScore: number;
  band: RenewalRiskLevel;
  highCount: number;
  mediumCount: number;
  lowCount: number;
};

export function rollupHealthScores(
  rows: Array<{ ownerId: string | null; ownerName: string; score: number }>,
): AgentHealthRollup {
  if (rows.length === 0) {
    return {
      ownerId: null,
      ownerName: "Book",
      clientCount: 0,
      averageScore: 0,
      band: "low",
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
  }
  const averageScore = clampScore(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
  const bands = rows.map((row) => healthBand(row.score));
  return {
    ownerId: rows[0]?.ownerId ?? null,
    ownerName: rows[0]?.ownerName ?? "Book",
    clientCount: rows.length,
    averageScore,
    band: healthBand(averageScore),
    highCount: bands.filter((band) => band === "high").length,
    mediumCount: bands.filter((band) => band === "medium").length,
    lowCount: bands.filter((band) => band === "low").length,
  };
}
