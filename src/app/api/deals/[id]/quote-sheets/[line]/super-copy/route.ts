import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import { getDealWorkspace } from "@/lib/db/queries";
import { buildSuperCopyPacket } from "@/lib/wire/sheet-packet";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; line: string }> },
) {
  const { id, line } = await context.params;
  const workspace = await getDealWorkspace(id);
  if (!workspace?.quoteSheet) {
    return NextResponse.json({ error: "Quote Sheet not found" }, { status: 404 });
  }
  const packet = buildSuperCopyPacket({
    line: (line as ShopLine) || "home",
    tenantId: DEFAULT_TENANT_ID,
    dealId: workspace.deal.id,
    dealTitle: workspace.deal.title,
    values: workspace.quoteSheet.values,
    contactName: workspace.contact
      ? `${workspace.contact.firstName} ${workspace.contact.lastName}`
      : workspace.deal.primaryNamedInsured,
  });
  return NextResponse.json(packet, {
    headers: {
      "Content-Disposition": `attachment; filename="fitfirst-sheet-${workspace.deal.id}.json"`,
    },
  });
}
