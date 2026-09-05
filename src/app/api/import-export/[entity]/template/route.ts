import { csvResponse, requireImportAdmin } from "@/lib/import-export/admin";
import { isImportEntity } from "@/lib/import-export/catalog";
import { templateFor } from "@/lib/import-export/export";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ entity: string }> }) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;
  const { entity } = await context.params;
  if (!isImportEntity(entity)) {
    return Response.json({ error: "Unknown entity." }, { status: 404 });
  }
  return csvResponse(`fitfirst-${entity}-template.csv`, templateFor(entity));
}
