import {
  ENDORSEMENT_DRAFT_DISCLAIMER,
  endorsementDraftNextStep,
  endorsementFormLabel,
  isEndorsementDraftStatus,
  isEndorsementFormCode,
  type EndorsementDraftStatus,
  type EndorsementFormCode,
} from "@/lib/domain-ams";

export type EndorsementDraftAction = "ready" | "withdraw";

export function nextEndorsementDraftStatus(
  status: EndorsementDraftStatus,
  action: EndorsementDraftAction,
): EndorsementDraftStatus | null {
  if (action === "withdraw" && (status === "drafted" || status === "ready")) {
    return "withdrawn";
  }
  if (action === "ready" && status === "drafted") return "ready";
  return null;
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
  return isEndorsementDraftStatus(status) && (status === "drafted" || status === "ready");
}

export function endorsementDraftLine(formCode: string, policyNumber: string): string {
  return `${endorsementFormLabel(formCode)} · ${policyNumber}`;
}

export function endorsementDraftActionCopy(status: string): string {
  return endorsementDraftNextStep(status);
}

export { ENDORSEMENT_DRAFT_DISCLAIMER };
