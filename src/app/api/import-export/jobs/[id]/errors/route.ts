import { csvResponse, requireImportAdmin } from "@/lib/import-export/admin";
import { getJob } from "@/lib/import-export/jobs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const job = await getJob(id);
  if (!job || !job.errorCsv) {
    return Response.json({ error: "No error CSV for this job." }, { status: 404 });
  }
  return csvResponse(`fitfirst-${job.entity}-errors.csv`, job.errorCsv);
}
