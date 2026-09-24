export const EO_AUDIT_ACTIONS = [
  "email",
  "sms",
  "call",
  "meeting",
  "doc_view",
  "reveal_pii",
  "policy_change",
  "role_switch",
  "doc_delete",
  "doc_restore",
] as const;

export type EoAuditAction = (typeof EO_AUDIT_ACTIONS)[number];

export const EO_CLIENT_ACTIONS = ["email", "sms", "call", "meeting"] as const;
export type EoClientAction = (typeof EO_CLIENT_ACTIONS)[number];

export const EO_GAP_KINDS = [
  "renewal_silent_90",
  "bound_missing_signed_app",
  "quote_sent_no_followup",
] as const;

export type EoGapKind = (typeof EO_GAP_KINDS)[number];

export const EO_ACTION_LABEL: Record<EoAuditAction, string> = {
  email: "Email",
  sms: "SMS",
  call: "Call",
  meeting: "Meeting",
  doc_view: "Document view",
  reveal_pii: "Reveal PII",
  policy_change: "Policy change",
  role_switch: "Switch role",
  doc_delete: "Document delete",
  doc_restore: "Document restore",
};

export const EO_GAP_LABEL: Record<EoGapKind, string> = {
  renewal_silent_90: "No activity 90 days before renewal",
  bound_missing_signed_app: "Missing signed app on Bound",
  quote_sent_no_followup: "Quote sent with no follow-up task",
};

export const EO_GAP_SEVERITY: Record<EoGapKind, "warning" | "high"> = {
  renewal_silent_90: "warning",
  bound_missing_signed_app: "high",
  quote_sent_no_followup: "warning",
};

export const RENEWAL_SILENT_DAYS = 90;

export function isEoAuditAction(value: string): value is EoAuditAction {
  return (EO_AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function isEoClientAction(value: string): value is EoClientAction {
  return (EO_CLIENT_ACTIONS as readonly string[]).includes(value);
}

export function eoActionFromCommsKind(kind: string): EoClientAction | null {
  const next = kind.trim().toLowerCase();
  if (next === "email" || next === "sms" || next === "call" || next === "meeting") return next;
  return null;
}

export function eoActionLabel(action: string): string {
  return isEoAuditAction(action) ? EO_ACTION_LABEL[action] : action.replaceAll("_", " ");
}

export function eoGapLabel(kind: string): string {
  return (EO_GAP_LABEL as Record<string, string>)[kind] ?? kind.replaceAll("_", " ");
}
