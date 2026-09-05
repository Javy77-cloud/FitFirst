export const FUNCTION_CATEGORIES = [
  "button",
  "automation",
  "schedule",
  "related_list",
  "signals",
  "validation",
  "standalone",
] as const;
export type FunctionCategory = (typeof FUNCTION_CATEGORIES)[number];

export const FUNCTION_CATEGORY_LABEL: Record<FunctionCategory, string> = {
  button: "Button",
  automation: "Automation",
  schedule: "Schedule",
  related_list: "Related List",
  signals: "Signals",
  validation: "Validation",
  standalone: "Standalone",
};

export const FUNCTION_LANGUAGES = ["typescript", "javascript", "deluge"] as const;
export type FunctionLanguage = (typeof FUNCTION_LANGUAGES)[number];

export const FUNCTION_LANGUAGE_LABEL: Record<FunctionLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  deluge: "Deluge-like (display only)",
};

export const WEBHOOK_EVENTS = [
  "record.created",
  "record.updated",
  "deal.stage_changed",
  "policy.bound",
  "task.due",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_LABEL: Record<WebhookEvent, string> = {
  "record.created": "record.created",
  "record.updated": "record.updated",
  "deal.stage_changed": "deal.stage_changed",
  "policy.bound": "policy.bound",
  "task.due": "task.due",
};

export const CONNECTION_KINDS = [
  "custom_oauth",
  "google",
  "outlook",
  "docusign",
  "stripe",
  "zoho_crm",
] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];

export const CONNECTION_KIND_LABEL: Record<ConnectionKind, string> = {
  custom_oauth: "Custom OAuth",
  google: "Google",
  outlook: "Outlook",
  docusign: "DocuSign",
  stripe: "Stripe",
  zoho_crm: "Zoho CRM sync",
};

export const CONNECTION_STATUSES = ["connected_demo", "needs_credentials"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const CONNECTION_STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected_demo: "Connected (demo)",
  needs_credentials: "Needs credentials",
};

export const HUB_TOOL_STATUSES = ["working", "stub", "needs_oauth"] as const;
export type HubToolStatus = (typeof HUB_TOOL_STATUSES)[number];

export const HUB_TOOL_STATUS_LABEL: Record<HubToolStatus, string> = {
  working: "Working",
  stub: "Stub",
  needs_oauth: "Needs OAuth",
};

export const ALLOWED_TRANSFORM_OPS = ["identity", "pick", "wrap", "set"] as const;
export type AllowedTransformOp = (typeof ALLOWED_TRANSFORM_OPS)[number];

export function isFunctionCategory(value: string): value is FunctionCategory {
  return (FUNCTION_CATEGORIES as readonly string[]).includes(value);
}

export function isFunctionLanguage(value: string): value is FunctionLanguage {
  return (FUNCTION_LANGUAGES as readonly string[]).includes(value);
}

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export function isConnectionKind(value: string): value is ConnectionKind {
  return (CONNECTION_KINDS as readonly string[]).includes(value);
}

export function slugifyApiName(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return slug || "untitled";
}

export function slugifyLinkName(raw: string): string {
  return slugifyApiName(raw);
}
