import {
  NOTICE_DIARY_DISCLAIMER,
  isNoticeKind,
  isNoticeStatus,
  noticeKindLabel,
  noticeNextStep,
  type NoticeKind,
  type NoticeStatus,
} from "@/lib/domain-ams";

export type NoticeAction = "mail" | "withdraw";

export function nextNoticeStatus(
  status: NoticeStatus,
  action: NoticeAction,
): NoticeStatus | null {
  if (action === "withdraw" && status === "drafted") return "withdrawn";
  if (action === "mail" && status === "drafted") return "mailed";
  return null;
}

export function noticeFilesPolicy(): false {
  return false;
}

export function validateNoticeDraft(input: {
  kind: string;
  reason: string;
  effectiveOn: Date | null;
  notes?: string | null;
}):
  | { ok: true; kind: NoticeKind; reason: string; effectiveOn: Date; notes: string | null }
  | { ok: false; error: string } {
  if (!isNoticeKind(input.kind)) {
    return { ok: false, error: "Choose cancellation, non-renewal, or reinstatement." };
  }
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "A notice reason is required." };
  if (!input.effectiveOn) return { ok: false, error: "An effective date is required." };
  return {
    ok: true,
    kind: input.kind,
    reason,
    effectiveOn: input.effectiveOn,
    notes: input.notes?.trim() || null,
  };
}

export function noticeActionCopy(status: string): string {
  return noticeNextStep(status);
}

export function noticeKindLine(kind: string, policyNumber: string): string {
  return `${noticeKindLabel(kind)} · ${policyNumber}`;
}

export { NOTICE_DIARY_DISCLAIMER };

export function isOpenNotice(status: string): boolean {
  return isNoticeStatus(status) && status === "drafted";
}
