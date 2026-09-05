"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseColumns } from "@/lib/desk/columns";
import { loadListColumnPrefs, upsertListColumnPrefs } from "@/lib/desk/column-prefs";

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

/** Persist ColumnTable visibility. IDs are stored as-is for that module. */
export async function saveListColumnPrefs(tableKey: string, columns: string[]) {
  await upsertListColumnPrefs(tableKey, columns);
}

export async function fetchListColumnPrefs(tableKey: string): Promise<string[] | null> {
  return loadListColumnPrefs(tableKey);
}
