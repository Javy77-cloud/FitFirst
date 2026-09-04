import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  clientHistory,
  contacts,
  policies,
  policyAttachments,
  policyEvents,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { normalizePremises, type PremisesParts } from "./premises";
import { reasonLabel } from "./reasons";
import { isInForceStatus } from "./status";
import { applyPolicyChange, parseIsoDate, type PolicyChangeInput } from "./workflow";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export type FilePolicyChangeInput = {
  policyId: string;
  kind: PolicyChangeInput["kind"];
  effectiveDate: string;
  reason: string;
  summary?: string;
  coverageA?: string;
  premium?: string;
  attachDeskCopy?: boolean;
  file?: { filename: string; mimeType: string; buffer: Buffer } | null;
};

export async function filePolicyChange(input: FilePolicyChangeInput) {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, input.policyId)));
  if (!policy) return { ok: false as const, error: "Policy not found." };

  const effectiveDate = parseIsoDate(input.effectiveDate);
  if (!effectiveDate) return { ok: false as const, error: "A valid effective date is required." };

  const coverageA = input.coverageA?.trim()
    ? Number(input.coverageA)
    : undefined;
  const premium = input.premium?.trim() ? input.premium.trim() : undefined;

  const drafted = applyPolicyChange(
    {
      id: policy.id,
      status: policy.status,
      coverageA: policy.coverageA,
      premium: policy.premium,
      endedAt: policy.endedAt,
      endReason: policy.endReason,
    },
    {
      kind: input.kind,
      effectiveDate,
      reason: input.reason,
      summary: input.summary,
      coverageA: coverageA != null && Number.isFinite(coverageA) ? coverageA : undefined,
      premium,
    },
  );
  if (!drafted.ok) return drafted;

  const [risk] = policy.riskId
    ? await db.select().from(risks).where(eq(risks.id, policy.riskId))
    : [];
  const premisesKey = risk
    ? normalizePremises({
        address1: risk.address1,
        city: risk.city,
        state: risk.state,
        zip: risk.zip,
      })
    : null;

  await db
    .update(policies)
    .set({
      status: drafted.policy.status,
      coverageA: drafted.policy.coverageA,
      premium: drafted.policy.premium,
      endedAt: drafted.policy.endedAt,
      endReason: drafted.policy.endReason,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, policy.id));

  const [event] = await db
    .insert(policyEvents)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      policyId: policy.id,
      kind: drafted.event.kind,
      effectiveDate: drafted.event.effectiveDate,
      reason: drafted.event.reason,
      summary: drafted.event.summary,
      changeSet: drafted.event.changeSet,
      premisesKey,
    })
    .returning();

  await db.insert(clientHistory).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId: policy.contactId,
    dealId: policy.dealId,
    policyId: policy.id,
    eventType: drafted.event.kind,
    body: drafted.event.summary,
    occurredAt: drafted.event.effectiveDate,
  });

  if (!isInForceStatus(drafted.policy.status)) {
    await db
      .update(reviewTasks)
      .set({ status: "done", completedAt: new Date() })
      .where(and(eq(reviewTasks.policyId, policy.id), eq(reviewTasks.status, "open")));
  }

  const attachments = [];
  if (input.file && input.file.buffer.length > 0) {
    attachments.push(
      await persistPolicyAttachment({
        policyId: policy.id,
        eventId: event.id,
        filename: input.file.filename,
        mimeType: input.file.mimeType,
        buffer: input.file.buffer,
        docType: docTypeFor(input.kind),
      }),
    );
  } else if (input.attachDeskCopy) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, policy.contactId));
    const text = deskCopyText({
      kind: input.kind,
      policyNumber: policy.policyNumber,
      insured: contact ? `${contact.firstName} ${contact.lastName}` : "Insured",
      premises: premisesKey,
      reason: reasonLabel(input.kind, drafted.event.reason),
      effectiveDate: drafted.event.effectiveDate,
      summary: drafted.event.summary,
    });
    attachments.push(
      await persistPolicyAttachment({
        policyId: policy.id,
        eventId: event.id,
        filename: `${input.kind}-${policy.policyNumber}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(text, "utf8"),
        docType: docTypeFor(input.kind),
      }),
    );
  }

  await writeEoAuditSafe({
    action: "policy_change",
    summary: drafted.event.summary,
    entityType: "policy",
    entityId: policy.id,
    contactId: policy.contactId,
    accountId: policy.accountId,
    policyId: policy.id,
    dealId: policy.dealId,
    meta: {
      kind: drafted.event.kind,
      reason: drafted.event.reason,
      eventId: event.id,
    },
  });

  return {
    ok: true as const,
    policyId: policy.id,
    contactId: policy.contactId,
    eventId: event.id,
    attachments,
  };
}

async function persistPolicyAttachment(input: {
  policyId: string;
  eventId: string | null;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType: string;
}) {
  const id = randomUUID();
  const storagePath = path.join(
    DEFAULT_TENANT_ID,
    "policies",
    input.policyId,
    `${id}-${input.filename}`,
  );
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, input.buffer);

  const [row] = await db
    .insert(policyAttachments)
    .values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      policyId: input.policyId,
      eventId: input.eventId,
      filename: input.filename,
      mimeType: input.mimeType,
      storagePath,
      docType: input.docType,
    })
    .returning();
  return row;
}

export async function attachToPolicy(input: {
  policyId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType?: string;
}) {
  return persistPolicyAttachment({
    policyId: input.policyId,
    eventId: null,
    filename: input.filename,
    mimeType: input.mimeType,
    buffer: input.buffer,
    docType: input.docType ?? "other",
  });
}

function docTypeFor(kind: PolicyChangeInput["kind"]): string {
  if (kind === "endorsement") return "endorsement";
  if (kind === "cancellation") return "cancellation_notice";
  return "non_renewal_notice";
}

function deskCopyText(input: {
  kind: PolicyChangeInput["kind"];
  policyNumber: string;
  insured: string;
  premises: string | null;
  reason: string;
  effectiveDate: Date;
  summary: string;
}): string {
  return [
    `FitFirst desk copy — ${input.kind.replaceAll("_", " ")}`,
    `Insured: ${input.insured}`,
    `Policy: ${input.policyNumber}`,
    `Premises: ${input.premises ?? "—"}`,
    `Effective: ${input.effectiveDate.toISOString().slice(0, 10)}`,
    `Reason: ${input.reason}`,
    `Notes: ${input.summary}`,
    "",
    "Filed on the Policy record. Not a new policy. Not a shopping deal.",
  ].join("\n");
}

export function premisesFromRisk(risk: PremisesParts | null | undefined): string {
  if (!risk) return "";
  return normalizePremises(risk);
}
