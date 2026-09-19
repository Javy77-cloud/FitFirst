"use server";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { REVIEW_EVENT } from "@/lib/renewal/chase";
import {
  REVIEW_PULSE_COOKIE,
  decodeReviewPulse,
  encodeReviewPulse,
  type ReviewPulsePayload,
} from "@/lib/renewal/review-pulse";

const COOKIE_OPTS = { path: "/", sameSite: "lax" as const, maxAge: 60 * 30 };

export async function queueReviewPulse(payload: ReviewPulsePayload): Promise<void> {
  if (!isUuid(payload.policyId)) return;
  const jar = await cookies();
  jar.set(REVIEW_PULSE_COOKIE, encodeReviewPulse(payload), COOKIE_OPTS);
}

export async function clearReviewPulseCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(REVIEW_PULSE_COOKIE);
}

export async function readReviewPulseCookie(): Promise<ReviewPulsePayload | null> {
  const jar = await cookies();
  return decodeReviewPulse(jar.get(REVIEW_PULSE_COOKIE)?.value ?? null);
}

/** Show the pulse only when #153 has not already captured a review on this policy. */
export async function resolveReviewPulse(): Promise<ReviewPulsePayload | null> {
  const pulse = await readReviewPulseCookie();
  if (!pulse) return null;
  const existing = await db
    .select({ id: activityLogs.id })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.tenantId, DEFAULT_TENANT_ID),
        eq(activityLogs.policyId, pulse.policyId),
        eq(activityLogs.eventType, REVIEW_EVENT),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    await clearReviewPulseCookie();
    return null;
  }
  return pulse;
}
