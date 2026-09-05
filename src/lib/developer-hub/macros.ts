import {
  ALLOWED_MACRO_FIELDS,
  DEV_HUB_MODULE_LABEL,
  MACRO_CREATE_TASK_CAP,
  MACRO_EMAIL_CAP,
  MACRO_FIELD_UPDATE_CAP,
  emptyMacroActions,
  isDevHubModule,
  isMacroKind,
  isMacroStage,
  type DevHubModule,
  type MacroActions,
  type MacroCreateTask,
  type MacroEmailAction,
  type MacroFieldUpdate,
  type MacroKind,
  type MacroStageMove,
} from "./types";

export function parseMacroActions(raw: unknown): MacroActions {
  const empty = emptyMacroActions();
  if (!raw || typeof raw !== "object") return empty;
  const row = raw as Record<string, unknown>;
  const email = parseEmail(row.email);
  const fieldUpdates = Array.isArray(row.fieldUpdates)
    ? row.fieldUpdates.map(parseFieldUpdate).filter((item): item is MacroFieldUpdate => Boolean(item))
    : [];
  const createTasks = Array.isArray(row.createTasks)
    ? row.createTasks.map(parseCreateTask).filter((item): item is MacroCreateTask => Boolean(item))
    : [];
  const stageMove = parseStageMove(row.stageMove);
  return clampMacroActions({ email, fieldUpdates, createTasks, stageMove });
}

function parseStageMove(raw: unknown): MacroStageMove | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const stage = typeof row.stage === "string" ? row.stage.trim() : "";
  if (!stage || !isMacroStage(stage)) return null;
  return { stage };
}

function parseEmail(raw: unknown): MacroEmailAction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const templateId = typeof row.templateId === "string" && row.templateId ? row.templateId : null;
  const subject = typeof row.subject === "string" ? row.subject : "";
  const body = typeof row.body === "string" ? row.body : "";
  if (!templateId && !subject && !body) return null;
  return { templateId, subject, body };
}

function parseFieldUpdate(raw: unknown): MacroFieldUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const field = typeof row.field === "string" ? row.field.trim() : "";
  const value = typeof row.value === "string" ? row.value : String(row.value ?? "");
  if (!field) return null;
  return { field, value };
}

function parseCreateTask(raw: unknown): MacroCreateTask | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return null;
  const kind = typeof row.kind === "string" && row.kind.trim() ? row.kind.trim() : "macro";
  const dueInDays =
    typeof row.dueInDays === "number" && Number.isFinite(row.dueInDays)
      ? Math.max(0, Math.round(row.dueInDays))
      : 3;
  return { title, kind, dueInDays };
}

export function clampMacroActions(actions: MacroActions): MacroActions {
  return {
    email: actions.email,
    fieldUpdates: actions.fieldUpdates.slice(0, MACRO_FIELD_UPDATE_CAP),
    createTasks: actions.createTasks.slice(0, MACRO_CREATE_TASK_CAP),
    stageMove: actions.stageMove,
  };
}

export function normalizeMacroModules(module: string, modules?: unknown): DevHubModule[] {
  const extra = Array.isArray(modules) ? modules.filter((item): item is DevHubModule => typeof item === "string" && isDevHubModule(item)) : [];
  if (extra.length) return [...new Set(extra)];
  return isDevHubModule(module) ? [module] : [];
}

export function macroTargetsModule(module: string, modules: unknown, target: string): boolean {
  return normalizeMacroModules(module, modules).includes(target as DevHubModule);
}

export function parseMacroKind(raw: unknown): MacroKind {
  return typeof raw === "string" && isMacroKind(raw) ? raw : "standard";
}

export function formatMacroModules(module: string, modules?: unknown): string {
  return normalizeMacroModules(module, modules)
    .map((item) => DEV_HUB_MODULE_LABEL[item])
    .join(", ");
}

export function allowedFieldsForModules(modules: readonly DevHubModule[]): string[] {
  return [...new Set(modules.flatMap((item) => [...(ALLOWED_MACRO_FIELDS[item] ?? [])]))];
}

export function validateMacroActions(
  module: string | string[],
  actions: MacroActions,
): { ok: true; actions: MacroActions } | { ok: false; error: string } {
  const modules = (Array.isArray(module) ? module : [module]).filter(isDevHubModule);
  if (modules.length === 0) return { ok: false, error: "Pick at least one target module." };
  const clamped = clampMacroActions(actions);
  if (clamped.email && MACRO_EMAIL_CAP < 1) {
    return { ok: false, error: "Macros allow at most one email." };
  }
  if (clamped.fieldUpdates.length > MACRO_FIELD_UPDATE_CAP) {
    return { ok: false, error: `At most ${MACRO_FIELD_UPDATE_CAP} field updates.` };
  }
  if (clamped.createTasks.length > MACRO_CREATE_TASK_CAP) {
    return { ok: false, error: `At most ${MACRO_CREATE_TASK_CAP} create-task actions.` };
  }
  const allowed = allowedFieldsForModules(modules);
  for (const update of clamped.fieldUpdates) {
    if (!allowed.includes(update.field)) {
      return { ok: false, error: `Field “${update.field}” is not allowlisted on the selected modules.` };
    }
  }
  if (clamped.stageMove && !modules.some((item) => item === "deals" || item === "quotes")) {
    return { ok: false, error: "Stage move is only for Deals / Pipeline or Quotes." };
  }
  return { ok: true, actions: clamped };
}

export function allowedFieldsFor(module: DevHubModule): readonly string[] {
  return ALLOWED_MACRO_FIELDS[module];
}

/** Macros are user-run only. Never persist a schedule or trigger. */
export function macroIsManualOnly(): true {
  return true;
}
