"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import {
  claimNotifyCopy,
  claimStatusLabel,
  fnolIntakeValues,
  isClaimCause,
  isClaimChannel,
  isClaimStatus,
  resolveClaimProducerId,
  shouldNotifyProducer,
} from "@/lib/claims";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, claimActivity, claimAttachments, claimNotes, claims, contacts, policies } from "@/lib/db/schema";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function day(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T16:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function actorName(form: FormData, sessionName?: string | null) {
  return str(form, "postedBy") || sessionName?.trim() || "Javy";
}

function partyLabel(contact?: { firstName: string; lastName: string } | null, accountName?: string | null) {
  if (contact) return `${contact.lastName}, ${contact.firstName}`;
  return accountName?.trim() || "Insured";
}

async function recordActivity(claimId: string, eventType: string, body: string, who: string) {
  await db.insert(claimActivity).values({
    tenantId: DEFAULT_TENANT_ID,
    claimId,
    eventType,
    body,
    actor: who,
  });
}

function revalidateClaimSurfaces(claimId: string, policyId?: string | null, contactId?: string | null) {
  revalidatePath(`/claims/${claimId}`);
  revalidatePath("/claims");
  revalidatePath("/alerts");
  if (policyId) {
    revalidatePath(`/policies/${policyId}`);
    revalidatePath("/policies");
  }
  if (contactId) {
    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/contacts");
  }
}

async function loadPolicy(policyId: string | null) {
  if (!policyId) return undefined;
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  return policy;
}

async function loadContact(contactId: string | null) {
  if (!contactId) return undefined;
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  return contact;
}

async function notifyProducer(input: {
  claimId: string;
  producerId: string;
  cause: string;
  status: string;
  party: string;
  policyNumber?: string | null;
  carrierClaimNumber?: string | null;
  who: string;
}) {
  const copy = claimNotifyCopy(input);
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: copy.kind,
    title: copy.title,
    body: copy.body,
    severity: input.status === "inquiry" ? "warning" : "info",
    entityType: "claim",
    entityId: input.claimId,
    userId: input.producerId,
    recipientUserId: input.producerId,
  });
  await db
    .update(claims)
    .set({
      producerId: input.producerId,
      producerNotifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(claims.id, input.claimId));
  await recordActivity(
    input.claimId,
    "producer_notified",
    `In-app FNOL ping sent to the producer. ${copy.title}`,
    input.who,
  );
}

