"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentDeskSession } from "@/lib/auth/session";
import { awardLeadToAgent } from "@/lib/leads/offers";

function refreshLeadSurfaces(leadId?: string) {
  revalidatePath("/");
  revalidatePath("/social");
  revalidatePath("/leads");
  revalidatePath("/alerts");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function awardLeadOffer(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.isAdmin || !session.userId) throw new Error("Admin only.");
  const leadId = String(formData.get("leadId") ?? "").trim();
  const agentId = String(formData.get("agentId") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const result = await awardLeadToAgent({
    leadId,
    agentId,
    awardedByUserId: session.userId,
  });
  refreshLeadSurfaces(leadId);
  if (!result.ok) {
    const dest = next.startsWith("/leads") || next.startsWith("/social") ? next.split("?")[0] : "/social";
    redirect(`${dest}?notice=award-failed`);
  }
  if (next.startsWith("/leads/") || next === "/leads") {
    redirect(`${next.split("?")[0]}?notice=awarded`);
  }
  redirect(`/social?notice=awarded&lead=${leadId}`);
}
