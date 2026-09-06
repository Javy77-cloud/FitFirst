import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

/** Stamp first contact once. That stamp starts the response timer and the matching template. */
export async function markLeadFirstContact(leadId: string, at = new Date()) {
  if (!leadId) return;
  const stamped = await db
    .update(leads)
    .set({ firstContactAt: at, updatedAt: at })
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId), isNull(leads.firstContactAt)))
    .returning({ id: leads.id, status: leads.status });
  if (stamped[0]) {
    const { fireLeadFollowUpForStatus } = await import("@/lib/leads/apply-follow-up");
    await fireLeadFollowUpForStatus(leadId, stamped[0].status, at).catch(() => null);
  }
  try {
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
  } catch {
    /* seed / scripts are outside a request */
  }
}
