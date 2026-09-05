import { NextResponse } from "next/server";
import { acceptInboundSignal } from "@/lib/developer-hub/store";
import { slugifyApiName } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-FitFirst-Signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const clean = slugifyApiName(slug);
  let payload: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
  } else {
    const text = await request.text();
    payload = text ? { text } : {};
  }

  const accepted = await acceptInboundSignal(clean, payload);
  if (!accepted) {
    return NextResponse.json(
      { error: "unknown_or_disabled_slug", slug: clean },
      { status: 404, headers: cors },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      slug: accepted.hook.slug,
      payloadId: accepted.stored?.id ?? null,
      alert: "created",
    },
    { status: 202, headers: cors },
  );
}
