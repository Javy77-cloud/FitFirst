/** Three-layer learning pipeline. Raw never crosses the tenant wall. */

export const LEARNING_LAYERS = ["raw", "anonymize", "global_pool"] as const;
export type LearningLayer = (typeof LEARNING_LAYERS)[number];

/** Platform tenant that owns the admin-only global pool. Never a contributing agency. */
export const LEARNING_POOL_PLATFORM_TENANT_ID =
  "00000000-0000-4000-8000-000000000001";

export type RawDocument = {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  sourceLabel: string;
  formVersion: string;
  carrier: string;
  uploadedAt: Date;
};

export type RawExtraction = {
  id: string;
  tenantId: string;
  documentId: string;
  fieldKey: string;
  fieldType: string;
  extractedValue: string;
  sourceLabel: string;
  formVersion: string;
  carrier: string;
  extractedAt: Date;
};

export type RawCorrection = {
  id: string;
  tenantId: string;
  documentId: string;
  extractionId: string;
  fieldKey: string;
  fieldType: string;
  extractedValue: string;
  correctedValue: string;
  sourceLabel: string;
  formVersion: string;
  carrier: string;
  correctedBy: string;
  correctedAt: Date;
};

/** Mapping-only training record. Zero PII. Never includes tenant, names, or raw values that identify a person. */
export type TrainingRecord = {
  sourceLabel: string;
  fieldType: string;
  formVersion: string;
  carrier: string;
  correction: TrainingCorrection;
};

export type TrainingCorrection = {
  kind: "remap" | "value" | "confirm";
  fromField: string;
  toField: string;
  /** Non-PII extracted token only (e.g. "masonry", "2019"). Null when the raw value was PII. */
  extractedValue: string | null;
  /** Non-PII corrected token only. Null when the raw value was PII. */
  correctedValue: string | null;
};

export type LearningPoolConsent = {
  id: string;
  agencyId: string;
  tenantId: string;
  optedIn: boolean;
  termsVersion: string;
  agreedAt: Date | null;
  createdAt: Date;
};

export type PoolWriteRefusal =
  | "consent_not_live"
  | "no_consent_record"
  | "declined"
  | "anonymization_failed";

export type PoolWriteResult =
  | { ok: true; record: TrainingRecord }
  | { ok: false; reason: PoolWriteRefusal };
