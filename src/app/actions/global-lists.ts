"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { globalLists } from "@/lib/db/schema";
import { GLOBAL_LIST_KEYS, type GlobalListKey } from "@/lib/desk/global-lists";
import { currentDeskSession } from "@/lib/auth/session";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function addGlobalListItem(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const listKey = str(formData, "listKey") as GlobalListKey;
  const label = str(formData, "label");
  if (!label || !(GLOBAL_LIST_KEYS as readonly string[]).includes(listKey)) return;
  const family = str(formData, "family") || null;
  const slug = `${slugify(label)}-${Date.now().toString(36)}`;
  await db.insert(globalLists).values({
    tenantId: DEFAULT_TENANT_ID,
    listKey,
    family,
    slug,
    label,
    sortOrder: Number(str(formData, "sortOrder") || "0") || 0,
    active: true,
  });
  revalidatePath("/settings/lists");
  revalidatePath("/policies");
}

export async function deleteGlobalListItem(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const id = str(formData, "id");
  if (!id) return;
  await db
    .delete(globalLists)
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)));
  revalidatePath("/settings/lists");
}

export async function toggleGlobalListItem(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (!id) return;
  await db
    .update(globalLists)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)));
  revalidatePath("/settings/lists");
}
