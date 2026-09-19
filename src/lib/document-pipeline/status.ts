import {
  DOCUMENT_PIPELINE_JOB_TYPES,
  DOCUMENT_PIPELINE_STATUS_LABELS,
  DOCUMENT_PIPELINE_TYPE_LABELS,
  isDocumentPipelineStatus,
  normalizePipelineStatus,
  type DocumentPipelineJobType,
  type DocumentPipelineStatus,
} from "./types";

export type LetterJobCard = {
  type: DocumentPipelineJobType;
  label: string;
  status: DocumentPipelineStatus | null;
  statusLabel: string | null;
  jobId: string | null;
  sourceCount: number;
  confirmed: boolean;
  filled: boolean;
  message: string | null;
};

export function letterStatusLabel(status: string | null | undefined): string | null {
  const normalized = normalizePipelineStatus(status);
  if (!normalized) return null;
  return DOCUMENT_PIPELINE_STATUS_LABELS[normalized];
}

export function letterStatusChipClass(status: DocumentPipelineStatus | null): string {
  const normalized = normalizePipelineStatus(status);
  if (normalized === "extracting") return "bg-fit-yellow-bg text-fit-yellow";
  if (normalized === "needs_review") return "bg-fit-check-bg text-fit-check";
  if (normalized === "sent") return "bg-violet-100 text-violet-900";
  if (normalized === "viewed") return "bg-sky-100 text-sky-900";
  if (normalized === "completed") return "bg-fit-green-bg text-fit-green";
  return "bg-muted text-muted-foreground";
}

export function canReviewLetterJob(status: DocumentPipelineStatus | null): boolean {
  const normalized = normalizePipelineStatus(status);
  return (
    normalized === "needs_review" ||
    normalized === "sent" ||
    normalized === "viewed" ||
    normalized === "completed"
  );
}

export function canFillLetterJob(input: {
  status: DocumentPipelineStatus | null;
  confirmedAt?: Date | string | null;
  confirmedFields?: Record<string, string> | null;
}): boolean {
  if (!input.confirmedAt) return false;
  const values = Object.values(input.confirmedFields ?? {}).filter((value) => value.trim());
  return values.length > 0 && normalizePipelineStatus(input.status) !== "extracting";
}

export function canSendLetterJob(input?: {
  status?: DocumentPipelineStatus | null;
  confirmedAt?: Date | string | null;
  confirmedFields?: Record<string, string> | null;
  signerEmail?: string | null;
}): boolean {
  if (!input) return false;
  if (!input.confirmedAt) return false;
  const values = Object.values(input.confirmedFields ?? {}).filter((value) => value.trim());
  if (values.length === 0) return false;
  if (normalizePipelineStatus(input.status) === "extracting") return false;
  if (normalizePipelineStatus(input.status) === "completed") return false;
  return Boolean((input.signerEmail ?? "").trim());
}

export function letterJobCards<
  T extends {
    id: string;
    type: string;
    status: string;
    sourceDocumentIds?: string[] | null;
    confirmedFields?: Record<string, string> | null;
    confirmedAt?: Date | string | null;
    filledDocumentId?: string | null;
    message?: string | null;
    createdAt?: Date | string;
  },
>(jobs: T[]): LetterJobCard[] {
  return DOCUMENT_PIPELINE_JOB_TYPES.map((type) => {
    const latest = jobs
      .filter((job) => job.type === type)
      .sort((a, b) => {
        const aAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bAt - aAt;
      })[0];
    const status = latest && isDocumentPipelineStatus(latest.status) ? latest.status : null;
    return {
      type,
      label: DOCUMENT_PIPELINE_TYPE_LABELS[type],
      status,
      statusLabel: letterStatusLabel(status),
      jobId: latest?.id ?? null,
      sourceCount: latest?.sourceDocumentIds?.length ?? 0,
      confirmed: Boolean(latest?.confirmedAt) || Object.values(latest?.confirmedFields ?? {}).some((value) => value.trim()),
      filled: Boolean(latest?.filledDocumentId),
      message: latest?.message ?? null,
    };
  });
}
