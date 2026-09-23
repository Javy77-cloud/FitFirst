/**
 * Agent override when quoting / binding happened outside FitFirst
 * (legacy platform, carrier portal, one-portal quick bind, etc.).
 * Advances product stage without inventing fake quote rows or minting a policy.
 */

/** Stages agents may force without a live selected quote — match LATE_PRODUCT_STAGES. */
export const OUTSIDE_OVERRIDE_STAGES = [
  "quote_sent",
  "bound",
  "policy_issued",
  "closed_won",
] as const;

export type OutsideOverrideStage = (typeof OUTSIDE_OVERRIDE_STAGES)[number];

export type OutsideStageOverride = {
  reason: string;
  at: string;
  toStage: OutsideOverrideStage;
  agent?: string | null;
};

export type OutsideStageOverrideInput = {
  stageSlug: string;
  reason: string;
  agent?: string | null;
  at?: string | null;
};

const OUTSIDE_SET = new Set<string>(OUTSIDE_OVERRIDE_STAGES);

const STAGE_LABELS: Record<OutsideOverrideStage, string> = {
  quote_sent: "Quote sent",
  bound: "Bound",
  policy_issued: "Policy issued",
  closed_won: "Closed won",
};

function normalizeStageSlug(stage?: string | null): string {
  return (stage ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function isOutsideOverrideStage(stage?: string | null): stage is OutsideOverrideStage {
  return OUTSIDE_SET.has(normalizeStageSlug(stage));
}

export function outsideOverrideStageLabel(stage?: string | null): string {
  const key = normalizeStageSlug(stage);
  if (isOutsideOverrideStage(key)) return STAGE_LABELS[key];
  return key;
}

export function hasActiveOutsideOverride(
  override?: OutsideStageOverride | null | boolean,
): boolean {
  if (override === true) return true;
  if (!override || typeof override !== "object") return false;
  return Boolean(override.reason?.trim() && isOutsideOverrideStage(override.toStage));
}

export function parseOutsideStageOverride(raw: unknown): OutsideStageOverride | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as {
    reason?: unknown;
    at?: unknown;
    toStage?: unknown;
    agent?: unknown;
  };
  const reason = typeof row.reason === "string" ? row.reason.trim() : "";
  const toStage = normalizeStageSlug(typeof row.toStage === "string" ? row.toStage : "");
  if (!reason || !isOutsideOverrideStage(toStage)) return null;
  const at =
    typeof row.at === "string" && row.at.trim()
      ? row.at.trim()
      : new Date().toISOString();
  const agent =
    typeof row.agent === "string" && row.agent.trim() ? row.agent.trim() : null;
  return { reason, at, toStage, agent };
}

/** Validate + build the audit blob agents must confirm before forcing a late stage. */
export function buildOutsideStageOverride(
  input: OutsideStageOverrideInput,
):
  | { ok: true; override: OutsideStageOverride }
  | { ok: false; error: string } {
  const reason = (input.reason ?? "").trim();
  if (!reason) {
    return {
      ok: false,
      error: "Add a short reason (e.g. Quoted & bound in carrier portal offline).",
    };
  }
  if (reason.length > 500) {
    return { ok: false, error: "Reason must be 500 characters or fewer." };
  }
  const toStage = normalizeStageSlug(input.stageSlug);
  if (!isOutsideOverrideStage(toStage)) {
    return {
      ok: false,
      error: "Pick Quote sent, Bound, Policy issued, or Closed won.",
    };
  }
  return {
    ok: true,
    override: {
      reason,
      toStage,
      at: (input.at ?? "").trim() || new Date().toISOString(),
      agent: (input.agent ?? "").trim() || null,
    },
  };
}

export function outsideOverrideActivityTitle(input: {
  productLabel: string;
  toStage: string;
}): string {
  return `Outside FitFirst · ${input.productLabel} · ${outsideOverrideStageLabel(input.toStage)}`;
}

export function outsideOverrideActivityBody(input: {
  agent: string;
  productLabel: string;
  toStage: string;
  reason: string;
}): string {
  return `${input.agent} marked ${input.productLabel} as ${outsideOverrideStageLabel(input.toStage)} outside FitFirst. ${input.reason.trim()}`;
}

/** Visible deal stamp — agency can see quoting happened off-desk. */
export const OUTSIDE_FITFIRST_STAMP = "Quote obtained outside FitFirst / on carrier portal";

export function outsideFitFirstStampLabel(override?: OutsideStageOverride | null): string | null {
  if (!hasActiveOutsideOverride(override)) return null;
  return OUTSIDE_FITFIRST_STAMP;
}
