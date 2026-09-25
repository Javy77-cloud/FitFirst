import { LINE_LABELS } from "@/lib/crm/bind";
import { policyProductDisplayLabel } from "@/lib/policy/eo";
import { sourceLabel } from "@/lib/crm/sources";
import { formatSilenceCue } from "@/lib/deals/card-glance";
import type { LineOfBusiness } from "@/lib/domain";
import { firstParam } from "@/lib/saved-filters";
import {
  leadCadenceLabel,
  leadStatusLabel,
  normalizeLeadCadence,
  normalizeLeadStatus,
  normalizeLeadTemperature,
  type LeadTemperature,
} from "@/lib/leads/queue";

/** Stack is the desk. Queue is the work sheet. */
export const LEADS_VIEWS = ["stack", "queue"] as const;
export type LeadsViewId = (typeof LEADS_VIEWS)[number];

export const LEADS_VIEW_OPTIONS: Array<[LeadsViewId, string]> = [
  ["stack", "Stack"],
  ["queue", "Queue"],
];

const PRESERVE_PARAMS = ["status", "cadence", "source", "temperature", "q", "rail", "saved", "qc"] as const;

/** Detail / legacy keys that mean Policy form on a lead. */
export const LEAD_POLICY_FORM_KEYS = [
  "insurance_subtype",
  "policy_form",
  "quoting_form",
  "form",
  "picklist",
] as const;

export function parseLeadsView(raw?: string | null): LeadsViewId {
  if (raw === "stack" || raw === "queue") return raw;
  // Legacy List / table / grid bookmarks land on Queue (the work sheet).
  if (raw === "list" || raw === "table" || raw === "grid") return "queue";
  return "stack";
}

