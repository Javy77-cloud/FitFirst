import { NextResponse } from "next/server";
import { lossRunCsv, lossRunFilename } from "@/lib/ams/loss-runs";
import { listClaimsForPolicy } from "@/lib/db/claim-queries";
import { getPolicyWorkspace } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) {
    return NextResponse.json({ error: "Policy not found." }, { status: 404 });
  }
  const rows = await listClaimsForPolicy(id);
  const csv = lossRunCsv(rows.map(({ claim }) => claim));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${lossRunFilename(workspace.policy.policyNumber)}"`,
      "Cache-Control": "no-store",
    },
  });
}
