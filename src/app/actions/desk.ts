"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  DESK_AGENT_COOKIE,
  deleteAgentColumnLayout,
  ensureDeskAgents,
  getCurrentAgent,
  isAdminAgent,
  upsertColumnLayout,
} from "@/lib/crm/desk-agent";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateLists() {
  for (const path of [
    "/",
    "/leads",
    "/deals",
    "/pipeline",
    "/contacts",
    "/businesses",
    "/policies",
    "/tasks",
    "/reviews",
    "/carriers",
    "/logs",
  ]) {
    revalidatePath(path);
  }
}

export async function switchDeskAgent(formData: FormData) {
  const agentId = str(formData, "agentId");
  const agents = await ensureDeskAgents();
  if (!agents.some((agent) => agent.id === agentId)) {
    throw new Error("Unknown desk agent");
  }
  const jar = await cookies();
  jar.set(DESK_AGENT_COOKIE, agentId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}

export async function saveAgentColumnLayout(formData: FormData) {
  const tableId = str(formData, "tableId");
  const columnIds = str(formData, "columnIds")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!tableId || columnIds.length === 0) return;
  const agent = await getCurrentAgent();
  await upsertColumnLayout({ tableId, columnIds, agentId: agent.id });
  revalidateLists();
}

export async function saveAgencyColumnDefault(formData: FormData) {
  const agent = await getCurrentAgent();
  if (!isAdminAgent(agent)) {
    throw new Error("Only agency admin can set the default column layout");
  }
  const tableId = str(formData, "tableId");
  const columnIds = str(formData, "columnIds")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!tableId || columnIds.length === 0) return;
  await upsertColumnLayout({ tableId, columnIds, agentId: null });
  revalidateLists();
}

export async function resetAgentColumnLayout(formData: FormData) {
  const tableId = str(formData, "tableId");
  const agent = await getCurrentAgent();
  await deleteAgentColumnLayout(tableId, agent.id);
  revalidateLists();
}
