"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { ensureExperienceReviewsTable } from "@/lib/db/ensure-experience-reviews";
import { experienceReviews } from "@/lib/db/schema";
import {
  isReviewMoment,
  parseReviewStars,
  REVIEW_PROMPTS,
  type ReviewPromptId,
} from "@/lib/health/reviews";

function optionalUuid(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return isUuid(raw) ? raw : null;
}

function refreshHealthPaths(input: {
  contactId: string | null;
  policyId: string | null;
  dealId: string | null;
}) {
  revalidatePath("/renewals");
  revalidatePath("/deals");
  revalidatePath("/contacts");
  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  if (input.policyId) revalidatePath(`/policies/${input.policyId}`);
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
}

async function writeReview(input: {
  stars: number | null;
  skipped: boolean;
  form: FormData;
}) {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return { ok: false as const, error: "Sign in required." };
  const moment = String(input.form.get("moment") ?? "");
  if (!isReviewMoment(moment)) return { ok: false as const, error: "Unknown review moment." };
  const promptId = String(input.form.get("promptId") ?? "") as ReviewPromptId;
  if (!REVIEW_PROMPTS.some((row) => row.id === promptId)) {
    return { ok: false as const, error: "Unknown review prompt." };
  }
  const contactId = optionalUuid(input.form.get("contactId"));
  const policyId = optionalUuid(input.form.get("policyId"));
  const dealId = optionalUuid(input.form.get("dealId"));
  const activityId = optionalUuid(input.form.get("activityId"));
  const note = String(input.form.get("note") ?? "").trim() || null;
  const row = {
    tenantId: DEFAULT_TENANT_ID,
    reviewerUserId: session.userId,
    moment,
    promptId,
    stars: input.stars,
    note,
    skipped: input.skipped,
    contactId,
    policyId,
    dealId,
    activityId,
  };
  try {
    await ensureExperienceReviewsTable();
  } catch {
    // CREATE TABLE IF NOT EXISTS from 0145 — if Neon rejects DDL, insert still
    // fail-closes below. Must not 441 the desk.
  }
  try {
    await db.insert(experienceReviews).values(row);
  } catch {
    // Missing experience_reviews table, stale FK, or catalog miss must not
    // 441 the desk when a Pulse rate is chosen.
    try {
      await ensureExperienceReviewsTable();
      await db.insert(experienceReviews).values({
        tenantId: row.tenantId,
        reviewerUserId: row.reviewerUserId,
        moment: row.moment,
        promptId: row.promptId,
        stars: row.stars,
        note: row.note,
        skipped: row.skipped,
      });
    } catch {
      return { ok: false as const, error: "Could not save that pulse. Your book is still saved." };
    }
  }
  try {
    refreshHealthPaths({ contactId, policyId, dealId });
  } catch {
    // Revalidate is optional; the score is already written.
  }
  return { ok: true as const };
}

export async function submitExperienceReview(formData: FormData) {
  try {
    const stars = parseReviewStars(formData.get("stars"));
    if (stars == null) return { ok: false as const, error: "Pick 1 to 5 stars." };
    return await writeReview({ stars, skipped: false, form: formData });
  } catch {
    return { ok: false as const, error: "Could not save that pulse. Your book is still saved." };
  }
}

export async function skipExperienceReview(formData: FormData) {
  try {
    return await writeReview({ stars: null, skipped: true, form: formData });
  } catch {
    return { ok: false as const, error: "Could not save that pulse. Your book is still saved." };
  }
}
