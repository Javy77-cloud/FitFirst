/** Settings → Developer Hub. Shared name with Functions/API/Webhooks/Connections core. */

export const DEV_HUB_MODULES = ["leads", "contacts", "deals", "policies", "tasks"] as const;
export type DevHubModule = (typeof DEV_HUB_MODULES)[number];

export const DEV_HUB_MODULE_LABEL: Record<DevHubModule, string> = {
  leads: "Leads",
  contacts: "Contacts",
  deals: "Deals",
  policies: "Policies",
  tasks: "Tasks",
};

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

export type MacroActions = {
  email: MacroEmailAction | null;
  fieldUpdates: MacroFieldUpdate[];
  createTasks: MacroCreateTask[];
};

export const ALLOWED_MACRO_FIELDS: Record<DevHubModule, readonly string[]> = {
  leads: ["status", "notes", "source"],
  contacts: ["status", "notes"],
  deals: ["notes", "pipelineStage"],
  policies: ["status"],
  tasks: ["status"],
};

export const MODULE_LIST_HREF: Record<DevHubModule, string> = {
  leads: "/leads",
  contacts: "/contacts",
  deals: "/deals",
  policies: "/policies",
  tasks: "/tasks",
};

export function isDevHubModule(value: string): value is DevHubModule {
  return (DEV_HUB_MODULES as readonly string[]).includes(value);
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
  return { email: null, fieldUpdates: [], createTasks: [] };
}
