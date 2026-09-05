import { NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/import-export/admin";
import { isImportEntity } from "@/lib/import-export/catalog";
import { previewImport } from "@/lib/import-export/import";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ entity: string }> }) {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;
  const { entity } = await context.params;
  if (!isImportEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV file." }, { status: 400 });
  }
  const text = await file.text();
  const preview = await previewImport(entity, text);
  return NextResponse.json(preview);
}
