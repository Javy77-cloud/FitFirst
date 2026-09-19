import { NextResponse } from "next/server";
import { applyDocumentPipelineEnvelopeStatus } from "@/lib/document-pipeline/apply-envelope";
import {
  envelopeIdFromConnectPayload,
  mapDocuSignEnvelopeStatus,
} from "@/lib/integrations/docusign-envelopes";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  const parsed = envelopeIdFromConnectPayload(payload);
  if (!parsed.envelopeId) {
    return NextResponse.json({ ok: false, reason: "missing_envelope" }, { status: 202 });
  }
  const status = mapDocuSignEnvelopeStatus(parsed.status);
  const applied = await applyDocumentPipelineEnvelopeStatus({
    envelopeId: parsed.envelopeId,
    status,
    rawStatus: parsed.status,
  });
  return NextResponse.json({
    ok: applied,
    envelopeId: parsed.envelopeId,
    status,
  });
}
