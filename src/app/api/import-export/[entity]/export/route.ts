import { csvFilename } from "@/lib/api/v1/csv";
import { csvResponse, requireImportAdmin } from "@/lib/import-export/admin";
import { isImportEntity } from "@/lib/import-export/catalog";
import { exportCsv, exportQuotesJson } from "@/lib/import-export/export";
import { recordJob } from "@/lib/import-export/jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ entity: string }> }) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;
  const { entity } = await context.params;
  if (!isImportEntity(entity)) {
    return Response.json({ error: "Unknown entity." }, { status: 404 });
  }
  const url = new URL(request.url);
  if (entity === "quotes" && url.searchParams.get("format") === "json") {
    const body = await exportQuotesJson();
    const filename = csvFilename("quotes").replace(/\.csv$/, ".json");
    await recordJob({
      actor: auth.actor,
      entity,
      action: "export",
      filename,
      notes: "JSON quote sheets + quotes",
    });
    return csvResponse(filename, body, "application/json; charset=utf-8");
  }
  const body = await exportCsv(entity);
  const filename = csvFilename(entity);
  const rows = body.trim() ? body.trim().split(/\r?\n/).length - 1 : 0;
  await recordJob({
    actor: auth.actor,
    entity,
    action: "export",
    filename,
    rowsOk: Math.max(0, rows),
  });
  return csvResponse(filename, body);
}
