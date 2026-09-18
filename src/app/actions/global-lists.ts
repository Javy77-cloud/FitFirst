"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { globalLists } from "@/lib/db/schema";
import { GLOBAL_LIST_KEYS, type GlobalListKey } from "@/lib/desk/global-lists";
import { currentDeskSession } from "@/lib/auth/session";
import { STATUS_COLOR_KEYS } from "@/lib/desk/status-colors";
import { syncDealSellingAgencyFromGlobalLists } from "@/lib/custom-fields/sync-deal-selling-agency";
import { listMutationError, listMutationOk, type ListMutationResult } from "@/lib/settings/list-editor";

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

function colorFrom(raw: string): string | null {
  const color = raw.trim();
  if (!color || color.toLowerCase() === "none") return null;
  return (STATUS_COLOR_KEYS as readonly string[]).includes(color) ? color : null;
}

function colorFromForm(form: FormData, key = "color"): string | null {
  return colorFrom(str(form, key));
}

function isListKey(value: string): value is GlobalListKey {
  return (GLOBAL_LIST_KEYS as readonly string[]).includes(value);
}

async function requireAdmin(): Promise<boolean> {
  const session = await currentDeskSession();
  return session.isAdmin;
}

function revalidateGlobalLists() {
  revalidatePath("/settings/lists");
  revalidatePath("/policies");
  revalidatePath("/deals");
  revalidatePath("/settings/field-builder");
}

async function syncIfSellingAgency(listKey: string | null | undefined) {
  if (listKey === "selling_agency") await syncDealSellingAgencyFromGlobalLists();
}

export async function addGlobalListItem(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const listKey = str(formData, "listKey");
  const label = str(formData, "label");
  if (!label || !isListKey(listKey)) return listMutationError("Add a value first.");
  const family = str(formData, "family") || null;
  const slug = `${slugify(label)}-${Date.now().toString(36)}`;
  await db.insert(globalLists).values({
    tenantId: DEFAULT_TENANT_ID,
    listKey,
    family,
    slug,
    label,
    sortOrder: Number(str(formData, "sortOrder") || "0") || 0,
    color: colorFromForm(formData),
    active: true,
  });
  await syncIfSellingAgency(listKey);
  revalidateGlobalLists();
  return listMutationOk("global-list-saved");
}

export async function updateGlobalListItemColor(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const id = str(formData, "id");
  if (!id) return listMutationError("List item not found.");
  const [row] = await db
    .update(globalLists)
    .set({ color: colorFromForm(formData), updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)))
    .returning({ listKey: globalLists.listKey });
  await syncIfSellingAgency(row?.listKey);
  revalidateGlobalLists();
  return listMutationOk("global-list-saved");
}

export async function updateGlobalListItem(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const id = str(formData, "id");
  const label = str(formData, "label");
  if (!id || !label) return listMutationError("Name the list item first.");
  const familyRaw = formData.get("family");
  const family = familyRaw === null ? undefined : str(formData, "family") || null;
  const [row] = await db
    .update(globalLists)
    .set({
      label,
      color: colorFromForm(formData),
      ...(family !== undefined ? { family } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)))
    .returning({ listKey: globalLists.listKey });
  if (!row) return listMutationError("List item not found.");
  await syncIfSellingAgency(row.listKey);
  revalidateGlobalLists();
  return listMutationOk("global-list-saved");
}

export async function saveGlobalList(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const listKey = str(formData, "listKey");
  if (!isListKey(listKey)) return listMutationError("List not found.");

  const ids = formData.getAll("ids").map((item) => String(item));
  const labels = formData.getAll("labels").map((item) => String(item));
  const colors = formData.getAll("itemColors").map((item) => String(item));
  const families = formData.getAll("families").map((item) => String(item));
  const count = Math.max(ids.length, labels.length);
  const colorsAligned = colors.length === count;

  for (let i = 0; i < count; i++) {
    const id = ids[i]?.trim() ?? "";
    const label = labels[i]?.trim() ?? "";
    const color = colorsAligned ? colorFrom(colors[i] ?? "") : undefined;
    const family = families[i]?.trim() || null;
    if (id && label) {
      await db
        .update(globalLists)
        .set({
          label,
          family,
          ...(color !== undefined ? { color } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)));
      continue;
    }
    if (!id && label) {
      await db.insert(globalLists).values({
        tenantId: DEFAULT_TENANT_ID,
        listKey,
        family,
        slug: `${slugify(label)}-${Date.now().toString(36)}-${i}`,
        label,
        sortOrder: 0,
        color,
        active: true,
      });
    }
  }

  await syncIfSellingAgency(listKey);
  revalidateGlobalLists();
  return listMutationOk("global-list-saved");
}

export async function deleteGlobalListItem(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const id = str(formData, "id");
  if (!id) return listMutationError("List item not found.");
  // Soft-delete: ensureDefaultGlobalLists keys off slug presence, so a hard
  // delete of a seed value (e.g. Monthly) would resurrect on the next page load.
  const [row] = await db
    .update(globalLists)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)))
    .returning({ listKey: globalLists.listKey });
  await syncIfSellingAgency(row?.listKey);
  revalidateGlobalLists();
  return listMutationOk("list-item-deleted");
}

export async function deleteGlobalList(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const listKey = str(formData, "listKey");
  if (!isListKey(listKey)) return listMutationError("List not found.");
  await db
    .update(globalLists)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.listKey, listKey)));
  await syncIfSellingAgency(listKey);
  revalidateGlobalLists();
  return listMutationOk("list-deleted");
}

export async function toggleGlobalListItem(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (!id) return listMutationError("List item not found.");
  await db
    .update(globalLists)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.id, id)));
  revalidatePath("/settings/lists");
  return listMutationOk("global-list-saved");
}

export async function clearGlobalListColors(formData: FormData): Promise<ListMutationResult> {
  if (!(await requireAdmin())) return listMutationError("List edits are Admin only.");
  const listKey = str(formData, "listKey");
  if (!isListKey(listKey)) return listMutationError("List not found.");
  await db
    .update(globalLists)
    .set({ color: null, updatedAt: new Date() })
    .where(and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.listKey, listKey)));
  await syncIfSellingAgency(listKey);
  revalidateGlobalLists();
  return listMutationOk("colors-cleared");
}
