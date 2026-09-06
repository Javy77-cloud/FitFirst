import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

/** Stamp first contact once. Does not change status — status change is the template trigger. */
export async function markLeadFirstContact(leadId: string, at = new Date()) {
  if (!leadId) return;
  await db
    .update(leads)
    .set({ firstContactAt: at, updatedAt: at })
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId), isNull(leads.firstContactAt)));
  try {
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
  } catch {
    /* seed / scripts are outside a request */
  }
}
