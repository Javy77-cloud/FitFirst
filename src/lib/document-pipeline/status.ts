import {
  DOCUMENT_PIPELINE_STATUS_LABELS,
  DOCUMENT_PIPELINE_TYPE_LABELS,
  isDocumentPipelineStatus,
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
  if (!isDocumentPipelineStatus(status)) return null;
  return DOCUMENT_PIPELINE_STATUS_LABELS[status];
}

export function letterStatusChipClass(status: DocumentPipelineStatus | null): string {
  if (status === "extracting") return "bg-fit-yellow-bg text-fit-yellow";
  if (status === "needs_review") return "bg-fit-check-bg text-fit-check";
  if (status === "out_for_signature") return "bg-violet-100 text-violet-900";
  if (status === "done") return "bg-fit-green-bg text-fit-green";
  return "bg-muted text-muted-foreground";
}

export function canReviewLetterJob(status: DocumentPipelineStatus | null): boolean {
  return status === "needs_review" || status === "out_for_signature" || status === "done";
}

export function canFillLetterJob(input: {
  status: DocumentPipelineStatus | null;
  confirmedAt?: Date | string | null;
  confirmedFields?: Record<string, string> | null;
}): boolean {
  if (!input.confirmedAt) return false;
  const values = Object.values(input.confirmedFields ?? {}).filter((value) => value.trim());
  return values.length > 0 && input.status !== "extracting";
}

export function canSendLetterJob(): boolean {
  return false;
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
  const types: DocumentPipelineJobType[] = ["cancellation", "aor"];
  return types.map((type) => {
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
