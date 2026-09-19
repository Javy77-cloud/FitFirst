import { renewalDaysPhrase, type RenewalUrgencyBand } from "@/lib/renewal/urgency";

export const CHASE_EVENT = "renewal_chase";
export const REVIEW_EVENT = "renewal_review";
export const REVIEW_SKIP_EVENT = "renewal_review_skip";

export const CHASE_MARK = {
  under30: "[renewal-chase:under30]",
  "30to60": "[renewal-chase:30to60]",
  "60to90": "[renewal-chase:60to90]",
  "90plus": "[renewal-chase:90plus]",
} as const;

export type ChaseTemplate = {
  band: RenewalUrgencyBand;
  slug: string;
  label: string;
  actionLabel: string;
  subject: string;
  body: string;
};

/** Agreed 90/60/30 copy: we know it is renewing, we are watching, we will shop if needed. */
export function chaseTemplateFor(input: {
  band: RenewalUrgencyBand;
  clientName: string;
  daysUntil: number;
  premiumDelta?: number | null;
  carrierName?: string | null;
  policyNumber?: string | null;
}): ChaseTemplate {
  const first = input.clientName.trim().split(/\s+/)[0] || "there";
  const days = renewalDaysPhrase(input.daysUntil);
  const policy = input.policyNumber?.trim();
  const policyBit = policy ? ` (${policy})` : "";

  if (input.band === "under30") {
    return {
      band: "under30",
      slug: "renewal-chase-under30",
      label: "30-day note",
      actionLabel: "Send 30-day note",
      subject: `We're on your renewal — ${days.toLowerCase()}`,
      body: `Hi ${first},\n\nWe know your policy${policyBit} is renewing. ${days}. We are watching it and working more quotes if we need them.\n\nNo action needed unless something changed — reply here and we will handle it.\n\n— Your FitFirst agent`,
    };
  }
  if (input.band === "30to60") {
    return {
      band: "30to60",
      slug: "renewal-chase-30to60",
      label: "60-day note",
      actionLabel: "Send 60-day note",
      subject: `Watching your renewal — ${days.toLowerCase()}`,
      body: `Hi ${first},\n\nWe know your policy${policyBit} is coming up for renewal. ${days}. We are watching the carrier offer and will shop more quotes if we need a better option.\n\nSit tight unless something at the house or with drivers changed.\n\n— Your FitFirst agent`,
    };
  }
  if (input.band === "60to90") {
    return {
      band: "60to90",
      slug: "renewal-chase-60to90",
      label: "90-day note",
      actionLabel: "Send 90-day note",
      subject: `We know this is renewing — ${days.toLowerCase()}`,
      body: `Hi ${first},\n\nJust a note that we know your policy${policyBit} is renewing. ${days}. We are already watching it and will work more quotes if needed.\n\nNothing for you to do today.\n\n— Your FitFirst agent`,
    };
  }
  return {
    band: "90plus",
    slug: "renewal-chase-90plus",
    label: "90-day note",
    actionLabel: "Send 90-day note",
    subject: `We know this is renewing — ${days.toLowerCase()}`,
    body: `Hi ${first},\n\nWe know your policy${policyBit} is on the renewal calendar. ${days}. We are watching it early and will shop more quotes if we need them.\n\nNo homework on your side unless something changed.\n\n— Your FitFirst agent`,
  };
}

export function parseChaseBand(text: string | null | undefined): RenewalUrgencyBand | null {
  const raw = text ?? "";
  if (raw.includes(CHASE_MARK.under30) || /renewal-chase:under30/.test(raw)) return "under30";
  if (raw.includes(CHASE_MARK["30to60"]) || /renewal-chase:30to60/.test(raw)) return "30to60";
  if (raw.includes(CHASE_MARK["60to90"]) || /renewal-chase:60to90/.test(raw)) return "60to90";
  if (raw.includes(CHASE_MARK["90plus"]) || /renewal-chase:90plus/.test(raw)) return "90plus";
  return null;
}

export type PrimaryRenewalAction = "chase" | "compare" | "done";

export function primaryRenewalAction(input: {
  chasedThisBand: boolean;
  canCompare: boolean;
}): PrimaryRenewalAction {
  if (!input.chasedThisBand) return "chase";
  if (input.canCompare) return "compare";
  return "done";
}

export function primaryActionLabel(
  action: PrimaryRenewalAction,
  template: Pick<ChaseTemplate, "actionLabel">,
): string {
  if (action === "chase") return template.actionLabel;
  if (action === "compare") return "Open compare";
  return template.label + " sent";
}
