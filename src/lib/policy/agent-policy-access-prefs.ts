import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import type { DeskSession } from "@/lib/auth/session";
import {
  DEFAULT_AGENT_POLICY_ACCESS,
  normalizeAgentPolicyAccess,
  resolvePolicyViewerAccess,
  type AgentPolicyAccess,
} from "@/lib/policy/agent-policy-access";

export async function getAgentPolicyAccess(): Promise<AgentPolicyAccess> {
  try {
    const [row] = await db
      .select({ agentPolicyAccess: agencySettings.agentPolicyAccess })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return normalizeAgentPolicyAccess(row?.agentPolicyAccess ?? null);
  } catch {
    return { ...DEFAULT_AGENT_POLICY_ACCESS };
  }
}

export async function saveAgentPolicyAccess(
  access: AgentPolicyAccess,
): Promise<AgentPolicyAccess> {
  const next = normalizeAgentPolicyAccess(access);
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  if (existing) {
    await db
      .update(agencySettings)
      .set({ agentPolicyAccess: next, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      agentPolicyAccess: next,
    });
  }
  return next;
}

/** Admins always; agents only when portalCredentials.read is on. */
export async function sessionCanRevealPortal(
  session: Pick<DeskSession, "isAdmin">,
): Promise<boolean> {
  if (session.isAdmin) return true;
  const access = await getAgentPolicyAccess();
  return resolvePolicyViewerAccess(false, access).portalCredentials.read;
}

export async function sessionCanWritePortal(
  session: Pick<DeskSession, "isAdmin">,
): Promise<boolean> {
  if (session.isAdmin) return true;
  const access = await getAgentPolicyAccess();
  return resolvePolicyViewerAccess(false, access).portalCredentials.write;
}
