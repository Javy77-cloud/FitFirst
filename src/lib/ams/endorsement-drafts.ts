import {
  ENDORSEMENT_DRAFT_DISCLAIMER,
  ENDORSEMENT_PIPELINE_STATUSES,
  endorsementDraftNextStep,
  endorsementFormLabel,
  isEndorsementFormCode,
  normalizeEndorsementDraftStatus,
  type EndorsementDraftStatus,
  type EndorsementFormCode,
  type EndorsementPipelineStatus,
} from "@/lib/domain-ams";

export type EndorsementDraftAction = "advance" | "withdraw" | "ready";

const PIPELINE = ENDORSEMENT_PIPELINE_STATUSES as readonly EndorsementPipelineStatus[];

export function nextEndorsementDraftStatus(
  status: string,
  action: EndorsementDraftAction,
): EndorsementDraftStatus | null {
  const current = normalizeEndorsementDraftStatus(status);
  if (!current) return null;

  if (action === "withdraw") {
    if (current === "withdrawn" || current === "effective") return null;
    return "withdrawn";
  }

  // Legacy "ready" action → submit
  if (action === "ready") {
    if (current === "drafted") return "submitted";
    return null;
  }

  if (action === "advance") {
    const idx = PIPELINE.indexOf(current as EndorsementPipelineStatus);
    if (idx < 0 || idx >= PIPELINE.length - 1) return null;
    return PIPELINE[idx + 1];
  }

  return null;
}

export function endorsementAdvanceLabel(status: string): string | null {
  const next = nextEndorsementDraftStatus(status, "advance");
  if (!next) return null;
  const labels: Record<string, string> = {
    submitted: "Submit",
    approved: "Approve",
    filed: "Mark filed",
    effective: "Mark effective",
  };
  return labels[next] ?? `Advance to ${next}`;
}

export function endorsementDraftFilesPolicy(): false {
  return false;
}

export function validateEndorsementDraft(input: {
  formCode: string;
  wording: string;
  effectiveOn: Date | null;
  notes?: string | null;
}):
  | {
      ok: true;
      formCode: EndorsementFormCode;
      wording: string;
      effectiveOn: Date;
      notes: string | null;
    }
  | { ok: false; error: string } {
  if (!isEndorsementFormCode(input.formCode)) {
    return { ok: false, error: "Choose an endorsement form." };
  }
  const wording = input.wording.trim();
  if (!wording) return { ok: false, error: "Draft wording is required." };
  if (!input.effectiveOn) return { ok: false, error: "An effective date is required." };
  return {
    ok: true,
    formCode: input.formCode,
    wording,
    effectiveOn: input.effectiveOn,
    notes: input.notes?.trim() || null,
  };
}

export function isOpenEndorsementDraft(status: string): boolean {
  const current = normalizeEndorsementDraftStatus(status);
  return (
    current === "drafted" ||
    current === "submitted" ||
    current === "approved" ||
    current === "filed"
  );
}

export function endorsementDraftLine(formCode: string, policyNumber: string): string {
  return `${endorsementFormLabel(formCode)} · ${policyNumber}`;
}

export function endorsementDraftActionCopy(status: string): string {
  return endorsementDraftNextStep(status);
}

export { ENDORSEMENT_DRAFT_DISCLAIMER };
