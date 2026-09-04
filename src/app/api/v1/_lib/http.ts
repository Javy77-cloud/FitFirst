import { NextResponse } from "next/server";
import { requireApiActor, type ApiActor } from "@/lib/auth/api";
import { csvFilename } from "@/lib/api/v1/csv";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonOk(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders });
}

export async function withActor(
  request: Request,
  handler: (actor: ApiActor) => Promise<NextResponse>,
) {
  try {
    const actor = await requireApiActor(request);
    return handler(actor);
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return jsonError("unauthorized", 401);
    }
    throw err;
  }
}

export function options() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function csvOk(kind: string, body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(kind)}"`,
      "Cache-Control": "no-store",
    },
  });
}
