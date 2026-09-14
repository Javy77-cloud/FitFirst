"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/guards";
import {
  AGENT_POLICY_ACCESS_AREAS,
  normalizeAgentPolicyAccess,
  patchAgentPolicyAccess,
  type AgentPolicyAccess,
  type AgentPolicyAccessArea,
} from "@/lib/policy/agent-policy-access";
import {
  getAgentPolicyAccess,
  saveAgentPolicyAccess,
} from "@/lib/policy/agent-policy-access-prefs";

function isArea(value: string): value is AgentPolicyAccessArea {
  return (AGENT_POLICY_ACCESS_AREAS as readonly string[]).includes(value);
}

function revalidateAgentPolicyPaths() {
  revalidatePath("/settings/agent-policy-access");
  revalidatePath("/policies");
  revalidatePath("/renewals");
  revalidatePath("/carriers");
}

/** Toggle Read or Write for one area. Write=true must send writeConfirmed=1 (double confirm UI). */
export async function setAgentPolicyAccessFlag(formData: FormData) {
  await requireAdminAction("Admin only — Agent Policy Access.");
  const areaRaw = String(formData.get("area") ?? "");
  const flag = String(formData.get("flag") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!isArea(areaRaw) || (flag !== "read" && flag !== "write")) {
    return { ok: false as const, error: "Unknown access control." };
  }
  if (flag === "write" && enabled) {
    const confirmed = String(formData.get("writeConfirmed") ?? "") === "1";
    if (!confirmed) {
      return {
        ok: false as const,
        error: "Writing permissions need confirmation.",
        needsWriteConfirm: true as const,
      };
    }
  }
  const current = await getAgentPolicyAccess();
  const next = patchAgentPolicyAccess(current, areaRaw, { [flag]: enabled });
  await saveAgentPolicyAccess(next);
  revalidateAgentPolicyPaths();
  return { ok: true as const, access: next };
}

export async function replaceAgentPolicyAccess(access: AgentPolicyAccess) {
  await requireAdminAction("Admin only — Agent Policy Access.");
  const next = await saveAgentPolicyAccess(normalizeAgentPolicyAccess(access));
  revalidateAgentPolicyPaths();
  return { ok: true as const, access: next };
}
