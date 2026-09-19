/** Shared Developer Hub models. Same names as Settings siblings so those branches can merge. */

export const FUNCTION_CATEGORIES = [
  "button",
  "automation",
  "schedule",
  "standalone",
  "related_list",
  "signals",
  "validation",
] as const;
export type FunctionCategory = (typeof FUNCTION_CATEGORIES)[number];

export const FUNCTION_CATEGORY_LABEL: Record<FunctionCategory, string> = {
  button: "Button",
  automation: "Automation",
  schedule: "Schedule",
  standalone: "Standalone",
  related_list: "Related List",
  signals: "Signals",
  validation: "Validation",
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

export const DEV_HUB_MODULES = [
  "leads",
  "contacts",
  "deals",
  "policies",
  "tasks",
  "businesses",
  "campaigns",
  "quotes",
] as const;
export type DevHubModule = (typeof DEV_HUB_MODULES)[number];

export const DEV_HUB_MODULE_LABEL: Record<DevHubModule, string> = {
  leads: "Leads",
  contacts: "Contacts",
  deals: "Deals / Pipeline",
  policies: "Policies",
  tasks: "Tasks",
  businesses: "Accounts",
  campaigns: "Campaigns",
  quotes: "Quotes",
};

export const MACRO_KINDS = ["standard", "follow_up"] as const;
export type MacroKind = (typeof MACRO_KINDS)[number];

export const MACRO_KIND_LABEL: Record<MacroKind, string> = {
  standard: "Standard",
  follow_up: "Follow-up",
};

export const MACRO_STAGE_OPTIONS = [
  "shopping",
  "quoting",
  "comparing",
  "quote_sent",
  "closed_won",
  "bound",
  "lost",
  "closed_lost",
  "archive",
] as const;
export type MacroStage = (typeof MACRO_STAGE_OPTIONS)[number];

export const BUTTON_PLACEMENTS = ["list", "detail", "mass_action"] as const;
export type ButtonPlacement = (typeof BUTTON_PLACEMENTS)[number];

export const BUTTON_ACTION_KINDS = ["function", "url", "widget"] as const;
export type ButtonActionKind = (typeof BUTTON_ACTION_KINDS)[number];

export const VISIBILITY_PROFILES = ["admin", "agent"] as const;
export type VisibilityProfile = (typeof VISIBILITY_PROFILES)[number];

export const SCRIPT_PAGES = ["create", "edit", "detail"] as const;
export type ScriptPage = (typeof SCRIPT_PAGES)[number];

export const SCRIPT_EVENTS = ["onLoad", "onChange"] as const;
export type ScriptEvent = (typeof SCRIPT_EVENTS)[number];

export const WIDGET_TYPES = ["custom_button", "related_list", "settings", "home"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_HOSTING = ["internal", "external"] as const;
export type WidgetHosting = (typeof WIDGET_HOSTING)[number];

export const MACRO_EMAIL_CAP = 1;
export const MACRO_FIELD_UPDATE_CAP = 3;
export const MACRO_CREATE_TASK_CAP = 3;

export type MacroEmailAction = {
  templateId?: string | null;
  subject?: string;
  body?: string;
};

export type MacroFieldUpdate = {
  field: string;
  value: string;
};

export type MacroCreateTask = {
  title: string;
  kind?: string;
  dueInDays?: number;
};

export type MacroStageMove = {
  stage: string;
};

export type MacroActions = {
  email: MacroEmailAction | null;
  fieldUpdates: MacroFieldUpdate[];
  createTasks: MacroCreateTask[];
  stageMove?: MacroStageMove | null;
};

export const ALLOWED_MACRO_FIELDS: Record<DevHubModule, readonly string[]> = {
  leads: ["status", "notes", "source"],
  contacts: ["status", "notes"],
  deals: ["notes", "pipelineStage"],
  policies: ["status"],
  tasks: ["status"],
  businesses: ["notes"],
  campaigns: ["status"],
  quotes: ["notes"],
};

export const MODULE_LIST_HREF: Record<DevHubModule, string> = {
  leads: "/leads",
  contacts: "/contacts",
  deals: "/deals",
  policies: "/policies",
  tasks: "/tasks",
  businesses: "/accounts",
  campaigns: "/campaigns",
  quotes: "/quotes",
};

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

export function isDevHubModule(value: string): value is DevHubModule {
  return (DEV_HUB_MODULES as readonly string[]).includes(value);
}

export function isMacroKind(value: string): value is MacroKind {
  return (MACRO_KINDS as readonly string[]).includes(value);
}

export function isMacroStage(value: string): value is MacroStage {
  return (MACRO_STAGE_OPTIONS as readonly string[]).includes(value);
}

export function isButtonPlacement(value: string): value is ButtonPlacement {
  return (BUTTON_PLACEMENTS as readonly string[]).includes(value);
}

export function isButtonActionKind(value: string): value is ButtonActionKind {
  return (BUTTON_ACTION_KINDS as readonly string[]).includes(value);
}

export function isScriptPage(value: string): value is ScriptPage {
  return (SCRIPT_PAGES as readonly string[]).includes(value);
}

export function isScriptEvent(value: string): value is ScriptEvent {
  return (SCRIPT_EVENTS as readonly string[]).includes(value);
}

export function isWidgetType(value: string): value is WidgetType {
  return (WIDGET_TYPES as readonly string[]).includes(value);
}

export function isWidgetHosting(value: string): value is WidgetHosting {
  return (WIDGET_HOSTING as readonly string[]).includes(value);
}

export function emptyMacroActions(): MacroActions {
  return { email: null, fieldUpdates: [], createTasks: [], stageMove: null };
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

/** Inbound path slugs keep hyphens (`desk-echo`). */
export function slugifyInboundSlug(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "signal";
}
