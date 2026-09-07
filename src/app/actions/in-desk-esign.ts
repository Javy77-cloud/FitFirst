"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { assertAnaUnbound } from "@/lib/crm/bind-path";
import { db } from "@/lib/db";
import { deals, policies } from "@/lib/db/schema";
import { inDeskSignHref } from "@/lib/esign/in-desk";
import { performInDeskComplete, performInDeskRequest } from "@/lib/esign/in-desk-store";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function recordReturnTo(kind: "deal" | "policy", id: string, notice: string) {
  const path = kind === "policy" ? `/policies/${id}` : `/deals/${id}?tab=documents`;
  return `${path}${path.includes("?") ? "&" : "?"}notice=${notice}`;
}

function revalidateRecord(kind: "deal" | "policy", id: string) {
  revalidatePath("/deals");
  revalidatePath("/policies");
  revalidatePath("/esign");
  if (kind === "policy") revalidatePath(`/policies/${id}`);
  else revalidatePath(`/deals/${id}`);
}

async function readUploadAsync(form: FormData) {
  const uploaded = form.get("file");
  if (!(uploaded instanceof File) || uploaded.size <= 0) return null;
  return {
    name: uploaded.name,
    mimeType: uploaded.type || "application/pdf",
    buffer: Buffer.from(await uploaded.arrayBuffer()),
  };
}

async function requestFromForm(formData: FormData, forceSample: boolean) {
  const kind = str(formData, "recordKind") === "policy" ? "policy" : "deal";
  const recordId = str(formData, "recordId");
  const result = await performInDeskRequest({
    kind,
    recordId,
    documentId: str(formData, "documentId"),
    file: await readUploadAsync(formData),
    createSample: forceSample || str(formData, "createSample") === "1",
    signerName: str(formData, "signerName"),
    signerEmail: str(formData, "signerEmail"),
    riskId: str(formData, "riskId") || null,
  });
  if (!result.ok) {
    if (result.error === "missing_record") throw new Error("Record not found");
    redirect(recordReturnTo(kind, recordId, "esign-need-packet"));
  }
  revalidateRecord(result.kind, result.recordId);
  redirect(recordReturnTo(result.kind, result.recordId, "esign-requested"));
}

export async function requestInDeskSignature(formData: FormData) {
  await requestFromForm(formData, false);
}

/** Bound to the sample button so it does not depend on submitter name in FormData. */
export async function requestInDeskSamplePacket(formData: FormData) {
  await requestFromForm(formData, true);
}

/** Comms "Bind policy" starts in-desk signature. Client sign advances the deal to Bound. */
export async function requestBindSignature(formData: FormData) {
  const dealId = str(formData, "dealId");
  assertAnaUnbound(dealId);
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  if (deal.boundAt) {
    const existing = await db.select().from(policies).where(eq(policies.dealId, dealId));
    if (existing[0]) redirect(`/policies/${existing[0].id}`);
    redirect(`/deals/${dealId}`);
  }
  const result = await performInDeskRequest({
    kind: "deal",
    recordId: dealId,
    createSample: true,
    signerName: deal.primaryNamedInsured ?? deal.title,
  });
  if (!result.ok) {
    redirect(`/deals/${dealId}?tab=documents&notice=esign-need-packet`);
  }
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  redirect(inDeskSignHref(result.token));
}

export async function completeInDeskSignature(formData: FormData) {
  const token = str(formData, "token");
  const role = str(formData, "role") === "agent_demo" ? "agent_demo" : "client";
  const result = await performInDeskComplete({
    token,
    typedName: str(formData, "typedName"),
    kind: str(formData, "signatureKind"),
    drawnData: str(formData, "signatureData"),
    role,
  });
  if (!result.ok) {
    const href = inDeskSignHref(token, role);
    redirect(`${href}${href.includes("?") ? "&" : "?"}notice=esign-${result.error === "missing" ? "missing" : "invalid"}`);
  }
  revalidatePath("/deals");
  revalidatePath("/policies");
  revalidatePath("/esign");
  const doneHref = inDeskSignHref(result.token, result.role);
  redirect(`${doneHref}${doneHref.includes("?") ? "&" : "?"}notice=esign-signed`);
}
