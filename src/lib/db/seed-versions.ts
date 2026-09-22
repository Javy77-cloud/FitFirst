import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { documentVersions, documents, policyChangeLogs } from "./schema";
import {
  ADMIN_NAME,
  ADMIN_USER_ID,
  AGENT_NAME,
  AGENT_USER_ID,
  DOCUMENT_VERSION_IDS,
  ELENA_DOC_DEC_ID,
  ELENA_DOC_POLICY_DEC_ID,
  ELENA_DOC_POLICY_ID_CARD_ID,
  ELENA_DOC_WIND_ID,
  ELENA_POLICY_ID,
  ELENA_QUOTE_PDF_AI_ID,
  ELENA_QUOTE_PDF_TR_ID,
  POLICY_CHANGE_LOG_IDS,
  TENANT_ID,
} from "../fixtures/ids";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

const PRIOR_WIND_TEXT = `WIND MITIGATION INSPECTION
Named Insured: Elena Ruiz
Location: 412 Harbor Isle Dr, Melbourne, FL 32935
City: Melbourne
County: Brevard
Year Built: 2014
Roof Year: 2014
Roof Covering: Comp Shingle
Opening Protection: Partial
Construction: Masonry
Occupancy: Owner
Stories: 1
Miles to Coast: 18
Pool: No
Wind Mitigation Form: OIR-B1-1802
PRIOR COPY — replaced after roof year correction. Kept on the Deal.
`;

const PRIOR_POLICY_DEC_TEXT = `DRAFT POLICY DECLARATIONS
Policy PENDING-ELENA
American Integrity · Elena Ruiz
412 Harbor Isle Dr, Melbourne FL 32935
Effective 2026-09-01 · Premium $3,120 · Cov A $385,000
Draft before the issued number landed. Replaced — this copy stays.
`;

