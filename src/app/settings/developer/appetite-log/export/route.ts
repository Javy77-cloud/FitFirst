import { NextResponse } from "next/server";
import { csvFilename, toCsv } from "@/lib/api/v1/csv";
import {
  APPETITE_DATASHEET_HEADERS,
  datasheetCsvCells,
  parseAppetiteDatasheetFilters,
} from "@/lib/appetite/training-datasheet";
import { currentDeskSession } from "@/lib/auth/session";
import { listAppetiteTrainingLogs } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.isSiteDeveloper) {
    return NextResponse.json({ error: "Site developer only." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query: Record<string, string | string[] | undefined> = {};
  for (const key of ["line", "carrier", "county", "result", "yearMin", "yearMax"]) {
    const v = url.searchParams.get(key);
    if (v) query[key] = v;
  }
  const filters = parseAppetiteDatasheetFilters(query);
  const rows = await listAppetiteTrainingLogs(filters);
  const body = toCsv(
    [...APPETITE_DATASHEET_HEADERS],
    rows.map((row) => datasheetCsvCells(row)),
  );

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`appetite-training-${filters.line.toLowerCase()}`)}"`,
      "Cache-Control": "no-store",
    },
  });
}
