export const FOLLOW_UP_METHODS = ["call", "text", "email"] as const;
export type FollowUpMethod = (typeof FOLLOW_UP_METHODS)[number];

export const FOLLOW_UP_DELAY_UNITS = ["minutes", "hours", "days"] as const;
export type FollowUpDelayUnit = (typeof FOLLOW_UP_DELAY_UNITS)[number];

/** How the agent is notified when a template step fires. */
export const REMIND_VIA_CHANNELS = ["task", "popup", "email"] as const;
export type RemindViaChannel = (typeof REMIND_VIA_CHANNELS)[number];

export const REMIND_VIA_LABELS: Record<RemindViaChannel, string> = {
  task: "Task",
  popup: "Pop-up",
  email: "Email",
};

export const FOLLOW_UP_DELAY_UNIT_LABELS: Record<FollowUpDelayUnit, string> = {
  minutes: "min",
  hours: "hours",
  days: "days",
};

/** Snooze on the follow-up pop-up lightbox — hours or days only. */
export const SNOOZE_DELAY_UNITS = ["hours", "days"] as const;
export type SnoozeDelayUnit = (typeof SNOOZE_DELAY_UNITS)[number];
export const MAX_SNOOZE_HOURS = 24 * 30;
export const MAX_SNOOZE_DAYS = 30;

export function isSnoozeDelayUnit(value: string | null | undefined): value is SnoozeDelayUnit {
  return Boolean(value && (SNOOZE_DELAY_UNITS as readonly string[]).includes(value));
}

export function snoozeDueAt(now: Date, amount: number, unit: SnoozeDelayUnit): Date {
  const raw = Number.isFinite(amount) ? Math.round(amount) : 1;
  if (unit === "days") {
    const n = Math.min(MAX_SNOOZE_DAYS, Math.max(1, raw));
    return new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
  }
  const n = Math.min(MAX_SNOOZE_HOURS, Math.max(1, raw));
  return new Date(now.getTime() + n * 60 * 60 * 1000);
}

export const MAX_FOLLOW_UP_STEPS = 4;

/** Statuses that have a seeded follow-up template. new leads use Default until override. */
export const DEFAULT_FOLLOW_UP_TRIGGER = "default";

export const TEMPLATE_TRIGGER_STATUSES = [
  { value: "new", label: "new", templateName: "Aggressive" },
  { value: "warm", label: "warm", templateName: "Steady" },
  { value: "cold", label: "Cold (not interested)", templateName: "Drip" },
  { value: DEFAULT_FOLLOW_UP_TRIGGER, label: "Default", templateName: "Default" },
] as const;

/** Per-lead Follow-up dropdown: Aggressive / Steady / Drip, then Default. */
export const FOLLOW_UP_OVERRIDE_OPTIONS = [
  { triggerStatus: "new", label: "Aggressive" },
  { triggerStatus: "warm", label: "Steady" },
  { triggerStatus: "cold", label: "Drip" },
  { triggerStatus: DEFAULT_FOLLOW_UP_TRIGGER, label: "Default" },
] as const;

export type FollowUpStepInput = {
  method?: string | null;
  delayAmount?: number | string | null;
  delayUnit?: string | null;
  message?: string | null;
  remindVia?: string | null;
};

export type FollowUpStepDraft = {
  method: FollowUpMethod;
  delayAmount: number;
  delayUnit: FollowUpDelayUnit;
  message: string;
  remindVia: RemindViaChannel;
};

export type FollowUpTemplateRecord = {
  id: string;
  name: string;
  triggerStatus: string;
  enabled: boolean;
};

export function isFollowUpMethod(value: string | null | undefined): value is FollowUpMethod {
  return Boolean(value && (FOLLOW_UP_METHODS as readonly string[]).includes(value));
}

export function isFollowUpDelayUnit(value: string | null | undefined): value is FollowUpDelayUnit {
  return Boolean(value && (FOLLOW_UP_DELAY_UNITS as readonly string[]).includes(value));
}

