import { kindClass } from "@/lib/ops/calendar";

/** Call / SMS / E-mail — calendar `ff-cal-*` colors are the desk standard. */
export const CONTACT_ACTION_KINDS = ["call", "sms", "email"] as const;
export type ContactActionKind = (typeof CONTACT_ACTION_KINDS)[number];

export const CONTACT_ACTION_BUTTONS = [
  { kind: "call" as const, method: "call" as const, label: "Call" },
  { kind: "sms" as const, method: "text" as const, label: "SMS" },
  { kind: "email" as const, method: "email" as const, label: "E-mail" },
];

export function isContactActionKind(value: string): value is ContactActionKind {
  return (CONTACT_ACTION_KINDS as readonly string[]).includes(value);
}

/** Same classes Calendar uses for Call / SMS / Email chips and event blocks. */
export function contactActionButtonClass(kind: ContactActionKind): string {
  return kindClass(kind);
}

export function telHref(phone?: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function smsHref(phone?: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}` : null;
}

export function mailtoHref(email?: string | null): string | null {
  const value = email?.trim();
  return value ? `mailto:${value}` : null;
}

export function contactActionHref(
  kind: ContactActionKind,
  lead: { phone?: string | null; email?: string | null },
): string | null {
  if (kind === "call") return telHref(lead.phone);
  if (kind === "sms") return smsHref(lead.phone);
  return mailtoHref(lead.email);
}
