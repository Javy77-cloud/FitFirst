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
