/**
 * Learning data pipeline — three isolated layers.
 *
 * 1. raw        Per-agency tenant wall. Documents, extractions, corrections never leave.
 * 2. anonymize  Strips HIPAA/GLBA identifiers. Keeps mapping fields only.
 * 3. global_pool Admin-only. Receives anonymized training records after consent + live flag.
 */
export { LEARNING_LAYERS, LEARNING_POOL_PLATFORM_TENANT_ID } from "./types";
export type {
  LearningLayer,
  LearningPoolConsent,
  PoolWriteResult,
  RawCorrection,
  RawDocument,
  RawExtraction,
  TrainingCorrection,
  TrainingRecord,
} from "./types";

export { LEARNING_POOL_CONSENT_LIVE_DEFAULT, isLearningPoolConsentLive } from "./flags";

export { createRawTenantStore } from "./raw";
export { anonymizeCorrection, assertTrainingRecordClean, HIPAA_GLBA_IDENTIFIERS } from "./anonymize";
export {
  createConsentStore,
  LEARNING_POOL_TERMS_VERSION,
  LEARNING_POOL_CONSENT_LABEL,
  LEARNING_POOL_CONSENT_HELP,
} from "./consent";
export { createGlobalPoolStore, refuseGlobalPoolWrite, writeAnonymizedToGlobalPool } from "./pool";
export { SEED_LIBRARY_CAPACITY, SEED_MAPPED_FORMS } from "./seed-library";
