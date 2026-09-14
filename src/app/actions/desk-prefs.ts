"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseColumns } from "@/lib/desk/columns";
import {
  loadListColumnLayout,
  loadListColumnPrefs,
  upsertListColumnPrefs,
  type StoredListColumnPrefs,
} from "@/lib/desk/column-prefs";
import type { ListSort } from "@/lib/list-columns";

export async function saveColumnPrefs(formData: FormData) {
  const tableKey = String(formData.get("tableKey") ?? "").trim();
  const columns = String(formData.get("columns") ?? "");
  if (!tableKey) return;
  const picked = parseColumns(tableKey, columns);
  // Refuse empty writes. Also refuse deals strips: legacy ColumnPicker allow-list is
  // narrower than layout-driven list columns and must not clobber Priority/Pipeline prefs.
  const rawIds = columns.split(",").map((s) => s.trim()).filter(Boolean);
  if (picked.length === 0) return;
  if (rawIds.length > 0 && picked.length < rawIds.length && tableKey === "deals") {
    return;
  }
  const jar = await cookies();
  jar.set(`ff_cols_${tableKey}`, picked.join(","), { path: "/", sameSite: "lax" });
  await upsertListColumnPrefs(tableKey, picked);
  revalidatePath("/");
}

/** Persist ColumnTable visibility / widths / sort on the same desk_column_prefs row. */
export async function saveListColumnPrefs(
  tableKey: string,
  columns: string[],
  extras?: { widths?: Record<string, number>; sort?: ListSort | null },
) {
  await upsertListColumnPrefs(tableKey, columns, extras);
}

export async function fetchListColumnPrefs(tableKey: string): Promise<string[] | null> {
  return loadListColumnPrefs(tableKey);
}

export async function fetchListColumnLayout(tableKey: string): Promise<StoredListColumnPrefs | null> {
  return loadListColumnLayout(tableKey);
}
