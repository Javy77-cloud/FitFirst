"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import {
  addWorkNote,
  assignWorkItem,
  notifyAssignee,
  setWorkStatus,
  toggleWorkFlag,
} from "@/lib/work-queue/service";

function actorId(formData: FormData) {
  return String(formData.get("actorId") ?? ADMIN_USER_ID) || ADMIN_USER_ID;
}

function policyIdOf(formData: FormData) {
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) throw new Error("Policy is required.");
  return policyId;
}

function bounce(policyId: string, filed: string, error?: string) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  else params.set("filed", filed);
  redirect(`/policies/${policyId}?${params.toString()}`);
}

export async function saveAssignee(formData: FormData) {
  const policyId = policyIdOf(formData);
  try {
    await assignWorkItem(policyId, String(formData.get("assigneeId") ?? ""));
  } catch (error) {
    bounce(policyId, "assign", error instanceof Error ? error.message : "Could not assign.");
  }
  revalidateWork(policyId);
  bounce(policyId, "assign");
}

export async function saveWorkStatus(formData: FormData) {
  const policyId = policyIdOf(formData);
  try {
    await setWorkStatus(policyId, String(formData.get("workStatus") ?? ""));
  } catch (error) {
    bounce(policyId, "work_status", error instanceof Error ? error.message : "Could not set work status.");
  }
  revalidateWork(policyId);
  bounce(policyId, "work_status");
}

export async function saveWorkFlag(formData: FormData) {
  const policyId = policyIdOf(formData);
  const on = String(formData.get("on") ?? "") === "1";
  try {
    await toggleWorkFlag({
      policyId,
      flag: String(formData.get("flag") ?? ""),
      actorId: actorId(formData),
      on,
    });
  } catch (error) {
    bounce(policyId, "flag", error instanceof Error ? error.message : "Could not update flag.");
  }
  revalidateWork(policyId);
  bounce(policyId, "flag");
}

export async function postWorkNote(formData: FormData) {
  const policyId = policyIdOf(formData);
  try {
    await addWorkNote({
      policyId,
      authorId: actorId(formData),
      body: String(formData.get("body") ?? ""),
    });
  } catch (error) {
    bounce(policyId, "note", error instanceof Error ? error.message : "Could not post note.");
  }
  revalidateWork(policyId);
  bounce(policyId, "note");
}

export async function pingAssignee(formData: FormData) {
  const policyId = policyIdOf(formData);
  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : null;
  try {
    await notifyAssignee({
      policyId,
      actorId: actorId(formData),
      message: String(formData.get("message") ?? ""),
      dueDate,
    });
  } catch (error) {
    bounce(policyId, "ping", error instanceof Error ? error.message : "Could not ping.");
  }
  revalidateWork(policyId);
  bounce(policyId, "ping");
}

function revalidateWork(policyId: string) {
  revalidatePath("/");
  revalidatePath("/work-queue");
  revalidatePath("/alerts");
  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/contacts");
}
