import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, documentPipelineJobs, documents, policies, signatureEnvelopes } from "@/lib/db/schema";
import {
  filterSignedRows,
  mergeSignedRows,
  providerEnvelopeIdFromResult,
  toSignedRow,
  type SignedRetrievalFilters,
  type SignedRetrievalRow,
} from "@/lib/esign/retrieval";

const SENT_PIPELINE_STATUSES = ["sent", "viewed", "completed", "out_for_signature", "done"] as const;

function partyName(contact: { firstName: string | null; lastName: string | null } | null, fallback?: string | null) {
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
  return name || fallback || null;
}

export async function listSignedRetrievalRows(
  filters: SignedRetrievalFilters = {},
): Promise<SignedRetrievalRow[]> {
  const [jobRows, envelopeRows] = await Promise.all([
    db
      .select({
        job: documentPipelineJobs,
        deal: deals,
        contact: contacts,
        document: documents,
        policy: policies,
      })
      .from(documentPipelineJobs)
      .innerJoin(deals, eq(documentPipelineJobs.dealId, deals.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(documents, eq(documentPipelineJobs.filledDocumentId, documents.id))
      .leftJoin(policies, eq(policies.dealId, deals.id))
      .where(
        and(
          eq(documentPipelineJobs.tenantId, DEFAULT_TENANT_ID),
          or(
            isNotNull(documentPipelineJobs.envelopeId),
            inArray(documentPipelineJobs.status, [...SENT_PIPELINE_STATUSES]),
          ),
        ),
      )
      .orderBy(desc(documentPipelineJobs.updatedAt)),
    db
      .select({
        envelope: signatureEnvelopes,
        document: documents,
        deal: deals,
        contact: contacts,
        policy: policies,
      })
      .from(signatureEnvelopes)
      .innerJoin(documents, eq(signatureEnvelopes.documentId, documents.id))
      .leftJoin(deals, eq(signatureEnvelopes.dealId, deals.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(policies, eq(signatureEnvelopes.policyId, policies.id))
      .where(eq(signatureEnvelopes.tenantId, DEFAULT_TENANT_ID))
      .orderBy(desc(signatureEnvelopes.updatedAt)),
  ]);

  const seenJobs = new Set<string>();
  const pipeline = jobRows.flatMap(({ job, deal, contact, document, policy }) => {
    if (seenJobs.has(job.id)) return [];
    seenJobs.add(job.id);
    return [
      toSignedRow({
        source: "pipeline",
        recordId: job.id,
        jobId: job.id,
        providerEnvelopeId: job.envelopeId,
        provider: "docusign",
        pipelineType: job.type,
        docType: document?.docType,
        tags: document?.tags,
        filename: document?.filename,
        status: job.envelopeStatus ?? job.status,
        signerName: job.signerName,
        signerEmail: job.signerEmail,
        clientName: partyName(contact, deal.primaryNamedInsured || deal.title),
        dealId: deal.id,
        dealTitle: deal.title,
        policyId: policy?.id ?? document?.policyId ?? null,
        policyNumber: policy?.policyNumber ?? null,
        documentId: job.filledDocumentId ?? document?.id ?? null,
        sentAt: job.envelopeSentAt ?? job.updatedAt,
        completedAt: job.envelopeCompletedAt,
      }),
    ];
  });

  const seenEnvelopes = new Set<string>();
  const envelopes = envelopeRows.flatMap(({ envelope, document, deal, contact, policy }) => {
    if (seenEnvelopes.has(envelope.id)) return [];
    seenEnvelopes.add(envelope.id);
    return [
      toSignedRow({
        source: "signature",
        recordId: envelope.id,
        envelopeRecordId: envelope.id,
        providerEnvelopeId: providerEnvelopeIdFromResult(envelope.lastProviderResult),
        provider: envelope.mode === "in_desk" ? "in_desk" : envelope.provider,
        docType: document.docType,
        tags: document.tags,
        filename: document.filename,
        subject: envelope.subject,
        status: envelope.status,
        signerName: envelope.signerName,
        signerEmail: envelope.signerEmail,
        clientName: partyName(contact, deal?.primaryNamedInsured || deal?.title || envelope.signerName),
        dealId: envelope.dealId ?? document.dealId ?? deal?.id ?? null,
        dealTitle: deal?.title ?? null,
        policyId: envelope.policyId ?? document.policyId ?? policy?.id ?? null,
        policyNumber: policy?.policyNumber ?? null,
        documentId: envelope.documentId,
        publicToken: envelope.publicToken,
        sentAt: envelope.sentAt ?? envelope.updatedAt,
        completedAt: envelope.signedAt,
      }),
    ];
  });

  return filterSignedRows(mergeSignedRows(pipeline, envelopes), filters);
}

export async function getSignedRetrievalRow(id: string): Promise<SignedRetrievalRow | null> {
  const rows = await listSignedRetrievalRows();
  return rows.find((row) => row.id === id) ?? null;
}
