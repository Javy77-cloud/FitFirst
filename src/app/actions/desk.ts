"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  DESK_AGENT_COOKIE,
  deleteAgentColumnLayout,
  ensureDeskAgents,
  getCurrentAgent,
  isAdminAgent,
  upsertColumnLayout,
} from "@/lib/crm/desk-agent";
import { moveColumn } from "@/lib/crm/lists";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function columnIdsFrom(form: FormData): string[] {
  return form
    .getAll("columnIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
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

async function redirectBack() {
  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      redirect(new URL(referer).pathname + new URL(referer).search);
    } catch (error) {
      if (typeof error === "object" && error && "digest" in error) throw error;
    }
  }
  redirect("/deals");
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
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  await redirectBack();
}

export async function saveAgentColumnLayout(formData: FormData) {
  const tableId = str(formData, "tableId");
  const columnIds = columnIdsFrom(formData);
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
  const columnIds = columnIdsFrom(formData);
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

export async function moveAgentColumn(formData: FormData) {
  const tableId = str(formData, "tableId");
  const columnId = str(formData, "columnId");
  const direction = str(formData, "direction") === "1" ? 1 : -1;
  const current = str(formData, "currentIds")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const next = moveColumn(current.length ? current : [columnId], columnId, direction as -1 | 1);
  const agent = await getCurrentAgent();
  await upsertColumnLayout({ tableId, columnIds: next, agentId: agent.id });
  revalidateLists();
}
