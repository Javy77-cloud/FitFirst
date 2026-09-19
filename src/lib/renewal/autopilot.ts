import { chaseTemplateFor, type ChaseTemplate } from "@/lib/renewal/chase";
import { renewalUrgencyBand, type RenewalUrgencyBand } from "@/lib/renewal/urgency";
import type { PanelUrgency } from "@/lib/notifications/panel";

/** Desk queues the agreed 90/60/30 chase when the agent does not. */
export const AUTOPILOT_KIND = "renewal_autopilot";
export const AUTOPILOT_EVENT = "renewal_autopilot";
export const AUTOPILOT_ESCALATE_EVENT = "renewal_autopilot_escalate";
export const AUTOPILOT_SILENCE_DAYS = 5;

/** 90 / 60 / 30 only — 90+ stays on the board without a nag. */
export const AUTOPILOT_BANDS = ["under30", "30to60", "60to90"] as const;
export type AutopilotBand = (typeof AUTOPILOT_BANDS)[number];

export type AutopilotMeta = {
  band: AutopilotBand;
  queuedAt: string;
  escalated: boolean;
  escalatedAt?: string;
};

export function isAutopilotBand(band: RenewalUrgencyBand): band is AutopilotBand {
  return (AUTOPILOT_BANDS as readonly string[]).includes(band);
}

export function autopilotBandFor(daysUntil: number): AutopilotBand | null {
  const band = renewalUrgencyBand(daysUntil);
  return isAutopilotBand(band) ? band : null;
}

export function autopilotKey(policyId: string, band: AutopilotBand): string {
  return `${AUTOPILOT_KIND}:${policyId}:${band}`;
}

/** One card per policy+band. Never queue if the agent already sent this chase. */
export function shouldQueueAutopilot(input: {
  chasedThisBand: boolean;
  band: RenewalUrgencyBand | null;
}): boolean {
  if (input.chasedThisBand) return false;
  return input.band != null && isAutopilotBand(input.band);
}

/** Escalate once after N days of silence. Never a second escalate. */
export function shouldEscalateAutopilot(input: {
  queuedAt: Date;
  asOf: Date;
  alreadyEscalated: boolean;
  chasedThisBand: boolean;
  silenceDays?: number;
}): boolean {
  if (input.chasedThisBand || input.alreadyEscalated) return false;
  const gap = input.asOf.getTime() - input.queuedAt.getTime();
  const days = input.silenceDays ?? AUTOPILOT_SILENCE_DAYS;
  return gap >= days * 86_400_000;
}

export function autopilotUrgency(band: AutopilotBand, escalated: boolean): PanelUrgency {
  if (band === "under30") return "high";
  if (escalated) return band === "30to60" ? "high" : "medium";
  if (band === "30to60") return "medium";
  return "low";
}

export function autopilotTemplate(input: {
  band: AutopilotBand;
  clientName: string;
  daysUntil: number;
  premiumDelta?: number | null;
  carrierName?: string | null;
  policyNumber?: string | null;
}): ChaseTemplate {
  return chaseTemplateFor(input);
}

export function autopilotWhy(input: {
  band: AutopilotBand;
  daysUntil: number;
  escalated: boolean;
  silenceDays?: number;
}): string {
  const label =
    input.band === "under30" ? "30-day" : input.band === "30to60" ? "60-day" : "90-day";
  if (input.escalated) {
    const quiet = input.silenceDays ?? AUTOPILOT_SILENCE_DAYS;
    return `Autopilot escalated once · ${label} note still unconfirmed after ${quiet} silent days · ${input.daysUntil}d to renewal`;
  }
  return `Desk queued the ${label} chase · confirm to send · ${input.daysUntil}d to renewal`;
}

export function autopilotConfirmLabel(band: AutopilotBand, escalated: boolean): string {
  const label =
    band === "under30" ? "30-day note" : band === "30to60" ? "60-day note" : "90-day note";
  return escalated ? `Escalated · confirm ${label}` : `Confirm ${label}`;
}

const META_MARK = /<!--ff-autopilot:(\{[\s\S]*?\})-->/;

export function encodeAutopilotMeta(meta: AutopilotMeta): string {
  return `<!--ff-autopilot:${JSON.stringify(meta)}-->`;
}

export function parseAutopilotMeta(body: string | null | undefined): AutopilotMeta | null {
  const raw = body ?? "";
  const match = raw.match(META_MARK);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as Partial<AutopilotMeta>;
    if (!parsed.band || !isAutopilotBand(parsed.band) || !parsed.queuedAt) return null;
    return {
      band: parsed.band,
      queuedAt: parsed.queuedAt,
      escalated: Boolean(parsed.escalated),
      escalatedAt: parsed.escalatedAt,
    };
  } catch {
    return null;
  }
}

export function markAutopilotEscalated(body: string, at: Date): string {
  const meta = parseAutopilotMeta(body);
  if (!meta) return body;
  const next: AutopilotMeta = {
    ...meta,
    escalated: true,
    escalatedAt: at.toISOString(),
  };
  if (META_MARK.test(body)) return body.replace(META_MARK, encodeAutopilotMeta(next));
  return `${body}\n${encodeAutopilotMeta(next)}`;
}

export function autopilotCoveredPolicyIds<T extends { policyId?: string | null }>(
  cards: readonly T[],
): Set<string> {
  return new Set(cards.map((card) => card.policyId).filter((id): id is string => Boolean(id)));
}
