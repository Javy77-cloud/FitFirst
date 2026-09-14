export const FOLLOW_UP_METHODS = ["call", "text", "email", "skip"] as const;
export type FollowUpMethod = (typeof FOLLOW_UP_METHODS)[number];

export const FOLLOW_UP_METHOD_LABELS: Record<FollowUpMethod, string> = {
  call: "Call",
  text: "Text",
  email: "Email",
  skip: "Skip",
};

export function followUpMethodEditorLabel(method: string | null | undefined): string {
  const key = (method ?? "").trim().toLowerCase();
  return FOLLOW_UP_METHOD_LABELS[key as FollowUpMethod] ?? (method ?? "");
}

export function isSkipFollowUpMethod(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "skip";
}

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

/** Snooze presets on every reminder channel — 15 min / 1 hour / 1 day, plus Custom. */
export const SNOOZE_DELAY_UNITS = ["minutes", "hours", "days"] as const;
export type SnoozeDelayUnit = (typeof SNOOZE_DELAY_UNITS)[number];
export const MAX_SNOOZE_MINUTES = 24 * 60 * 30;
export const MAX_SNOOZE_HOURS = 24 * 30;
export const MAX_SNOOZE_DAYS = 30;
export const FOLLOW_UP_MODAL_REOPEN_MS = 10 * 60 * 1000;
export const FOLLOW_UP_HIDE_COOKIE = "ff_follow_up_modal_hide";

export const SNOOZE_PRESETS = [
  { label: "Snooze 15 min", amount: 15, unit: "minutes" as const },
  { label: "Snooze 1 hour", amount: 1, unit: "hours" as const },
  { label: "Snooze 1 day", amount: 1, unit: "days" as const },
] as const;

/**
 * Future SMS vendor: inbound reply keyword `Snooze 1h` (also `Snooze 15m` / `Snooze 1d`)
 * should call the same snooze path. Do not build an SMS vendor in this desk.
 */
export const SMS_SNOOZE_KEYWORD = "Snooze 1h";

export function isSnoozeDelayUnit(value: string | null | undefined): value is SnoozeDelayUnit {
  return Boolean(value && (SNOOZE_DELAY_UNITS as readonly string[]).includes(value));
}

export function snoozeDueAt(now: Date, amount: number, unit: SnoozeDelayUnit): Date {
  const raw = Number.isFinite(amount) ? Math.round(amount) : 1;
  if (unit === "minutes") {
    const n = Math.min(MAX_SNOOZE_MINUTES, Math.max(1, raw));
    return new Date(now.getTime() + n * 60 * 1000);
  }
  if (unit === "days") {
    const n = Math.min(MAX_SNOOZE_DAYS, Math.max(1, raw));
    return new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
  }
  const n = Math.min(MAX_SNOOZE_HOURS, Math.max(1, raw));
  return new Date(now.getTime() + n * 60 * 60 * 1000);
}

export const MAX_FOLLOW_UP_STEPS = 4;

/** Default playbook is mapped to status contacted — not new, not a manual pick. */
export const DEFAULT_FOLLOW_UP_TRIGGER = "contacted";

export const TEMPLATE_TRIGGER_STATUSES = [
  { value: "new", label: "new", templateName: "Aggressive" },
  { value: "warm", label: "warm", templateName: "Steady" },
  { value: "cold", label: "Cold (not interested)", templateName: "Drip" },
  { value: DEFAULT_FOLLOW_UP_TRIGGER, label: "contacted", templateName: "Default" },
] as const;

/** Per-lead Follow-up dropdown: Aggressive / Steady / Drip override Default. */
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

