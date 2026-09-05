"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, documents, policies, signatureEnvelopes } from "@/lib/db/schema";
import {
  IN_DESK_ESIGN_LABEL,
  IN_DESK_ESIGN_MODE,
  IN_DESK_ESIGN_PROVIDER,
  completeInDeskEsign,
  inDeskSignHref,
  mintInDeskToken,
  requestInDeskEsign,
} from "@/lib/esign/in-desk";
import { buildInDeskPacketPdf } from "@/lib/esign/packet-pdf";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function recordReturnTo(kind: "deal" | "policy", id: string, notice: string) {
  const path = kind === "policy" ? `/policies/${id}` : `/deals/${id}?tab=documents`;
  return `${path}${path.includes("?") ? "&" : "?"}notice=${notice}`;
}

function revalidateRecord(dealId: string | null, policyId: string | null) {
  revalidatePath("/deals");
  revalidatePath("/policies");
  revalidatePath("/esign");
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (policyId) revalidatePath(`/policies/${policyId}`);
}

async function loadRecord(kind: "deal" | "policy", id: string) {
  if (kind === "policy") {
    const [policy] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
    return policy
      ? {
          kind: "policy" as const,
          id: policy.id,
          dealId: policy.dealId,
          policyId: policy.id,
          riskId: policy.riskId,
          title: policy.policyNumber,
          partyName: policy.policyNumber,
          status: policy.esignStatus,
        }
      : null;
  }
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, id)));
  return deal
    ? {
        kind: "deal" as const,
        id: deal.id,
        dealId: deal.id,
        policyId: null as string | null,
        riskId: null as string | null,
        title: deal.title,
        partyName: deal.primaryNamedInsured ?? deal.title,
        status: deal.esignStatus,
      }
    : null;
}

async function writeRecordStatus(input: {
  kind: "deal" | "policy";
  id: string;
  status: string;
  requestedAt: Date | null;
  signedAt: Date | null;
  signerName: string | null;
  documentId: string | null;
}) {
  const patch = {
    esignStatus: input.status,
    esignRequestedAt: input.requestedAt,
    esignSignedAt: input.signedAt,
    esignSignerName: input.signerName,
    esignDocumentId: input.documentId,
    updatedAt: new Date(),
  };
  if (input.kind === "policy") {
    await db
      .update(policies)
      .set(patch)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, input.id)));
    return;
  }
  await db
    .update(deals)
    .set(patch)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, input.id)));
}

export async function requestInDeskSignature(formData: FormData) {
  const kind = str(formData, "recordKind") === "policy" ? "policy" : "deal";
  const recordId = str(formData, "recordId");
  const record = await loadRecord(kind, recordId);
  if (!record) throw new Error("Record not found");

  let documentId = str(formData, "documentId");
  const uploaded = formData.get("file");
  if (uploaded instanceof File && uploaded.size > 0) {
    const buffer = Buffer.from(await uploaded.arrayBuffer());
    const doc = await persistFile({
      dealId: record.dealId,
      policyId: record.policyId,
      riskId: str(formData, "riskId") || record.riskId,
      filename: uploaded.name,
      mimeType: uploaded.type || "application/pdf",
      buffer,
      docType: "signed_app",
      slot: "signed_app",
    });
    documentId = doc.id;
  } else if (str(formData, "createSample") === "1") {
    const buffer = await buildInDeskPacketPdf({
      title: `${record.title} signature packet`,
      partyName: str(formData, "signerName") || record.partyName,
      recordKind: kind,
    });
    const doc = await persistFile({
      dealId: record.dealId,
      policyId: record.policyId,
      riskId: str(formData, "riskId") || record.riskId,
      filename: `${record.title.replaceAll(" ", "-").toLowerCase()}-esign-packet.pdf`,
      mimeType: "application/pdf",
      buffer,
      docType: "signed_app",
      slot: "signed_app",
    });
    documentId = doc.id;
  }

  if (!documentId) {
    redirect(recordReturnTo(kind, record.id, "esign-need-packet"));
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (!doc) throw new Error("Packet not found");

  const next = requestInDeskEsign(record.status);
  const token = mintInDeskToken();
  const signerName = str(formData, "signerName") || record.partyName;

  await db.insert(signatureEnvelopes).values({
    tenantId: DEFAULT_TENANT_ID,
    documentId,
    dealId: record.dealId,
    policyId: record.policyId,
    provider: IN_DESK_ESIGN_PROVIDER,
    mode: IN_DESK_ESIGN_MODE,
    status: "sent",
    signerName,
    signerEmail: str(formData, "signerEmail") || null,
    subject: `${IN_DESK_ESIGN_LABEL}: please sign ${doc.filename}`,
    lastProviderResult: "in_desk_requested",
    publicToken: token,
    sentAt: next.requestedAt,
  });

  await writeRecordStatus({
    kind,
    id: record.id,
    status: next.status,
    requestedAt: next.requestedAt,
    signedAt: next.signedAt,
    signerName,
    documentId,
  });

  revalidateRecord(record.dealId, record.policyId);
  redirect(recordReturnTo(kind, record.id, "esign-requested"));
}

export async function completeInDeskSignature(formData: FormData) {
  const token = str(formData, "token");
  const [envelope] = await db
    .select()
    .from(signatureEnvelopes)
    .where(
      and(
        eq(signatureEnvelopes.tenantId, DEFAULT_TENANT_ID),
        eq(signatureEnvelopes.publicToken, token),
        eq(signatureEnvelopes.mode, IN_DESK_ESIGN_MODE),
      ),
    );
  if (!envelope) {
    redirect(`/sign/${encodeURIComponent(token)}?notice=esign-missing`);
  }

  const completed = completeInDeskEsign({
    typedName: str(formData, "typedName"),
    kind: str(formData, "signatureKind"),
    drawnData: str(formData, "signatureData"),
    role: str(formData, "role"),
  });
  if (!completed.ok) {
    const role = str(formData, "role") === "agent_demo" ? "agent_demo" : "client";
    const href = inDeskSignHref(token, role);
    redirect(`${href}${href.includes("?") ? "&" : "?"}notice=esign-invalid`);
  }

  await db
    .update(signatureEnvelopes)
    .set({
      status: "signed",
      signerName: completed.signerName,
      signatureKind: completed.kind,
      signatureData: completed.signatureData,
      signedByRole: completed.role,
      lastProviderResult: "in_desk_signed",
      signedAt: completed.signedAt,
      updatedAt: new Date(),
    })
    .where(eq(signatureEnvelopes.id, envelope.id));

  const recordKind = envelope.policyId ? "policy" : "deal";
  const recordId = envelope.policyId ?? envelope.dealId;
  if (recordId) {
    const [current] = recordKind === "policy"
      ? await db.select().from(policies).where(eq(policies.id, recordId))
      : await db.select().from(deals).where(eq(deals.id, recordId));
    await writeRecordStatus({
      kind: recordKind,
      id: recordId,
      status: completed.status,
      requestedAt: current && "esignRequestedAt" in current ? current.esignRequestedAt : envelope.sentAt,
      signedAt: completed.signedAt,
      signerName: completed.signerName,
      documentId: envelope.documentId,
    });
  }

  revalidateRecord(envelope.dealId, envelope.policyId);
  const doneHref = inDeskSignHref(token, completed.role);
  redirect(`${doneHref}${doneHref.includes("?") ? "&" : "?"}notice=esign-signed`);
}
