import { NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/import-export/admin";
import { defaultImportDir, scanImportFolder } from "@/lib/zoho-import/jsonl";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireImportAdmin();
  if (!auth.ok) return auth.response;
  const scan = await scanImportFolder(defaultImportDir());
  return NextResponse.json({
    dir: "import/zoho",
    files: scan.files.map((file) => ({
      module: file.module,
      filename: file.filename,
      bytes: file.bytes,
    })),
    extraFiles: scan.extraFiles,
    missingModules: scan.missingModules,
    wipeCommand: "npm run db:wipe-crm",
    importCommand: "npm run db:import-zoho",
    assignOwnerCommand: "npm run db:assign-owner",
  });
}
