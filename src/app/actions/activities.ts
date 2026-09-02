"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function when(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relatedIds(form: FormData) {
  const raw = str(form, "relatedId");
  const prefixed = /^(contact|deal|policy):(.+)$/.exec(raw);
  const type = prefixed?.[1] ?? str(form, "relatedType");
  const id = prefixed?.[2] ?? (raw.includes(":") ? null : raw || null);
  return {
    contactId: type === "contact" ? id : str(form, "contactId") || null,
    dealId: type === "deal" ? id : str(form, "dealId") || null,
    policyId: type === "policy" ? id : str(form, "policyId") || null,
  };
}

function revalidateOps(paths: string[] = []) {
  for (const path of ["/calendar", "/tasks", ...paths]) revalidatePath(path);
}

export async function upsertActivity(formData: FormData) {
  const id = str(formData, "id");
  const kind = str(formData, "kind") || "task";
  const title = str(formData, "title") || (kind === "task" ? "Untitled task" : `Untitled ${kind}`);
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    kind,
    title,
    notes: str(formData, "notes") || null,
    status: str(formData, "status") || "open",
    dueAt: when(formData, "dueAt"),
    startAt: when(formData, "startAt"),
    endAt: when(formData, "endAt"),
    assignee: str(formData, "assignee") || null,
    ...relatedIds(formData),
    updatedAt: new Date(),
  };

  if (id) {
    await db
      .update(activities)
      .set(values)
      .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  } else {
    await db.insert(activities).values(values);
  }

  const returnTo = str(formData, "returnTo") || "/calendar";
  revalidateOps([returnTo]);
  redirect(returnTo);
}

export async function setActivityStatus(formData: FormData) {
  const id = str(formData, "id");
  const status = str(formData, "status") || "completed";
  await db
    .update(activities)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.id, id)));
  const returnTo = str(formData, "returnTo") || "/calendar";
  revalidateOps([returnTo]);
  redirect(returnTo);
}