export async function logClaim(formData: FormData) {
  const session = await currentDeskSession();
  const intake = fnolIntakeValues({
    policyId: str(formData, "policyId"),
    contactId: str(formData, "contactId"),
    dateReported: str(formData, "dateReported"),
    dateOfLoss: str(formData, "dateOfLoss"),
    causeType: str(formData, "causeType"),
    status: str(formData, "status"),
    description: str(formData, "description"),
    reportedHow: str(formData, "reportedHow"),
    carrierClaimNumber: str(formData, "carrierClaimNumber"),
    lossLocation: str(formData, "lossLocation"),
    reporterName: str(formData, "reporterName"),
    reporterPhone: str(formData, "reporterPhone"),
    notifyProducer: str(formData, "notifyProducer") || (formData.has("notifyProducer") ? "1" : "0"),
  });

  const policy = await loadPolicy(intake.policyId);
  if (intake.policyId && !policy) throw new Error("Policy not found");

  const contactId = intake.contactId || policy?.contactId || null;
  const contact = await loadContact(contactId);
  if (contactId && !contact) throw new Error("Contact not found");

  const dateReported = day(intake.dateReported) ?? day(new Date().toISOString().slice(0, 10));
  if (!dateReported) throw new Error("Date reported is required.");
  if (!isClaimCause(intake.causeType)) throw new Error("Unknown cause.");
  if (!isClaimChannel(intake.reportedHow)) throw new Error("Unknown report channel.");
  if (!isClaimStatus(intake.status)) throw new Error("Unknown status.");

  const who = actorName(formData, session.name);
  const producerId = resolveClaimProducerId({
    policyOwnerId: policy?.ownerId,
    contactOwnerId: contact?.ownerId,
    explicitProducerId: str(formData, "producerId"),
  });

  const [claim] = await db
    .insert(claims)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId: policy?.id ?? null,
      contactId: contact?.id ?? null,
      dateReported,
      dateOfLoss: day(intake.dateOfLoss ?? ""),
      causeType: intake.causeType,
      description: intake.description,
      reportedHow: intake.reportedHow,
      carrierClaimNumber: intake.carrierClaimNumber,
      lossLocation: intake.lossLocation,
      reporterName: intake.reporterName,
      reporterPhone: intake.reporterPhone,
      producerId,
      status: intake.status,
    })
    .returning();

  const linked = [policy?.policyNumber, contact ? `${contact.lastName}, ${contact.firstName}` : null]
    .filter(Boolean)
    .join(" · ");
  await recordActivity(
    claim.id,
    "fnol_logged",
    linked
      ? `FNOL intake: ${intake.causeType.replaceAll("_", " ")} on ${linked}. Status: ${claimStatusLabel(intake.status)}.`
      : `FNOL intake: ${intake.causeType.replaceAll("_", " ")} desk notice. Status: ${claimStatusLabel(intake.status)}.`,
    who,
  );

  if (shouldNotifyProducer(intake.notifyProducer) && producerId) {
    await notifyProducer({
      claimId: claim.id,
      producerId,
      cause: intake.causeType,
      status: intake.status,
      party: partyLabel(contact),
      policyNumber: policy?.policyNumber,
      carrierClaimNumber: intake.carrierClaimNumber,
      who,
    });
  } else if (shouldNotifyProducer(intake.notifyProducer) && !producerId) {
    await recordActivity(
      claim.id,
      "fields_updated",
      "No producer on the Policy or Contact — FNOL saved without an in-app ping.",
      who,
    );
  }

  revalidateClaimSurfaces(claim.id, policy?.id, contact?.id);
  const returnTo = str(formData, "returnTo");
  if (returnTo.startsWith("/policies/")) redirect(returnTo);
  redirect(`/claims/${claim.id}`);
}

export async function updateClaim(formData: FormData) {
  const session = await currentDeskSession();
  const claimId = str(formData, "claimId");
  const [existing] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!existing) throw new Error("Claim not found");

  const intake = fnolIntakeValues({
    policyId: str(formData, "policyId") || existing.policyId,
    contactId: str(formData, "contactId") || existing.contactId,
    dateReported: str(formData, "dateReported"),
    dateOfLoss: str(formData, "dateOfLoss"),
    causeType: str(formData, "causeType") || existing.causeType || "other",
    status: str(formData, "status") || existing.status,
    description: str(formData, "description"),
    reportedHow: str(formData, "reportedHow") || existing.reportedHow || "phone",
    carrierClaimNumber: str(formData, "carrierClaimNumber"),
    lossLocation: str(formData, "lossLocation"),
    reporterName: str(formData, "reporterName"),
    reporterPhone: str(formData, "reporterPhone"),
    notifyProducer: false,
  });

  const policy = await loadPolicy(intake.policyId);
  const contact = await loadContact(intake.contactId || policy?.contactId || null);
  const who = actorName(formData, session.name);

  if (!isClaimCause(intake.causeType) || !isClaimChannel(intake.reportedHow) || !isClaimStatus(intake.status)) {
    throw new Error("Invalid claim fields.");
  }

  const producerId = resolveClaimProducerId({
    policyOwnerId: policy?.ownerId,
    contactOwnerId: contact?.ownerId,
    explicitProducerId: existing.producerId,
  });

  await db
    .update(claims)
    .set({
      policyId: policy?.id ?? existing.policyId,
      contactId: contact?.id ?? existing.contactId,
      dateReported: day(intake.dateReported) ?? existing.dateReported,
      dateOfLoss: day(intake.dateOfLoss ?? ""),
      causeType: intake.causeType,
      description: intake.description,
      reportedHow: intake.reportedHow,
      carrierClaimNumber: intake.carrierClaimNumber,
      lossLocation: intake.lossLocation,
      reporterName: intake.reporterName,
      reporterPhone: intake.reporterPhone,
      producerId,
      status: intake.status,
      updatedAt: new Date(),
    })
    .where(eq(claims.id, claimId));

  const carrierJustSet = !existing.carrierClaimNumber && Boolean(intake.carrierClaimNumber);
  if (intake.status !== existing.status) {
    await recordActivity(
      claimId,
      "status_changed",
      `Status ${claimStatusLabel(existing.status)} → ${claimStatusLabel(intake.status)}.`,
      who,
    );
  } else {
    await recordActivity(claimId, "fields_updated", "Updated the FNOL desk log fields.", who);
  }

  if (carrierJustSet && producerId) {
    await notifyProducer({
      claimId,
      producerId,
      cause: intake.causeType,
      status: intake.status,
      party: partyLabel(contact),
      policyNumber: policy?.policyNumber,
      carrierClaimNumber: intake.carrierClaimNumber,
      who,
    });
  }

  revalidateClaimSurfaces(claimId, policy?.id ?? existing.policyId, contact?.id ?? existing.contactId);
}

