"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  claimStatusLabel,
  isClaimCause,
  isClaimChannel,
  isClaimStatus,
} from "@/lib/claims";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { claimActivity, claimAttachments, claimNotes, claims, policies } from "@/lib/db/schema";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function day(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T16:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function actor(form: FormData) {
  return str(form, "postedBy") || "Javy";
}

async function recordActivity(
  claimId: string,
  eventType: string,
  body: string,
  who: string,
) {
  await db.insert(claimActivity).values({
    tenantId: DEFAULT_TENANT_ID,
    claimId,
    eventType,
    body,
    actor: who,
  });
}

function revalidateClaimSurfaces(claimId: string, policyId: string, contactId?: string | null) {
  revalidatePath(`/claims/${claimId}`);
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/claims");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function logClaim(formData: FormData) {
  const policyId = str(formData, "policyId");
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) throw new Error("Policy not found");

  const dateReported = day(str(formData, "dateReported"));
  if (!dateReported) throw new Error("Date reported is required.");

  const causeType = str(formData, "causeType") || "other";
  if (!isClaimCause(causeType)) throw new Error("Unknown cause.");

  const reportedHow = str(formData, "reportedHow") || "phone";
  if (!isClaimChannel(reportedHow)) throw new Error("Unknown report channel.");

  const status = str(formData, "status") || "inquiry";
  if (!isClaimStatus(status)) throw new Error("Unknown status.");

  const who = actor(formData);
  const [claim] = await db
    .insert(claims)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      dateReported,
      dateOfLoss: day(str(formData, "dateOfLoss")),
      causeType,
      description: str(formData, "description") || null,
      reportedHow,
      carrierClaimNumber: str(formData, "carrierClaimNumber") || null,
      status,
    })
    .returning();

  await recordActivity(
    claim.id,
    "opened",
    `Logged ${causeType.replaceAll("_", " ")} notice on ${policy.policyNumber}. Status: ${claimStatusLabel(status)}.`,
    who,
  );

  revalidateClaimSurfaces(claim.id, policyId, policy.contactId);
  redirect(`/claims/${claim.id}`);
}

export async function updateClaim(formData: FormData) {
  const claimId = str(formData, "claimId");
  const [existing] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!existing) throw new Error("Claim not found");

  const [policy] = await db.select().from(policies).where(eq(policies.id, existing.policyId));
  const who = actor(formData);

  const dateReported = day(str(formData, "dateReported")) ?? existing.dateReported;
  const causeType = str(formData, "causeType") || existing.causeType;
  const reportedHow = str(formData, "reportedHow") || existing.reportedHow;
  const status = str(formData, "status") || existing.status;
  if (!isClaimCause(causeType) || !isClaimChannel(reportedHow) || !isClaimStatus(status)) {
    throw new Error("Invalid claim fields.");
  }

  await db
    .update(claims)
    .set({
      dateReported,
      dateOfLoss: day(str(formData, "dateOfLoss")),
      causeType,
      description: str(formData, "description") || null,
      reportedHow,
      carrierClaimNumber: str(formData, "carrierClaimNumber") || null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(claims.id, claimId));

  if (status !== existing.status) {
    await recordActivity(
      claimId,
      "status_changed",
      `Status ${claimStatusLabel(existing.status)} → ${claimStatusLabel(status)}.`,
      who,
    );
  } else {
    await recordActivity(claimId, "fields_updated", "Updated the desk log fields.", who);
  }

  revalidateClaimSurfaces(claimId, existing.policyId, policy?.contactId);
}

export async function addClaimNote(formData: FormData) {
  const claimId = str(formData, "claimId");
  const body = str(formData, "body");
  if (!body) throw new Error("Note text is required.");
  const who = actor(formData);
  const [claim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!claim) throw new Error("Claim not found");
  const [policy] = await db.select().from(policies).where(eq(policies.id, claim.policyId));

  await db.insert(claimNotes).values({
    tenantId: DEFAULT_TENANT_ID,
    claimId,
    body,
    postedBy: who,
  });
  await recordActivity(claimId, "note_added", `${who} posted a note.`, who);
  revalidateClaimSurfaces(claimId, claim.policyId, policy?.contactId);
}

export async function addClaimAttachment(formData: FormData) {
  const claimId = str(formData, "claimId");
  const [claim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!claim) throw new Error("Claim not found");
  const [policy] = await db.select().from(policies).where(eq(policies.id, claim.policyId));

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to attach.");
  }

  const id = randomUUID();
  const filename = file.name || "attachment";
  const storagePath = path.join(DEFAULT_TENANT_ID, "claims", claimId, `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));

  const docType = str(formData, "docType") || "other";
  const who = actor(formData);
  await db.insert(claimAttachments).values({
    id,
    tenantId: DEFAULT_TENANT_ID,
    claimId,
    filename,
    mimeType: file.type || "application/octet-stream",
    storagePath,
    docType,
  });
  await recordActivity(claimId, "file_added", `Attached ${filename} (${docType}).`, who);
  revalidateClaimSurfaces(claimId, claim.policyId, policy?.contactId);
}

export async function updateClaimStatus(formData: FormData) {
  const claimId = str(formData, "claimId");
  const status = str(formData, "status");
  if (!isClaimStatus(status)) throw new Error("Unknown status.");
  const [existing] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!existing) throw new Error("Claim not found");
  if (existing.status === status) return;

  const [policy] = await db.select().from(policies).where(eq(policies.id, existing.policyId));
  const who = actor(formData);
  await db
    .update(claims)
    .set({ status, updatedAt: new Date() })
    .where(eq(claims.id, claimId));
  await recordActivity(
    claimId,
    "status_changed",
    `Status ${claimStatusLabel(existing.status)} → ${claimStatusLabel(status)}.`,
    who,
  );
  revalidateClaimSurfaces(claimId, existing.policyId, policy?.contactId);
}
