"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { activities, policies, renewalQueue } from "@/lib/db/schema";
import {
  appendHealthPipelineNote,
  isHealthPipelineStatus,
  normalizeHealthNoteChannel,
  normalizeHealthNoteLang,
  type HealthPipelineNote,
} from "@/lib/renewal/health-pipeline";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Agent sets the health pipeline status. Notes are optional free text or voice. */
export async function setHealthPipelineStatus(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  const status = str(formData, "status");
  if (!isUuid(policyId)) throw new Error("Policy required.");
  if (!isHealthPipelineStatus(status)) throw new Error("Unknown health pipeline status.");

  const [policy] = await db
    .select({ id: policies.id, lineOfBusiness: policies.lineOfBusiness, insuranceType: policies.insuranceType })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) throw new Error("Policy not found.");

  const body = str(formData, "body");
  const note: HealthPipelineNote | null = body
    ? {
        id: randomUUID(),
        status,
        body,
        lang: normalizeHealthNoteLang(str(formData, "lang")),
        channel: normalizeHealthNoteChannel(str(formData, "channel")),
        actorId: session.userId,
        at: new Date().toISOString(),
      }
    : null;

  const [existing] = await db
    .select()
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(renewalQueue.policyId, policyId)));

  const prior = (existing?.healthPipelineNotes ?? []) as HealthPipelineNote[];
  const notes = note ? appendHealthPipelineNote(prior, note) : prior;

  if (existing) {
    await db
      .update(renewalQueue)
      .set({
        healthPipelineStatus: status,
        healthPipelineNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(renewalQueue.id, existing.id));
  } else {
    await db.insert(renewalQueue).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      stage: "upcoming",
      healthPipelineStatus: status,
      healthPipelineNotes: notes,
    });
  }

  await db.insert(activities).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "note",
    title: "Health pipeline status",
    notes: note ? `${status}: ${note.body}` : status,
    status: "completed",
    policyId,
    assignee: session.userId,
    outcome: "health_pipeline_status",
  });

  revalidatePath("/renewals");
  revalidatePath(`/policies/${policyId}`);
  const returnTo = str(formData, "returnTo");
  redirect(returnTo.startsWith("/") ? returnTo : `/policies/${policyId}`);
}
