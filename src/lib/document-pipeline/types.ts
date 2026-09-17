export const DOCUMENT_PIPELINE_JOB_TYPES = ["cancellation", "aor"] as const;
export type DocumentPipelineJobType = (typeof DOCUMENT_PIPELINE_JOB_TYPES)[number];

export const DOCUMENT_PIPELINE_STATUSES = [
  "extracting",
  "needs_review",
  "out_for_signature",
  "done",
] as const;
export type DocumentPipelineStatus = (typeof DOCUMENT_PIPELINE_STATUSES)[number];

export const DOCUMENT_PIPELINE_FIELD_SOURCES = ["gemini", "deal", "blank"] as const;
export type DocumentPipelineFieldSource = (typeof DOCUMENT_PIPELINE_FIELD_SOURCES)[number];

export type DocumentPipelineExtractField = {
  key: string;
  label: string;
  group: string;
  extracted: string;
  confidence: number;
  source: DocumentPipelineFieldSource;
};

export type DocumentPipelineExtractPayload = {
  fields: DocumentPipelineExtractField[];
  engine: "gemini";
  rawText?: string;
};

export type DocumentPipelineConfirmedFields = Record<string, string>;

export type DocumentPipelineDealExtras = {
  namedInsured?: string | null;
  phone?: string | null;
  email?: string | null;
  mailing?: string | null;
  currentCarrier?: string | null;
  policyNumber?: string | null;
  effectiveDate?: string | null;
  newAgency?: string | null;
};

export type DocumentPipelineReviewRow = {
  key: string;
  label: string;
  group: string;
  extracted: string;
  confirmed: string;
  changed: boolean;
  source: DocumentPipelineFieldSource;
};

export const DOCUMENT_PIPELINE_TYPE_LABELS: Record<DocumentPipelineJobType, string> = {
  cancellation: "Cancellation pack",
  aor: "AOR pack",
};

export const DOCUMENT_PIPELINE_STATUS_LABELS: Record<DocumentPipelineStatus, string> = {
  extracting: "Extracting",
  needs_review: "Needs review",
  out_for_signature: "Out for signature",
  done: "Done",
};

export const DOCUMENT_PIPELINE_TEMPLATE_SLUGS: Record<DocumentPipelineJobType, string> = {
  cancellation: "agency-cancellation",
  aor: "agency-aor",
};

export function isDocumentPipelineJobType(value: string | null | undefined): value is DocumentPipelineJobType {
  return DOCUMENT_PIPELINE_JOB_TYPES.includes((value ?? "") as DocumentPipelineJobType);
}

export function isDocumentPipelineStatus(value: string | null | undefined): value is DocumentPipelineStatus {
  return DOCUMENT_PIPELINE_STATUSES.includes((value ?? "") as DocumentPipelineStatus);
}

export function isAgencyLetterDocType(docType?: string | null): boolean {
  const t = (docType ?? "").trim().toLowerCase();
  return (
    t === "cancellation" ||
    t === "aor" ||
    t === "agency_letter" ||
    t.includes("cancellation") ||
    t === "agency-aor" ||
    t.includes("aor")
  );
}
