import { NextResponse } from "next/server";
import { snoozeLeadFollowUpAlert, snoozeLeadFollowUpByQueue } from "@/lib/leads/apply-follow-up";
import { isSnoozeDelayUnit } from "@/lib/leads/follow-up-templates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const alertId = url.searchParams.get("alertId") ?? "";
  const queueId = url.searchParams.get("queueId") ?? "";
  const amount = Number(url.searchParams.get("amount") ?? "");
  const unit = url.searchParams.get("unit") ?? "";
  if (!Number.isFinite(amount) || !isSnoozeDelayUnit(unit)) {
    return NextResponse.redirect(new URL("/leads", url.origin));
  }
  const result = alertId
    ? await snoozeLeadFollowUpAlert(alertId, amount, unit)
    : queueId
      ? await snoozeLeadFollowUpByQueue(queueId, amount, unit)
      : { leadId: null };
  const dest = result.leadId ? `/leads/${result.leadId}` : "/leads";
  return NextResponse.redirect(new URL(dest, url.origin));
}
