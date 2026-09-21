import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import type { DeskSession } from "@/lib/auth/session";
import {
  DEFAULT_AGENT_FEATURE_TOGGLES,
  normalizeAgentFeatureToggles,
  type AgentFeatureToggles,
} from "@/lib/settings/agent-feature-toggles";

function fromRow(row: {
  agentFeatureToggles?: unknown;
  showCompanyWidgets?: boolean | null;
} | null): AgentFeatureToggles {
  const next = normalizeAgentFeatureToggles(row?.agentFeatureToggles ?? null);
  const raw =
    row?.agentFeatureToggles && typeof row.agentFeatureToggles === "object" && !Array.isArray(row.agentFeatureToggles)
      ? (row.agentFeatureToggles as Record<string, unknown>)
      : {};
  if (!("agentsMaySeeTeamScope" in raw)) {
    next.agentsMaySeeTeamScope = Boolean(row?.showCompanyWidgets);
  }
  return next;
}

export async function getAgentFeatureToggles(): Promise<AgentFeatureToggles> {
  try {
    const [row] = await db
      .select({
        agentFeatureToggles: agencySettings.agentFeatureToggles,
        showCompanyWidgets: agencySettings.showCompanyWidgets,
      })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return fromRow(row ?? null);
  } catch {
    return { ...DEFAULT_AGENT_FEATURE_TOGGLES };
  }
}

export async function saveAgentFeatureToggles(
  toggles: AgentFeatureToggles,
): Promise<AgentFeatureToggles> {
  const next = normalizeAgentFeatureToggles(toggles);
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  const patch = {
    agentFeatureToggles: next,
    showCompanyWidgets: next.agentsMaySeeTeamScope,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(agencySettings).set(patch).where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      ...patch,
    });
  }
  return next;
}

export async function sessionMayUseMacros(session: Pick<DeskSession, "isAdmin">): Promise<boolean> {
  if (session.isAdmin) return true;
  const toggles = await getAgentFeatureToggles();
  return toggles.agentsMayUseMacros;
}

export async function sessionMayConnectPersonalGoogle(
  session: Pick<DeskSession, "signedIn" | "isAdmin">,
): Promise<boolean> {
  if (!session.signedIn) return false;
  if (session.isAdmin) return true;
  const toggles = await getAgentFeatureToggles();
  return toggles.agentsMayConnectPersonalGoogle;
}