export function leadsDeskHref(
  view: LeadsViewId,
  params: Record<string, string | string[] | undefined>,
): string {
  const next = new URLSearchParams();
  for (const key of PRESERVE_PARAMS) {
    const value = firstParam(params[key]);
    if (value) next.set(key, value);
  }
  if (view !== "stack") next.set("view", view);
  const qs = next.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

/** Lead Hot / Warm / Cold on the same heartbeat palette as Deals heat. Warm uses cooling. */
export function leadHeatClass(temperature: string | null | undefined): LeadTemperature {
  return normalizeLeadTemperature(temperature);
}

export function leadHeatLabel(temperature: string | null | undefined): string {
  const heat = leadHeatClass(temperature);
  if (heat === "warm") return "Warm";
  if (heat === "cold") return "Cold";
  return "Hot";
}

export function isLeadPolicyFormColumn(columnId: string): boolean {
  return (LEAD_POLICY_FORM_KEYS as readonly string[]).includes(columnId);
}

export function leadPolicyFormLabel(
  values: Record<string, string | null | undefined> | null | undefined,
): string {
  if (!values) return "";
  for (const key of LEAD_POLICY_FORM_KEYS) {
    const value = String(values[key] ?? "").trim();
    if (value) return policyProductDisplayLabel(value);
  }
  return "";
}

export function leadLobLabel(
  values: Record<string, string | null | undefined> | null | undefined,
  insuranceTypeDesired?: string | null,
): string {
  const category = String(values?.insurance_category ?? "").trim();
  if (category) return category;
  const desired = String(insuranceTypeDesired ?? values?.insurance_type_desired ?? "").trim();
  if (desired) {
    const known = LINE_LABELS[desired as LineOfBusiness];
    return policyProductDisplayLabel(known ?? desired);
  }
  const pipeline = String(values?.pipeline ?? values?.insurance_type ?? "").trim();
  return pipeline;
}

/** Product column: policy form when set, otherwise the line, otherwise the cadence. */
export function leadLineLabel(input: {
  policyForm?: string | null;
  lob?: string | null;
  cadence?: string | null;
}): string {
  const form = (input.policyForm ?? "").trim();
  if (form) return policyProductDisplayLabel(form);
  const lob = (input.lob ?? "").trim();
  if (lob) return policyProductDisplayLabel(lob);
  return leadCadenceLabel(input.cadence);
}

export function leadLayoutDisplayValue(
  columnId: string,
  values: Record<string, string | null | undefined>,
  insuranceTypeDesired?: string | null,
): string {
  if (isLeadPolicyFormColumn(columnId)) return leadPolicyFormLabel(values) || "—";
  if (columnId === "insurance_category" || columnId === "insurance_type_desired") {
    return leadLobLabel(values, insuranceTypeDesired) || "—";
  }
  const raw = String(values[columnId] ?? "").trim();
  return raw || "—";
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function leadSilenceCue(input: {
  createdAt: Date | string;
  firstContactAt?: Date | string | null;
  now?: Date;
}): { text: string; waitingOnFirstCall: boolean; silentDays: number } {
  const now = input.now ?? new Date();
  const created = asDate(input.createdAt) ?? now;
  const first = asDate(input.firstContactAt);
  if (!first) {
    const ms = Math.max(0, now.getTime() - created.getTime());
    const days = Math.floor(ms / 86_400_000);
    if (days < 1) {
      const hours = Math.max(1, Math.floor(ms / 3_600_000));
      return {
        text: hours === 1 ? "No first call · 1 hour" : `No first call · ${hours} hours`,
        waitingOnFirstCall: true,
        silentDays: ms / 86_400_000,
      };
    }
    return {
      text: days === 1 ? "No first call · 1 day" : `No first call · ${days} days`,
      waitingOnFirstCall: true,
      silentDays: days,
    };
  }
  const silentDays = Math.max(0, (now.getTime() - first.getTime()) / 86_400_000);
  return {
    text: formatSilenceCue(silentDays),
    waitingOnFirstCall: false,
    silentDays,
  };
}

export function leadNextChaseLabel(input: {
  nextDue?: Date | string | null;
  waitingOnFirstCall: boolean;
  clockDone?: boolean;
  now?: Date;
}): string {
  const due = asDate(input.nextDue);
  if (due) {
    const now = input.now ?? new Date();
    const time = due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (due.toDateString() === now.toDateString()) return `Next chase ${time}`;
    const date = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Next chase ${date} ${time}`;
  }
  if (input.waitingOnFirstCall) return "Chase the first call";
  if (input.clockDone) return "Follow-up complete";
  return "Set the next chase";
}

export type LeadDeskRecord = {
  id: string;
  name: string;
  href: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  sourceText: string;
  tags: string[];
  cadence: string;
  status: string;
  temperature: LeadTemperature;
  heatLabel: string;
  dueAt: string | null;
  clockDone: boolean;
  templateId: string | null;
  followUpName: string;
  resolvedTemplateId: string;
  nextDueLabel: string | null;
  nextChase: string;
  silence: string;
  waitingOnFirstCall: boolean;
  policyForm: string;
  lob: string;
  lineLabel: string;
  fieldValues: Record<string, string>;
  hay: string;
  parked: boolean;
  convertedDealId: string | null;
  archivedAt: string | Date | null;
};

export function presentLeadDesk(input: {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  status?: string | null;
  cadence?: string | null;
  temperature?: string | null;
  notes?: string | null;
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  tags?: string[] | null;
  createdAt: Date | string;
  firstContactAt?: Date | string | null;
  followUpTemplateId?: string | null;
  convertedDealId?: string | null;
  archivedAt?: string | Date | null;
  insuranceTypeDesired?: string | null;
  fieldValues?: Record<string, string | null | undefined>;
  nextDue?: Date | null;
  clockDone?: boolean;
  followUpName?: string;
  resolvedTemplateId?: string;
  parked?: boolean;
  now?: Date;
}): LeadDeskRecord {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.fieldValues ?? {})) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) values[key] = text;
  }
  const cadence = normalizeLeadCadence(input.cadence ?? values.cadence);
  const status = normalizeLeadStatus(input.status ?? values.status);
  const temperature = leadHeatClass(input.temperature ?? values.temperature);
  const silence = leadSilenceCue({
    createdAt: input.createdAt,
    firstContactAt: input.firstContactAt,
    now: input.now,
  });
  const policyForm = leadPolicyFormLabel(values);
  const lob = leadLobLabel(values, input.insuranceTypeDesired);
  const name = `${input.lastName}, ${input.firstName}`.trim();
  const nextDue = input.nextDue ?? null;
  const clockDone = Boolean(input.clockDone);
  const tags = input.tags ?? [];
  return {
    id: input.id,
    name,
    href: `/leads/${input.id}`,
    email: input.email ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    mailingAddress: input.mailingAddress ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    zip: input.zip ?? null,
    source: input.source ?? null,
    sourceText: sourceLabel(input.source),
    tags,
    cadence,
    status,
    temperature,
    heatLabel: leadHeatLabel(temperature),
    dueAt: nextDue ? nextDue.toISOString() : null,
    clockDone,
    templateId: input.followUpTemplateId ?? null,
    followUpName: input.followUpName || "—",
    resolvedTemplateId: input.resolvedTemplateId ?? "",
    nextDueLabel: nextDue ? nextDue.toLocaleString() : null,
    nextChase: leadNextChaseLabel({
      nextDue,
      waitingOnFirstCall: silence.waitingOnFirstCall,
      clockDone,
      now: input.now,
    }),
    silence: silence.text,
    waitingOnFirstCall: silence.waitingOnFirstCall,
    policyForm,
    lob,
    lineLabel: leadLineLabel({ policyForm, lob, cadence }),
    fieldValues: values,
    parked: Boolean(input.parked),
    convertedDealId: input.convertedDealId ?? null,
    archivedAt: input.archivedAt ?? null,
    hay: [
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.source,
      status,
      leadCadenceLabel(cadence),
      leadStatusLabel(status),
      policyForm,
      lob,
      ...tags,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