export async function addClaimNote(formData: FormData) {
  const session = await currentDeskSession();
  const claimId = str(formData, "claimId");
  const body = str(formData, "body");
  if (!body) throw new Error("Note text is required.");
  const who = actorName(formData, session.name);
  const [claim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!claim) throw new Error("Claim not found");

  await db.insert(claimNotes).values({
    tenantId: DEFAULT_TENANT_ID,
    claimId,
    body,
    postedBy: who,
  });
  await recordActivity(claimId, "note_added", `${who} posted a note.`, who);
  revalidateClaimSurfaces(claimId, claim.policyId, claim.contactId);
}

export async function addClaimAttachment(formData: FormData) {
  const session = await currentDeskSession();
  const claimId = str(formData, "claimId");
  const [claim] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!claim) throw new Error("Claim not found");

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
  const who = actorName(formData, session.name);
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
  revalidateClaimSurfaces(claimId, claim.policyId, claim.contactId);
}

export async function updateClaimStatus(formData: FormData) {
  const session = await currentDeskSession();
  const claimId = str(formData, "claimId");
  const status = str(formData, "status");
  if (!isClaimStatus(status)) throw new Error("Unknown status.");
  const [existing] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!existing) throw new Error("Claim not found");
  if (existing.status === status) return;

  const policy = await loadPolicy(existing.policyId);
  const contact = await loadContact(existing.contactId || policy?.contactId || null);
  const who = actorName(formData, session.name);
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

  const producerId = resolveClaimProducerId({
    policyOwnerId: policy?.ownerId,
    contactOwnerId: contact?.ownerId,
    explicitProducerId: existing.producerId,
  });
  if (producerId && status === "referred_to_carrier") {
    await notifyProducer({
      claimId,
      producerId,
      cause: existing.causeType ?? "other",
      status,
      party: partyLabel(contact),
      policyNumber: policy?.policyNumber,
      carrierClaimNumber: existing.carrierClaimNumber,
      who,
    });
  }

  revalidateClaimSurfaces(claimId, existing.policyId, existing.contactId ?? policy?.contactId);
}

export async function notifyClaimProducer(formData: FormData) {
  const session = await currentDeskSession();
  const claimId = str(formData, "claimId");
  const [existing] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), eq(claims.id, claimId)));
  if (!existing) throw new Error("Claim not found");

  const policy = await loadPolicy(existing.policyId);
  const contact = await loadContact(existing.contactId || policy?.contactId || null);
  const producerId = resolveClaimProducerId({
    policyOwnerId: policy?.ownerId,
    contactOwnerId: contact?.ownerId,
    explicitProducerId: existing.producerId || str(formData, "producerId"),
  });
  if (!producerId) throw new Error("No producer on the Policy or Contact to notify.");

  const who = actorName(formData, session.name);
  await notifyProducer({
    claimId,
    producerId,
    cause: existing.causeType ?? "other",
    status: existing.status,
    party: partyLabel(contact),
    policyNumber: policy?.policyNumber,
    carrierClaimNumber: existing.carrierClaimNumber,
    who,
  });
  revalidateClaimSurfaces(claimId, existing.policyId, existing.contactId ?? policy?.contactId);
}
