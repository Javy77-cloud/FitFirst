"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
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
  await db.insert(experienceReviews).values({
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
  });
  refreshHealthPaths({ contactId, policyId, dealId });
  return { ok: true as const };
}

export async function submitExperienceReview(formData: FormData) {
  const stars = parseReviewStars(formData.get("stars"));
  if (stars == null) return { ok: false as const, error: "Pick 1 to 5 stars." };
  return writeReview({ stars, skipped: false, form: formData });
}

export async function skipExperienceReview(formData: FormData) {
  return writeReview({ stars: null, skipped: true, form: formData });
}
