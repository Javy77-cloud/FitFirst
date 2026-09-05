import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, documents, policies, risks, signatureEnvelopes } from "@/lib/db/schema";
import { buildInDeskPacketPdf } from "@/lib/esign/packet-pdf";
import {
  IN_DESK_ESIGN_LABEL,
  IN_DESK_ESIGN_MODE,
  IN_DESK_ESIGN_PROVIDER,
  completeInDeskEsign,
  mintInDeskToken,
  requestInDeskEsign,
} from "@/lib/esign/in-desk";

export type InDeskRecordKind = "deal" | "policy";

export type InDeskRequestInput = {
  kind: InDeskRecordKind;
  recordId: string;
  documentId?: string;
  file?: { name: string; mimeType: string; buffer: Buffer } | null;
  createSample?: boolean;
  signerName?: string;
  signerEmail?: string;
  riskId?: string | null;
};

export type InDeskRequestResult =
  | { ok: true; token: string; documentId: string; recordId: string; kind: InDeskRecordKind }
  | { ok: false; error: "missing_record" | "need_packet" | "packet_not_found" };

export type InDeskCompleteInput = {
  token: string;
  typedName: string;
  kind: string;
  drawnData: string;
  role?: string;
};

export type InDeskCompleteResult =
  | { ok: true; token: string; role: "client" | "agent_demo"; signedAt: Date }
  | { ok: false; error: "missing" | "invalid"; token: string };

async function loadRecord(kind: InDeskRecordKind, id: string) {
  if (kind === "policy") {
    const [policy] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, id)));
    if (!policy) return null;
    return {
      kind: "policy" as const,
      id: policy.id,
      dealId: policy.dealId,
      policyId: policy.id,
      riskId: policy.riskId,
      title: policy.policyNumber,
      partyName: policy.policyNumber,
      status: policy.esignStatus,
    };
  }
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, id)));
  if (!deal) return null;
  const [risk] = await db
    .select()
    .from(risks)
    .where(and(eq(risks.tenantId, DEFAULT_TENANT_ID), eq(risks.dealId, deal.id)));
  return {
    kind: "deal" as const,
    id: deal.id,
    dealId: deal.id,
    policyId: null as string | null,
    riskId: risk?.id ?? null,
    title: deal.title,
    partyName: deal.primaryNamedInsured ?? deal.title,
    status: deal.esignStatus,
  };
}

async function writeRecordStatus(input: {
  kind: InDeskRecordKind;
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

export async function performInDeskRequest(input: InDeskRequestInput): Promise<InDeskRequestResult> {
  const record = await loadRecord(input.kind, input.recordId);
  if (!record) return { ok: false, error: "missing_record" };

  let documentId = input.documentId?.trim() ?? "";
  const riskId = input.riskId || record.riskId;
  if (input.file && input.file.buffer.length > 0) {
    const doc = await persistFile({
      dealId: record.dealId,
      policyId: record.policyId,
      riskId,
      filename: input.file.name,
      mimeType: input.file.mimeType || "application/pdf",
      buffer: input.file.buffer,
      docType: "signed_app",
      slot: "signed_app",
    });
    documentId = doc.id;
  } else if (input.createSample || !documentId) {
    const buffer = await buildInDeskPacketPdf({
      title: `${record.title} signature packet`,
      partyName: input.signerName || record.partyName,
      recordKind: input.kind,
    });
    const doc = await persistFile({
      dealId: record.dealId,
      policyId: record.policyId,
      riskId,
      filename: `${record.title.replaceAll(" ", "-").toLowerCase()}-esign-packet.pdf`,
      mimeType: "application/pdf",
      buffer,
      docType: "signed_app",
      slot: "signed_app",
    });
    documentId = doc.id;
  }

  if (!documentId) return { ok: false, error: "need_packet" };

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (!doc) return { ok: false, error: "packet_not_found" };

  const next = requestInDeskEsign(record.status);
  const token = mintInDeskToken();
  const signerName = input.signerName?.trim() || record.partyName;

  await db.insert(signatureEnvelopes).values({
    tenantId: DEFAULT_TENANT_ID,
    documentId,
    dealId: record.dealId,
    policyId: record.policyId,
    provider: IN_DESK_ESIGN_PROVIDER,
    mode: IN_DESK_ESIGN_MODE,
    status: "sent",
    signerName,
    signerEmail: input.signerEmail?.trim() || null,
    subject: `${IN_DESK_ESIGN_LABEL}: please sign ${doc.filename}`,
    lastProviderResult: "in_desk_requested",
    publicToken: token,
    sentAt: next.requestedAt,
  });

  await writeRecordStatus({
    kind: input.kind,
    id: record.id,
    status: next.status,
    requestedAt: next.requestedAt,
    signedAt: next.signedAt,
    signerName,
    documentId,
  });

  return { ok: true, token, documentId, recordId: record.id, kind: input.kind };
}

export async function performInDeskComplete(input: InDeskCompleteInput): Promise<InDeskCompleteResult> {
  const token = input.token.trim();
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
  if (!envelope) return { ok: false, error: "missing", token };

  const completed = completeInDeskEsign({
    typedName: input.typedName,
    kind: input.kind,
    drawnData: input.drawnData,
    role: input.role,
  });
  if (!completed.ok) return { ok: false, error: "invalid", token };

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

  const recordKind: InDeskRecordKind = envelope.policyId ? "policy" : "deal";
  const recordId = envelope.policyId ?? envelope.dealId;
  if (recordId) {
    const [current] =
      recordKind === "policy"
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

  return { ok: true, token, role: completed.role, signedAt: completed.signedAt };
}
