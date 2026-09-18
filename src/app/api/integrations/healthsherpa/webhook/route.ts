import { NextResponse } from "next/server";
import { authorizeHealthSherpaWebhook } from "@/lib/healthsherpa/auth";
import { logHealthSherpaIngestError, publicHealthSherpaIngestError } from "@/lib/healthsherpa/errors";
import { ingestHealthSherpaWebhook } from "@/lib/healthsherpa/inbound";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-API-Key, X-Api-Key, x-api-key, api-key, Api-Key, X-FitFirst-Key, X-Webhook-Secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

async function readWebhookBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { text: raw };
  }
}

export async function POST(request: Request) {
  const authorized = await authorizeHealthSherpaWebhook(request);
  if (!authorized.ok) {
    return NextResponse.json(
      {
        error: "unauthorized",
        reason: authorized.reason,
        message: authorized.message,
        inboundConfigured: authorized.inboundConfigured,
        inboundSource: authorized.inboundSource,
        presentedLength: authorized.presentedLength,
        acceptedCount: authorized.acceptedCount,
        prefixMatch: authorized.prefixMatch,
      },
      { status: 401, headers: cors },
    );
  }

  let payload: unknown = {};
  try {
    payload = await readWebhookBody(request);
  } catch {
    payload = {};
  }

  try {
    const result = await ingestHealthSherpaWebhook(payload);
    return NextResponse.json(
      {
        ok: result.accepted,
        reason: result.reason,
        contactId: result.contactId ?? null,
        dealId: result.dealId ?? null,
        policyId: result.policyId ?? null,
        enrollmentId: result.enrollmentId ?? null,
        product: result.product ?? null,
        matchStatus: result.matchStatus ?? null,
        matchReason: result.matchReason ?? null,
        note: "Manual enrollments in HealthSherpa may not fire this webhook.",
      },
      // ACA onboarding asks for HTTP 200; Medicare accepts any 2xx.
      { status: result.accepted ? 200 : 422, headers: cors },
    );
  } catch (error) {
    logHealthSherpaIngestError(error);
    const failure = publicHealthSherpaIngestError(error);
    return NextResponse.json(
      {
        ok: false,
        reason: failure.reason,
        contactId: null,
        dealId: null,
        policyId: null,
        enrollmentId: null,
        product: null,
        matchStatus: null,
        matchReason: null,
        note: "Manual enrollments in HealthSherpa may not fire this webhook.",
      },
      { status: failure.status, headers: cors },
    );
  }
}
