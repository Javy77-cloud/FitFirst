/** Call / SMS / E-mail — one platform fill set. Calendar toolbar + Leads both use these. */

export const CONTACT_ACTION_KINDS = ["call", "sms", "email"] as const;
export type ContactActionKind = (typeof CONTACT_ACTION_KINDS)[number];

/** KEEP palette from the Calendar Call / Email / SMS row (white labels). Not the green / orange / teal legend. */
export const CONTACT_ACTION_COLORS = {
  call: "#7A5C18",
  sms: "#AC401C",
  email: "#101C34",
} as const;

export const CONTACT_ACTION_BUTTONS = [
  { kind: "call" as const, method: "call" as const, label: "Call" },
  { kind: "sms" as const, method: "text" as const, label: "SMS" },
  { kind: "email" as const, method: "email" as const, label: "E-mail" },
];

export function isContactActionKind(value: string): value is ContactActionKind {
  return (CONTACT_ACTION_KINDS as readonly string[]).includes(value);
}

/** Shared class name. Fill hex lives in CONTACT_ACTION_COLORS and --ff-action-*. */
export function contactActionButtonClass(kind: ContactActionKind): string {
  return `ff-cal-${kind}`;
}

export function contactActionButtonStyle(kind: ContactActionKind): {
  backgroundColor: (typeof CONTACT_ACTION_COLORS)[ContactActionKind];
  color: "#ffffff";
} {
  return { backgroundColor: CONTACT_ACTION_COLORS[kind], color: "#ffffff" };
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
