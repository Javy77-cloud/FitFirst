"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import { flashAction } from "@/lib/flash-action";
import {
  emptyMedicareBulkTally,
  hideMedicareBulkOneshot,
  restoreMedicareBulkOneshot,
  runMedicareContactBulkSync,
  type MedicareBulkOneshotState,
  type MedicareBulkRunResult,
} from "@/lib/healthsherpa/bulk-medicare";
import { HEALTHSHERPA_REVIEW_PATH } from "@/lib/healthsherpa/copy";
import { resolveHealthSherpaEnrollment } from "@/lib/healthsherpa/review";
import { syncDealToHealthSherpa } from "@/lib/healthsherpa/sync";

function bulkAuthDenied(message: string): MedicareBulkRunResult {
  return {
    ok: false,
    code: "auth",
    message,
    configured: false,
    candidateCount: 0,
    rows: [],
    ...emptyMedicareBulkTally(),
  };
}

async function requireMedicareBulkActor() {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false as const, message: "Sign in to continue." };
  if (!session.isAdmin && !session.isDeveloper) {
    return { ok: false as const, message: "Admin or site-developer only." };
  }
  return { ok: true as const, session };
}

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

export async function bulkSyncMedicareContactsAction(): Promise<MedicareBulkRunResult> {
  const gate = await requireMedicareBulkActor();
  if (!gate.ok) return bulkAuthDenied(gate.message);
  return runMedicareContactBulkSync();
}

export async function hideMedicareBulkSyncAction(): Promise<MedicareBulkOneshotState> {
  const gate = await requireMedicareBulkActor();
  if (!gate.ok) return { hidden: true, lastRunAt: null, lastRun: null };
  return hideMedicareBulkOneshot();
}

export async function restoreMedicareBulkSyncAction(): Promise<MedicareBulkOneshotState> {
  const gate = await requireMedicareBulkActor();
  if (!gate.ok) return { hidden: true, lastRunAt: null, lastRun: null };
  return restoreMedicareBulkOneshot();
}

export async function linkHealthSherpaEnrollmentAction(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) {
    flashAction(HEALTHSHERPA_REVIEW_PATH, "Sign in to review HealthSherpa enrollments.", "error");
  }
  const result = await resolveHealthSherpaEnrollment({
    enrollmentId: String(formData.get("enrollmentId") ?? ""),
    action: "link",
    contactId: String(formData.get("contactId") ?? ""),
  });
  revalidatePath(HEALTHSHERPA_REVIEW_PATH);
  revalidatePath("/contacts");
  revalidatePath("/notifications");
  revalidatePath("/developer/healthsherpa");
  if (!result.ok) {
    flashAction(HEALTHSHERPA_REVIEW_PATH, result.message, "error");
  }
  revalidatePath(`/contacts/${result.contactId}`);
  flashAction(HEALTHSHERPA_REVIEW_PATH, "Enrollment linked to the existing contact.");
}

export async function createHealthSherpaContactAction(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) {
    flashAction(HEALTHSHERPA_REVIEW_PATH, "Sign in to review HealthSherpa enrollments.", "error");
  }
  const result = await resolveHealthSherpaEnrollment({
    enrollmentId: String(formData.get("enrollmentId") ?? ""),
    action: "create",
  });
  revalidatePath(HEALTHSHERPA_REVIEW_PATH);
  revalidatePath("/contacts");
  revalidatePath("/notifications");
  revalidatePath("/developer/healthsherpa");
  if (!result.ok) {
    flashAction(HEALTHSHERPA_REVIEW_PATH, result.message, "error");
  }
  revalidatePath(`/contacts/${result.contactId}`);
  flashAction(HEALTHSHERPA_REVIEW_PATH, "New contact created and unpublished policy attached.");
}
