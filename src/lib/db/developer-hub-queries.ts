import { and, desc, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { macroTargetsModule, parseMacroKind } from "@/lib/developer-hub/macros";
import {
  isButtonPlacement,
  isDevHubModule,
  type ButtonPlacement,
  type DevHubModule,
  type MacroKind,
  type VisibilityProfile,
} from "@/lib/developer-hub/types";
import { db } from "./index";
import {
  deskClientScripts,
  deskCustomButtons,
  deskMacroRuns,
  deskMacros,
  deskWidgets,
} from "./schema";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export async function listDeskMacros(module?: string) {
  const rows = await db
    .select()
    .from(deskMacros)
    .where(eq(deskMacros.tenantId, tenant()))
    .orderBy(deskMacros.module, deskMacros.name);
  if (module && isDevHubModule(module)) {
    return rows.filter((row) => macroTargetsModule(row.module, row.modules, module));
  }
  return rows;
}

export async function getDeskMacro(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(deskMacros)
    .where(and(eq(deskMacros.tenantId, tenant()), eq(deskMacros.id, id)));
  return row ?? null;
}

export async function listEnabledMacrosFor(module: DevHubModule, kind?: MacroKind) {
  const rows = await db
    .select()
    .from(deskMacros)
    .where(and(eq(deskMacros.tenantId, tenant()), eq(deskMacros.enabled, true)))
    .orderBy(deskMacros.name);
  return rows.filter((row) => {
    if (!macroTargetsModule(row.module, row.modules, module)) return false;
    if (kind && parseMacroKind(row.kind) !== kind) return false;
    return true;
  });
}

export async function listDeskMacroRuns(macroId?: string) {
  const filters = [eq(deskMacroRuns.tenantId, tenant())];
  if (macroId && isUuid(macroId)) filters.push(eq(deskMacroRuns.macroId, macroId));
  return db
    .select()
    .from(deskMacroRuns)
    .where(and(...filters))
    .orderBy(desc(deskMacroRuns.ranAt));
}

export async function listDeskButtons(module?: string) {
  const filters = [eq(deskCustomButtons.tenantId, tenant())];
  if (module && isDevHubModule(module)) filters.push(eq(deskCustomButtons.module, module));
  return db
    .select()
    .from(deskCustomButtons)
    .where(and(...filters))
    .orderBy(deskCustomButtons.module, deskCustomButtons.label);
}

export async function getDeskButton(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(deskCustomButtons)
    .where(and(eq(deskCustomButtons.tenantId, tenant()), eq(deskCustomButtons.id, id)));
  return row ?? null;
}

export async function listVisibleButtons(input: {
  module: DevHubModule;
  placement: ButtonPlacement | ButtonPlacement[];
}) {
  const session = await currentDeskSession();
  const profile: VisibilityProfile = session.isAdmin ? "admin" : "agent";
  const placements = Array.isArray(input.placement) ? input.placement : [input.placement];
  const rows = await db
    .select()
    .from(deskCustomButtons)
    .where(
      and(
        eq(deskCustomButtons.tenantId, tenant()),
        eq(deskCustomButtons.module, input.module),
        eq(deskCustomButtons.enabled, true),
      ),
    )
    .orderBy(deskCustomButtons.label);
  return rows.filter((row) => {
    if (!isButtonPlacement(row.placement)) return false;
    if (!placements.includes(row.placement)) return false;
    const profiles = Array.isArray(row.visibilityProfiles) ? row.visibilityProfiles : [];
    return profiles.includes(profile);
  });
}

export async function listDeskScripts(module?: string) {
  const filters = [eq(deskClientScripts.tenantId, tenant())];
  if (module && isDevHubModule(module)) filters.push(eq(deskClientScripts.module, module));
  return db
    .select()
    .from(deskClientScripts)
    .where(and(...filters))
    .orderBy(deskClientScripts.module, deskClientScripts.name);
}

export async function getDeskScript(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(deskClientScripts)
    .where(and(eq(deskClientScripts.tenantId, tenant()), eq(deskClientScripts.id, id)));
  return row ?? null;
}

export async function listEnabledScriptsFor(module: DevHubModule, page: string) {
  return db
    .select()
    .from(deskClientScripts)
    .where(
      and(
        eq(deskClientScripts.tenantId, tenant()),
        eq(deskClientScripts.module, module),
        eq(deskClientScripts.page, page),
        eq(deskClientScripts.enabled, true),
      ),
    )
    .orderBy(deskClientScripts.name);
}

export async function listDeskWidgets() {
  return db.select().from(deskWidgets).where(eq(deskWidgets.tenantId, tenant())).orderBy(deskWidgets.name);
}

export async function getDeskWidget(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(deskWidgets)
    .where(and(eq(deskWidgets.tenantId, tenant()), eq(deskWidgets.id, id)));
  return row ?? null;
}

export async function listEnabledWidgetsByType(type: string) {
  return db
    .select()
    .from(deskWidgets)
    .where(and(eq(deskWidgets.tenantId, tenant()), eq(deskWidgets.type, type), eq(deskWidgets.enabled, true)))
    .orderBy(deskWidgets.name);
}
