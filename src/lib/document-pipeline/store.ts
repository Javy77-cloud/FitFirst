import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documentPipelineJobs, type DocumentPipelineJob } from "@/lib/db/schema";
import type {
  DocumentPipelineConfirmedFields,
  DocumentPipelineExtractPayload,
  DocumentPipelineJobType,
  DocumentPipelineStatus,
} from "./types";

export async function listDocumentPipelineJobs(dealId: string): Promise<DocumentPipelineJob[]> {
  return db
    .select()
    .from(documentPipelineJobs)
    .where(
      and(eq(documentPipelineJobs.tenantId, DEFAULT_TENANT_ID), eq(documentPipelineJobs.dealId, dealId)),
    )
    .orderBy(desc(documentPipelineJobs.createdAt));
}

export async function getDocumentPipelineJob(jobId: string): Promise<DocumentPipelineJob | null> {
  const [row] = await db
    .select()
    .from(documentPipelineJobs)
    .where(
      and(eq(documentPipelineJobs.tenantId, DEFAULT_TENANT_ID), eq(documentPipelineJobs.id, jobId)),
    );
  return row ?? null;
}

export async function createDocumentPipelineJob(input: {
  dealId: string;
  type: DocumentPipelineJobType;
  sourceDocumentIds: string[];
  status?: DocumentPipelineStatus;
  message?: string | null;
}): Promise<DocumentPipelineJob> {
  const now = new Date();
  const [row] = await db
    .insert(documentPipelineJobs)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      type: input.type,
      status: input.status ?? "extracting",
      sourceDocumentIds: input.sourceDocumentIds,
      extractPayload: { fields: [], engine: "gemini" },
      confirmedFields: {},
      message: input.message ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("Could not create the letter job.");
  return row;
}

export async function updateDocumentPipelineJob(
  jobId: string,
  patch: {
    status?: DocumentPipelineStatus;
    sourceDocumentIds?: string[];
    extractPayload?: DocumentPipelineExtractPayload;
    confirmedFields?: DocumentPipelineConfirmedFields;
    filledDocumentId?: string | null;
    formFillId?: string | null;
    message?: string | null;
    extractedAt?: Date | null;
    confirmedAt?: Date | null;
    filledAt?: Date | null;
  },
): Promise<DocumentPipelineJob | null> {
  const [row] = await db
    .update(documentPipelineJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(documentPipelineJobs.tenantId, DEFAULT_TENANT_ID), eq(documentPipelineJobs.id, jobId)),
    )
    .returning();
  return row ?? null;
}