async function writePrior(id: string, filename: string, body: string): Promise<string> {
  const storagePath = path.join(TENANT_ID, "versions", `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf8");
  return storagePath;
}

/** Elena HO3 field history + Deal/Policy document versions. Does not touch Ana. */
export async function seedPolicyDocVersions() {
  const docIds = [
    ELENA_DOC_DEC_ID,
    ELENA_DOC_WIND_ID,
    ELENA_QUOTE_PDF_AI_ID,
    ELENA_QUOTE_PDF_TR_ID,
    ELENA_DOC_POLICY_DEC_ID,
    ELENA_DOC_POLICY_ID_CARD_ID,
  ];
  const docs = await db.select().from(documents).where(inArray(documents.id, docIds));
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const wind = byId.get(ELENA_DOC_WIND_ID);
  const dec = byId.get(ELENA_DOC_DEC_ID);
  const quoteAi = byId.get(ELENA_QUOTE_PDF_AI_ID);
  const quoteTr = byId.get(ELENA_QUOTE_PDF_TR_ID);
  const polDec = byId.get(ELENA_DOC_POLICY_DEC_ID);
  const polId = byId.get(ELENA_DOC_POLICY_ID_CARD_ID);
  if (!wind || !dec || !quoteAi || !quoteTr || !polDec || !polId) return;

  const priorWindPath = await writePrior(
    "wind-v1",
    "sample-melbourne-wind-mit-prior.txt",
    PRIOR_WIND_TEXT,
  );
  const priorPolDecPath = await writePrior(
    "pol-dec-v1",
    "ho3-elena-2026-dec-draft.txt",
    PRIOR_POLICY_DEC_TEXT,
  );

  await db.delete(documentVersions).where(eq(documentVersions.tenantId, TENANT_ID));
  await db.insert(documentVersions).values([
    {
      id: DOCUMENT_VERSION_IDS.decV1,
      tenantId: TENANT_ID,
      documentId: ELENA_DOC_DEC_ID,
      versionNumber: 1,
      filename: dec.filename,
      mimeType: dec.mimeType,
      storagePath: dec.storagePath,
      docType: dec.docType,
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Original upload",
      createdAt: new Date("2026-08-12T14:40:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.windV1,
      tenantId: TENANT_ID,
      documentId: ELENA_DOC_WIND_ID,
      versionNumber: 1,
      filename: "sample-melbourne-wind-mit-prior.txt",
      mimeType: "text/plain",
      storagePath: priorWindPath,
      docType: "wind_mit",
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Original wind mit — roof year read 2014",
      createdAt: new Date("2026-08-12T15:10:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.windV2,
      tenantId: TENANT_ID,
      documentId: ELENA_DOC_WIND_ID,
      versionNumber: 2,
      filename: wind.filename,
      mimeType: wind.mimeType,
      storagePath: wind.storagePath,
      docType: wind.docType,
      uploadedBy: AGENT_USER_ID,
      uploadedByName: AGENT_NAME,
      note: "Replaced after roof year correction. Prior copy kept.",
      createdAt: new Date("2026-08-18T14:40:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.quoteAiV1,
      tenantId: TENANT_ID,
      documentId: ELENA_QUOTE_PDF_AI_ID,
      versionNumber: 1,
      filename: quoteAi.filename,
      mimeType: quoteAi.mimeType,
      storagePath: quoteAi.storagePath,
      docType: quoteAi.docType,
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Issued quote PDF",
      createdAt: new Date("2026-08-28T16:00:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.quoteTrV1,
      tenantId: TENANT_ID,
      documentId: ELENA_QUOTE_PDF_TR_ID,
      versionNumber: 1,
      filename: quoteTr.filename,
      mimeType: quoteTr.mimeType,
      storagePath: quoteTr.storagePath,
      docType: quoteTr.docType,
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Issued quote PDF",
      createdAt: new Date("2026-08-28T16:05:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.polDecV1,
      tenantId: TENANT_ID,
      documentId: ELENA_DOC_POLICY_DEC_ID,
      versionNumber: 1,
      filename: "ho3-elena-2026-dec-draft.txt",
      mimeType: "text/plain",
      storagePath: priorPolDecPath,
      docType: "policy_dec",
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Draft dec before the issued number",
      createdAt: new Date("2026-09-01T15:10:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.polDecV2,
      tenantId: TENANT_ID,
      documentId: ELENA_DOC_POLICY_DEC_ID,
      versionNumber: 2,
      filename: polDec.filename,
      mimeType: polDec.mimeType,
      storagePath: polDec.storagePath,
      docType: polDec.docType,
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Replaced with issued declaration page. Prior draft kept.",
      createdAt: new Date("2026-09-01T16:20:00.000Z"),
    },
    {
      id: DOCUMENT_VERSION_IDS.polIdV1,
      tenantId: TENANT_ID,
      documentId: ELENA_DOC_POLICY_ID_CARD_ID,
      versionNumber: 1,
      filename: polId.filename,
      mimeType: polId.mimeType,
      storagePath: polId.storagePath,
      docType: polId.docType,
      uploadedBy: ADMIN_USER_ID,
      uploadedByName: ADMIN_NAME,
      note: "Issued ID card",
      createdAt: new Date("2026-09-01T16:25:00.000Z"),
    },
  ]);

  await db.delete(policyChangeLogs).where(eq(policyChangeLogs.policyId, ELENA_POLICY_ID));
  await db.insert(policyChangeLogs).values([
    {
      id: POLICY_CHANGE_LOG_IDS.bindStatus,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      changedBy: ADMIN_USER_ID,
      changedByName: ADMIN_NAME,
      changedAt: new Date("2026-09-01T15:05:00.000Z"),
      fieldKey: "status",
      fieldLabel: "Status",
      beforeValue: "—",
      afterValue: "bound",
      source: "bind",
    },
    {
      id: POLICY_CHANGE_LOG_IDS.policyNumber,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      changedBy: ADMIN_USER_ID,
      changedByName: ADMIN_NAME,
      changedAt: new Date("2026-09-01T15:05:00.000Z"),
      fieldKey: "policyNumber",
      fieldLabel: "Policy number",
      beforeValue: "—",
      afterValue: "HO3-ELENA-2026",
      source: "bind",
    },
    {
      id: POLICY_CHANGE_LOG_IDS.activateStatus,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      changedBy: ADMIN_USER_ID,
      changedByName: ADMIN_NAME,
      changedAt: new Date("2026-09-01T16:00:00.000Z"),
      fieldKey: "status",
      fieldLabel: "Status",
      beforeValue: "bound",
      afterValue: "active",
      source: "record_edit",
    },
    {
      id: POLICY_CHANGE_LOG_IDS.premium,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      changedBy: AGENT_USER_ID,
      changedByName: AGENT_NAME,
      changedAt: new Date("2026-09-02T14:00:00.000Z"),
      fieldKey: "premium",
      fieldLabel: "Premium",
      beforeValue: "3120.00",
      afterValue: "2840.00",
      source: "record_edit",
    },
    {
      id: POLICY_CHANGE_LOG_IDS.billing,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      changedBy: AGENT_USER_ID,
      changedByName: AGENT_NAME,
      changedAt: new Date("2026-09-02T14:00:00.000Z"),
      fieldKey: "billingFrequency",
      fieldLabel: "Billing",
      beforeValue: "monthly",
      afterValue: "annual",
      source: "record_edit",
    },
  ]);
}
