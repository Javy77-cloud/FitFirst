import { NextResponse } from "next/server";
import { uploadSampleDocument } from "@/app/actions/documents";
import { DEAL_ID, RISK_ID } from "@/lib/fixtures/ids";

export async function POST(request: Request) {
  const incoming = await request.formData().catch(() => null);
  const form = new FormData();
  form.set("dealId", String(incoming?.get("dealId") ?? DEAL_ID));
  form.set("riskId", String(incoming?.get("riskId") ?? RISK_ID));
  form.set("sample", String(incoming?.get("sample") ?? "messy"));
  await uploadSampleDocument(form);
  return NextResponse.json({ ok: true });
}
