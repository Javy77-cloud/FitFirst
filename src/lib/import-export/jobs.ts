import { desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { importExportJobs } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";
import type { JobActor } from "./types";

export async function recordJob(input: {
  actor: JobActor;
  entity: string;
  action: string;
  status?: string;
  filename?: string | null;
  rowsOk?: number;
  rowsError?: number;
  rowsCreate?: number;
  rowsUpdate?: number;
  rowsSkip?: number;
  errorCsv?: string | null;
  notes?: string | null;
}) {
  const [job] = await db
    .insert(importExportJobs)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      entity: input.entity,
      action: input.action,
      status: input.status ?? "ok",
      filename: input.filename ?? null,
      rowsOk: input.rowsOk ?? 0,
      rowsError: input.rowsError ?? 0,
      rowsCreate: input.rowsCreate ?? 0,
      rowsUpdate: input.rowsUpdate ?? 0,
      rowsSkip: input.rowsSkip ?? 0,
      errorCsv: input.errorCsv ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return job;
}

export async function listJobs(limit = 50) {
  return db
    .select()
    .from(importExportJobs)
    .where(eq(importExportJobs.tenantId, DEFAULT_TENANT_ID))
    .orderBy(desc(importExportJobs.createdAt))
    .limit(limit);
}

export async function getJob(id: string) {
  if (!isUuid(id)) return null;
  const [job] = await db
    .select()
    .from(importExportJobs)
    .where(eq(importExportJobs.id, id));
  return job ?? null;
}
