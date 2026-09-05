export const IMPORT_ENTITIES = [
  "leads",
  "contacts",
  "businesses",
  "deals",
  "policies",
  "carriers",
  "activities",
  "notes",
  "documents",
  "commissions",
  "quotes",
  "users",
  "pipelines",
  "appetite",
  "declines",
] as const;

export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export type ImportCapability = "full" | "careful" | "stub" | "export_only";

export type RowAction = "create" | "update" | "skip" | "error";

export type CsvRow = Record<string, string>;

export type PreviewRow = {
  line: number;
  action: RowAction;
  key: string;
  label: string;
  message: string;
  values: CsvRow;
};

export type PreviewResult = {
  entity: ImportEntity;
  headers: string[];
  rows: PreviewRow[];
  createCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
  importable: boolean;
};

export type CommitResult = {
  entity: ImportEntity;
  jobId: string;
  rowsOk: number;
  rowsError: number;
  rowsCreate: number;
  rowsUpdate: number;
  rowsSkip: number;
  errorCsv: string | null;
};

export type JobActor = {
  id: string | null;
  name: string;
  email: string | null;
};
