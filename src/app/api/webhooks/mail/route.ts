import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { applyProviderDeliveryEvents } from "@/lib/comms/quote-delivery-store";
import { parseMailProviderEvents } from "@/lib/comms/quote-delivery";

export const dynamic = "force-dynamic";

function webhookSecret(): string | null {
  const secret = (process.env.MAIL_WEBHOOK_SECRET || "").trim();
  return secret.length >= 16 ? secret : null;
}

function authorized(request: Request, secret: string): boolean {
  const header = (
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-mail-webhook-secret") ||
    ""
  ).trim();
  const left = Buffer.from(header);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret || !authorized(request, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const events = parseMailProviderEvents(body);
  if (!events.length) {
    return NextResponse.json({ ok: false, error: "no_events" }, { status: 422 });
  }
  const results = await applyProviderDeliveryEvents(events);
  return NextResponse.json({ ok: true, results });
}
