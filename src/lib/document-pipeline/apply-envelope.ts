import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { signatureEnvelopes } from "@/lib/db/schema";
import { envelopeTimestamps, pipelineStatusFromEnvelope } from "./envelope-status";
import { getDocumentPipelineJobByEnvelope, updateDocumentPipelineJob } from "./store";
import type { DocumentPipelineStatus } from "./types";

export async function applyDocumentPipelineEnvelopeStatus(input: {
  envelopeId: string;
  status: "sent" | "viewed" | "completed" | null;
  rawStatus?: string | null;
}): Promise<boolean> {
  const job = await getDocumentPipelineJobByEnvelope(input.envelopeId);
  if (!job || !input.status) return false;
  const now = new Date();
  const stamps = envelopeTimestamps(input.status, now);
  await updateDocumentPipelineJob(job.id, {
    status: pipelineStatusFromEnvelope(input.status, job.status as DocumentPipelineStatus),
    envelopeStatus: input.rawStatus ?? input.status,
    message: null,
    envelopeSentAt: job.envelopeSentAt ?? stamps.envelopeSentAt ?? now,
    envelopeViewedAt: stamps.envelopeViewedAt ?? job.envelopeViewedAt,
    envelopeCompletedAt: stamps.envelopeCompletedAt ?? job.envelopeCompletedAt,
  });
  await db
    .update(signatureEnvelopes)
    .set({
      status: input.status,
      lastProviderResult: `${input.status}:${input.envelopeId}`,
      signedAt: input.status === "completed" ? now : undefined,
      updatedAt: now,
    })
    .where(
      and(eq(signatureEnvelopes.tenantId, DEFAULT_TENANT_ID), eq(signatureEnvelopes.dealId, job.dealId)),
    );
  revalidatePath(`/deals/${job.dealId}`);
  revalidatePath("/documents");
  revalidatePath("/documents/signed");
  revalidatePath("/esign");
  return true;
}
