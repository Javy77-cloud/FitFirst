import { NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/import-export/admin";
import { listJobs } from "@/lib/import-export/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;
  const jobs = await listJobs();
  return NextResponse.json(
    jobs.map((job) => ({
      id: job.id,
      actor_name: job.actorName,
      actor_email: job.actorEmail,
      entity: job.entity,
      action: job.action,
      status: job.status,
      filename: job.filename,
      rows_ok: job.rowsOk,
      rows_error: job.rowsError,
      rows_create: job.rowsCreate,
      rows_update: job.rowsUpdate,
      rows_skip: job.rowsSkip,
      has_error_csv: Boolean(job.errorCsv),
      created_at: job.createdAt.toISOString(),
    })),
  );
}
