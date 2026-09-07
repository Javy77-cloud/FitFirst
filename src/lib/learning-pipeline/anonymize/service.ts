// TODO(LEGAL): verify anonymization strips all 18 HIPAA/GLBA identifiers before pool write.

import type { RawCorrection, TrainingRecord } from "../types";
import {
  HIPAA_GLBA_IDENTIFIERS,
  collectPiiHits,
  redactIfPii,
} from "./identifiers";

export { HIPAA_GLBA_IDENTIFIERS };

const FORBIDDEN_TRAINING_KEYS = [
  "tenantId",
  "agencyId",
  "documentId",
  "extractionId",
  "fileName",
  "correctedBy",
  "namedInsured",
  "address",
  "phone",
  "email",
  "ssn",
  "fein",
  "ein",
  "policyNumber",
] as const;

export function anonymizeCorrection(raw: RawCorrection): TrainingRecord {
  const record: TrainingRecord = {
    sourceLabel: raw.sourceLabel,
    fieldType: raw.fieldType,
    formVersion: raw.formVersion,
    carrier: raw.carrier,
    correction: {
      kind: raw.extractedValue === raw.correctedValue ? "confirm" : "value",
      fromField: raw.fieldKey,
      toField: raw.fieldKey,
      extractedValue: redactIfPii(raw.fieldType, raw.extractedValue),
      correctedValue: redactIfPii(raw.fieldType, raw.correctedValue),
    },
  };

  const leaks = collectPiiHits(record);
  if (leaks.length > 0) {
    throw new Error(`Anonymization leaked PII at ${leaks.join(", ")}`);
  }
  return record;
}

export function assertTrainingRecordClean(record: TrainingRecord): void {
  for (const key of FORBIDDEN_TRAINING_KEYS) {
    if (key in record) {
      throw new Error(`Training record must not include ${key}`);
    }
  }
  const leaks = collectPiiHits(record);
  if (leaks.length > 0) {
    throw new Error(`Training record still has PII at ${leaks.join(", ")}`);
  }
}

export function trainingFieldsOf(record: TrainingRecord) {
  return {
    sourceLabel: record.sourceLabel,
    fieldType: record.fieldType,
    formVersion: record.formVersion,
    carrier: record.carrier,
    correction: record.correction,
  };
}
