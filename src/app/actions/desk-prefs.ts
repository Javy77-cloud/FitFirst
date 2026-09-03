"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskColumnPrefs } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { parseColumns } from "@/lib/desk/columns";

export async function saveColumnPrefs(formData: FormData) {
  const tableKey = String(formData.get("tableKey") ?? "").trim();
  const columns = String(formData.get("columns") ?? "");
  if (!tableKey) return;
  const picked = parseColumns(tableKey, columns);
  const jar = await cookies();
  jar.set(`ff_cols_${tableKey}`, picked.join(","), { path: "/", sameSite: "lax" });
  const session = await currentDeskSession();
  if (session.userId) {
    const [existing] = await db
      .select()
      .from(deskColumnPrefs)
      .where(
        and(
          eq(deskColumnPrefs.tenantId, DEFAULT_TENANT_ID),
          eq(deskColumnPrefs.userId, session.userId),
          eq(deskColumnPrefs.tableKey, tableKey),
        ),
      );
    if (existing) {
      await db
        .update(deskColumnPrefs)
        .set({ columns: picked, updatedAt: new Date() })
        .where(eq(deskColumnPrefs.id, existing.id));
    } else {
      await db.insert(deskColumnPrefs).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: session.userId,
        tableKey,
        columns: picked,
      });
    }
  }
  revalidatePath("/");
}