export function followUpMethodToActivityKind(method: FollowUpMethod): "call" | "sms" | "email" | null {
  if (method === "skip") return null;
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

export function isDefaultFollowUpTrigger(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === DEFAULT_FOLLOW_UP_TRIGGER || raw === "default";
}

export function isDefaultFollowUpTemplate(template: {
  name?: string | null;
  triggerStatus?: string | null;
} | null | undefined): boolean {
  if (!template) return false;
  if (isDefaultFollowUpTrigger(template.triggerStatus)) return true;
  return (template.name ?? "").trim().toLowerCase() === "default";
}

function asTemplateList<T>(templates: T[] | null | undefined): T[] {
  return Array.isArray(templates) ? templates.filter((row): row is T => row != null) : [];
}

export function findDefaultFollowUpTemplate<T extends FollowUpTemplateRecord>(
  templates: T[] | null | undefined,
): T | null {
  const enabled = asTemplateList(templates).filter((row) => row.enabled !== false);
  return (
    enabled.find((row) => row.triggerStatus === DEFAULT_FOLLOW_UP_TRIGGER) ??
    enabled.find((row) => isDefaultFollowUpTemplate(row)) ??
    null
  );
}

/** Status → bound template. Clock starts on that status with no manual pick. */
export const CLOCK_TRIGGER_STATUSES = {
  new: "Aggressive",
  contacted: "Default",
  warm: "Steady",
  cold: "Drip",
} as const;

export type ClockTriggerStatus = keyof typeof CLOCK_TRIGGER_STATUSES;

export function normalizeClockStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

export function isClockTriggerStatus(status: string | null | undefined): status is ClockTriggerStatus {
  return normalizeClockStatus(status) in CLOCK_TRIGGER_STATUSES;
}

/** Clock starts on Cadence the template is bound to — new / contacted / warm / cold. */
export function canStartFollowUpClock(status: string | null | undefined): boolean {
  const key = normalizeClockStatus(status);
  return Boolean(key && key !== "none");
}

export function pickTemplateForLead<T extends FollowUpTemplateRecord>(
  templates: T[] | null | undefined,
  lead: {
    followUpTemplateId?: string | null;
    status?: string | null;
    cadence?: string | null;
  } | null | undefined,
): T | null {
  const enabled = asTemplateList(templates).filter((row) => row.enabled !== false && row.id);
  if (!lead) return null;
  if (lead.followUpTemplateId) {
    const override = enabled.find((row) => row.id === lead.followUpTemplateId);
    if (override && !isDefaultFollowUpTemplate(override)) return override;
  }
  // Follow-up clocks bind to Cadence (new/contacted/warm/cold + agency picklist values).
  const clockKey = normalizeClockStatus(lead.cadence ?? lead.status);
  if (!clockKey || clockKey === "none") return null;
  if (clockKey === DEFAULT_FOLLOW_UP_TRIGGER || clockKey === "default") {
    return findDefaultFollowUpTemplate(enabled);
  }
  const byTrigger = enabled.find((row) => normalizeClockStatus(row.triggerStatus) === clockKey);
  if (byTrigger) return byTrigger;
  if (!isClockTriggerStatus(clockKey)) return null;
  const boundName = CLOCK_TRIGGER_STATUSES[clockKey];
  return (
    enabled.find((row) => followUpTemplateChipName(row) === boundName) ??
    enabled.find((row) => (row.name ?? "").trim() === boundName) ??
    null
  );
}

/** Hold when Cadence has no bound template and there is no override. */
export function shouldHoldFollowUpUntilFirstContact(lead: {
  status?: string;
  cadence?: string | null;
  firstContactAt?: Date | string | null;
}): boolean {
  return !canStartFollowUpClock(lead.cadence ?? lead.status);
}

export function dedupeFollowUpSteps<T extends { id?: string | null; sortOrder?: number | null }>(
  steps: T[] | null | undefined,
): Array<T & { id: string; sortOrder: number }> {
  const list = Array.isArray(steps) ? steps : [];
  const seen = new Set<string>();
  return list
    .filter((step): step is T & { id: string; sortOrder: number } =>
      Boolean(step && step.id && Number.isFinite(step.sortOrder)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((step) => {
      if (seen.has(step.id)) return false;
      seen.add(step.id);
      return true;
    })
    .slice(0, MAX_FOLLOW_UP_STEPS);
}

export function nextTemplateStep<T extends { id?: string; sortOrder: number }>(
  steps: T[] | null | undefined,
  afterSortOrder = -1,
): T | null {
  const list = Array.isArray(steps) ? steps.filter((step) => step != null) : [];
  const unique = list.some((step) => step.id)
    ? dedupeFollowUpSteps(list.filter((step): step is T & { id: string } => Boolean(step?.id)))
    : [...list].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, MAX_FOLLOW_UP_STEPS);
  return unique.find((step) => step.sortOrder > afterSortOrder) ?? null;
}

export function followUpEmailSnoozeBody(basePath: string, queueId: string): string {
  const root = basePath.replace(/\/$/, "");
  return [
    "Snooze this reminder:",
    `${root}/api/follow-up/snooze?queueId=${queueId}&amount=15&unit=minutes  (Snooze 15 min)`,
    `${root}/api/follow-up/snooze?queueId=${queueId}&amount=1&unit=hours  (Snooze 1 hour)`,
    `${root}/api/follow-up/snooze?queueId=${queueId}&amount=1&unit=days  (Snooze 1 day)`,
  ].join("\n");
}

export function parseFollowUpHideCookie(
  value: string | null | undefined,
): { alertId: string; until: number; leadId: string | null } | null {
  if (!value) return null;
  const [alertId, untilRaw, leadId] = value.split(":");
  const until = Number(untilRaw);
  if (!alertId || !Number.isFinite(until)) return null;
  return { alertId, until, leadId: leadId || null };
}

export function shouldShowFollowUpModal(
  alert: { id: string; readAt?: Date | string | null; entityId?: string | null },
  hide: { alertId: string; until: number } | null,
  pathname: string | null | undefined,
  now = Date.now(),
): boolean {
  if (alert.readAt) return false;
  if (hide && hide.alertId === alert.id && now < hide.until) return false;
  if (alert.entityId && pathname === `/leads/${alert.entityId}`) return false;
  return true;
}

export function followUpTemplateChipName(template: {
  name?: string | null;
  triggerStatus?: string | null;
} | null | undefined): string {
  if (!template) return "";
  if (isDefaultFollowUpTemplate(template)) return "Default";
  const trigger = TEMPLATE_TRIGGER_STATUSES.find(
    (row) => row.value === normalizeClockStatus(template.triggerStatus),
  );
  if (trigger) return trigger.templateName;
  return (template.name ?? "").trim();
}

export function followUpTemplateFullName(template: {
  name?: string | null;
  triggerStatus?: string | null;
} | null | undefined): string {
  if (!template) return "";
  const chip = followUpTemplateChipName(template);
  return (template.name ?? "").trim() || chip;
}

export function outboundStubLabel(method: FollowUpMethod): string {
  if (method === "skip") return "Skip — no contact. Clock advances to the next step.";
  if (method === "call") return "In-app call task — no trunk. Desk ping only.";
  if (method === "text") return "Stub — no paid SMS API. Queued in-desk only. Nothing texted.";
  return "Stub — no paid email API. Queued in-desk only. Nothing emailed.";
}

export const PAID_API_WALL_REASON = "paid_api_wall";
