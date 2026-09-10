"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { globalLists } from "@/lib/db/schema";
import { GLOBAL_LIST_KEYS, type GlobalListKey } from "@/lib/desk/global-lists";
import { currentDeskSession } from "@/lib/auth/session";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";
import { flashAction } from "@/lib/flash-action";
import { syncDealSellingAgencyFromGlobalLists } from "@/lib/custom-fields/sync-deal-selling-agency";

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

function colorFrom(form: FormData): string | null {
  const color = str(form, "color");
  if (!color || color.toLowerCase() === "none") return null;
  return (STATUS_COLOR_KEYS as readonly string[]).includes(color) ? color : null;
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
    color: colorFrom(formData),
    active: true,
  });
  if (listKey === "selling_agency") await syncDealSellingAgencyFromGlobalLists();
  revalidatePath("/settings/lists");
  revalidatePath("/policies");
  revalidatePath("/settings/field-builder");
}

export async function updateGlobalListItemColor(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const id = str(formData, "id");
  if (!id) return;
  const [row] = await db
    .update(globalLists)
    .set({ color: colorFrom(formData), updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)))
    .returning({ listKey: globalLists.listKey });
  if (row?.listKey === "selling_agency") await syncDealSellingAgencyFromGlobalLists();
  revalidatePath("/settings/lists");
  revalidatePath("/policies");
  revalidatePath("/deals");
  revalidatePath("/settings/field-builder");
}

export async function deleteGlobalListItem(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const id = str(formData, "id");
  if (!id) return;
  // Soft-delete: ensureDefaultGlobalLists keys off slug presence, so a hard
  // delete of a seed value (e.g. Monthly) would resurrect on the next page load.
  const [row] = await db
    .update(globalLists)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)))
    .returning({ listKey: globalLists.listKey });
  if (row?.listKey === "selling_agency") await syncDealSellingAgencyFromGlobalLists();
  revalidatePath("/settings/lists");
  revalidatePath("/settings/field-builder");
  flashAction("/settings/lists", "list-item-deleted");
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

export async function clearGlobalListColors(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) return;
  const listKey = str(formData, "listKey") as GlobalListKey;
  if (!(GLOBAL_LIST_KEYS as readonly string[]).includes(listKey)) return;
  await db
    .update(globalLists)
    .set({ color: null, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.listKey, listKey)));
  if (listKey === "selling_agency") await syncDealSellingAgencyFromGlobalLists();
  revalidatePath("/settings/lists");
  revalidatePath("/policies");
  revalidatePath("/deals");
  revalidatePath("/settings/field-builder");
  flashAction("/settings/lists", "colors-cleared");
}
