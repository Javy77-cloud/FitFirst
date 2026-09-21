"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/guards";
import {
  AGENT_FEATURE_TOGGLE_IDS,
  patchAgentFeatureToggle,
  type AgentFeatureToggleId,
  type AgentFeatureToggles,
} from "@/lib/settings/agent-feature-toggles";
import {
  getAgentFeatureToggles,
  saveAgentFeatureToggles,
} from "@/lib/settings/agent-feature-toggles-prefs";

function isToggle(value: string): value is AgentFeatureToggleId {
  return (AGENT_FEATURE_TOGGLE_IDS as readonly string[]).includes(value);
}

function revalidateTogglePaths() {
  revalidatePath("/settings");
  revalidatePath("/settings/roles-access");
  revalidatePath("/settings/agents");
  revalidatePath("/settings/agency");
  revalidatePath("/settings/email");
  revalidatePath("/settings/integrations");
  revalidatePath("/automations");
  revalidatePath("/automations/macros");
  revalidatePath("/");
}

export async function setAgentFeatureToggle(formData: FormData) {
  await requireAdminAction("Admin only — Roles & access.");
  const idRaw = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!isToggle(idRaw)) {
    return { ok: false as const, error: "Unknown toggle." };
  }
  const current = await getAgentFeatureToggles();
  const next = patchAgentFeatureToggle(current, idRaw, enabled);
  await saveAgentFeatureToggles(next);
  revalidateTogglePaths();
  return { ok: true as const, toggles: next };
}

export async function replaceAgentFeatureToggles(toggles: AgentFeatureToggles) {
  await requireAdminAction("Admin only — Roles & access.");
  const next = await saveAgentFeatureToggles(toggles);
  revalidateTogglePaths();
  return { ok: true as const, toggles: next };
}
