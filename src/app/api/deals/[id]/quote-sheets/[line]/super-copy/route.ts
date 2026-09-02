import { NextResponse } from "next/server";
import { getDealWorkspace } from "@/lib/db/queries";
import { SHOP_LINES, type ShopLine } from "@/lib/domain";
import { buildSuperCopyPacket } from "@/lib/quote-sheet/super-copy";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; line: string }> },
) {
  const { id, line } = await params;
  if (!(SHOP_LINES as readonly string[]).includes(line)) {
    return NextResponse.json({ error: "Unknown line" }, { status: 404 });
  }
  const workspace = await getDealWorkspace(id);
  if (!workspace) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  const sheet = workspace.sheets.find((s) => s.line === line);
  if (!sheet) {
    return NextResponse.json({ error: "Quote Sheet not found" }, { status: 404 });
  }
  const contact = workspace.contact;
  const packet = buildSuperCopyPacket({
    line: line as ShopLine,
    dealId: workspace.deal.id,
    dealTitle: workspace.deal.title,
    values: sheet.values,
    contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
    contactDob: contact?.dateOfBirth ?? null,
  });
  return new NextResponse(JSON.stringify(packet, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fitfirst-super-copy-${line}.json"`,
    },
  });
}
