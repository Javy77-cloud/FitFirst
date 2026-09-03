import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import { getDealWorkspace } from "@/lib/db/queries";
import { buildFillSheetFromQuoteSheet } from "@/lib/wire/sheet-packet";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; line: string }> },
) {
  const { id, line } = await context.params;
  const workspace = await getDealWorkspace(id);
  if (!workspace?.quoteSheet) {
    return NextResponse.json({ error: "Quote Sheet not found" }, { status: 404 });
  }
  const sheet = buildFillSheetFromQuoteSheet({
    tenantId: DEFAULT_TENANT_ID,
    dealId: workspace.deal.id,
    line: (line as ShopLine) || "home",
    values: workspace.quoteSheet.values,
    insured: workspace.deal.primaryNamedInsured,
  });
  return NextResponse.json(sheet);
}