export function isRemindViaChannel(value: string | null | undefined): value is RemindViaChannel {
  return Boolean(value && (REMIND_VIA_CHANNELS as readonly string[]).includes(value));
}

export function normalizeRemindVia(value: string | null | undefined): RemindViaChannel {
  return isRemindViaChannel(value) ? value : "task";
}

export function remindViaLabel(value: string | null | undefined): string {
  return REMIND_VIA_LABELS[normalizeRemindVia(value)];
}

/** Never email Javy for internal agent pings — in-app instead. */
export function shouldEmailAgentReminder(agentEmail: string | null | undefined): boolean {
  const email = (agentEmail ?? "").trim().toLowerCase();
  if (!email) return false;
  if (email === "javy@fitfirst.local") return false;
  return true;
}

export function followUpMethodToActivityKind(method: FollowUpMethod): "call" | "sms" | "email" {
  return method === "text" ? "sms" : method;
}

export function delayMs(amount: number, unit: FollowUpDelayUnit): number {
  const n = Math.max(0, amount);
  if (unit === "days") return n * 24 * 60 * 60 * 1000;
  if (unit === "hours") return n * 60 * 60 * 1000;
  return n * 60 * 1000;
}

export function dueAtFromStep(now: Date, amount: number, unit: FollowUpDelayUnit): Date {
  return new Date(now.getTime() + delayMs(amount, unit));
}

export function normalizeFollowUpSteps(steps: FollowUpStepInput[]): FollowUpStepDraft[] {
  const next: FollowUpStepDraft[] = [];
  for (const step of steps) {
    if (next.length >= MAX_FOLLOW_UP_STEPS) break;
    if (!isFollowUpMethod(step.method) || !isFollowUpDelayUnit(step.delayUnit)) continue;
    const delayAmount = Number(step.delayAmount);
    if (!Number.isFinite(delayAmount) || delayAmount < 0) continue;
    next.push({
      method: step.method,
      delayAmount,
      delayUnit: step.delayUnit,
      message: (step.message ?? "").trim(),
      remindVia: normalizeRemindVia(step.remindVia),
    });
  }
  return next;
}

export function pickTemplateForLead<T extends FollowUpTemplateRecord>(
  templates: T[],
  lead: { followUpTemplateId?: string | null; status: string },
): T | null {
  const enabled = templates.filter((row) => row.enabled);
  if (lead.followUpTemplateId) {
    return enabled.find((row) => row.id === lead.followUpTemplateId) ?? null;
  }
  if (lead.status === "new") {
    return (
      enabled.find((row) => row.triggerStatus === DEFAULT_FOLLOW_UP_TRIGGER) ??
      enabled.find((row) => row.triggerStatus === "new") ??
      null
    );
  }
  return enabled.find((row) => row.triggerStatus === lead.status) ?? null;
}

export function shouldHoldFollowUpUntilFirstContact(lead: {
  status: string;
  firstContactAt?: Date | string | null;
}): boolean {
  return !lead.firstContactAt && lead.status === "new";
}

export function followUpTemplateChipName(template: {
  name: string;
  triggerStatus: string;
}): string {
  const trigger = TEMPLATE_TRIGGER_STATUSES.find((row) => row.value === template.triggerStatus);
  if (trigger) return trigger.templateName;
  return template.name;
}

export function followUpTemplateFullName(template: {
  name: string;
  triggerStatus: string;
}): string {
  const chip = followUpTemplateChipName(template);
  return template.name.trim() || chip;
}

export function outboundStubLabel(method: FollowUpMethod): string {
  if (method === "call") return "In-app call task — no trunk. Desk ping only.";
  if (method === "text") return "Stub — no paid SMS API. Queued in-desk only. Nothing texted.";
  return "Stub — no paid email API. Queued in-desk only. Nothing emailed.";
}

export const PAID_API_WALL_REASON = "paid_api_wall";
