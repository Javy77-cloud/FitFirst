"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";

export async function setMacContinuity(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  const enabled = String(formData.get("macContinuity") ?? "") === "1";
  const [existing] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(agencySettings)
      .set({ macContinuity: enabled, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      tenantId: DEFAULT_TENANT_ID,
      macContinuity: enabled,
    });
  }
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/phone");
  revalidatePath("/settings/sms");
}
