"use server";

import { currentDeskSession } from "@/lib/auth/session";
import { syncDealToHealthSherpa } from "@/lib/healthsherpa/sync";

export async function syncDealToHealthSherpaAction(dealId: string) {
  const session = await currentDeskSession();
  if (!session.signedIn) {
    return { ok: false as const, code: "auth", message: "Sign in to sync HealthSherpa." };
  }
  return syncDealToHealthSherpa({
    dealId,
    agentEmail: session.email ?? "",
  });
}
