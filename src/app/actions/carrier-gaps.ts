"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrDeveloperAction } from "@/lib/auth/guards";
import {
  createMissingQuestion,
  promoteQuoteNeed,
  setMissingQuestionStatus,
  updateMissingQuestion,
} from "@/lib/carrier-gaps/store";
import {
  MISSING_QUESTIONS_PATH,
  MISSING_QUESTIONS_SETTINGS_PATH,
  parseGapStatus,
} from "@/lib/carrier-gaps/types";
import { flashAction, flashStay } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateGapSurfaces() {
  revalidatePath(MISSING_QUESTIONS_PATH);
  revalidatePath(MISSING_QUESTIONS_SETTINGS_PATH);
  revalidatePath("/developer");
  revalidatePath("/settings/developer-hub");
}

export async function createMissingQuestionAction(formData: FormData) {
  const session = await requireAdminOrDeveloperAction();
  const { created } = await createMissingQuestion({
    note: str(formData, "note"),
    productLine: str(formData, "productLine"),
    carrier: str(formData, "carrier") || null,
    suggestedSurface: str(formData, "suggestedSurface"),
    createdBy: session.name?.trim() || session.email || "developer",
  });
  revalidateGapSurfaces();
  flashStay(
    formData,
    MISSING_QUESTIONS_PATH,
    created ? "Missing question logged" : "Already on the gap list",
  );
}

export async function updateMissingQuestionAction(formData: FormData) {
  await requireAdminOrDeveloperAction();
  const id = str(formData, "id");
  if (!id) throw new Error("Missing question id is required.");
  await updateMissingQuestion({
    id,
    note: str(formData, "note"),
    productLine: str(formData, "productLine"),
    carrier: str(formData, "carrier") || null,
    suggestedSurface: str(formData, "suggestedSurface"),
    status: str(formData, "status"),
  });
  revalidateGapSurfaces();
  flashStay(formData, MISSING_QUESTIONS_PATH, "Missing question saved");
}

export async function setMissingQuestionStatusAction(formData: FormData) {
  await requireAdminOrDeveloperAction();
  const id = str(formData, "id");
  if (!id) throw new Error("Missing question id is required.");
  const status = parseGapStatus(str(formData, "status"));
  await setMissingQuestionStatus(id, status);
  revalidateGapSurfaces();
  flashStay(
    formData,
    MISSING_QUESTIONS_PATH,
    status === "added" ? "Marked added" : "Reopened",
  );
}

export async function promoteQuoteNeedToGapAction(formData: FormData) {
  const session = await requireAdminOrDeveloperAction();
  const dealId = str(formData, "dealId");
  const body = str(formData, "body") || str(formData, "note");
  const result = await promoteQuoteNeed({
    body,
    carrier: str(formData, "carrier") || null,
    productLine: str(formData, "productLine"),
    sourceQuoteNoteId: str(formData, "noteId") || null,
    suggestedSurface: str(formData, "suggestedSurface") || null,
    createdBy: session.name?.trim() || session.email || "developer",
  });
  if (dealId) revalidatePath(`/deals/${dealId}`);
  revalidateGapSurfaces();
  const next = dealId ? `/deals/${dealId}?tab=quotes` : MISSING_QUESTIONS_PATH;
  if (!result) {
    flashAction(next, "That note is not a missing-field ask.", "error");
  }
  flashAction(
    next,
    result.created ? "Logged missing question" : "Already on the gap list",
  );
}
