import {
  CLAIM_DIARY_DISCLAIMER,
  claimDiaryKindLabel,
  isClaimDiaryKind,
  isClaimDiaryStatus,
  type ClaimDiaryKind,
  type ClaimDiaryStatus,
} from "@/lib/domain-ams";

export type ClaimDiaryAction = "complete";

export function nextClaimDiaryStatus(
  status: ClaimDiaryStatus,
  action: ClaimDiaryAction,
): ClaimDiaryStatus | null {
  if (action === "complete" && status === "open") return "completed";
  return null;
}

export function claimDiaryChangesClaim(): false {
  return false;
}

export function validateClaimDiaryDraft(input: {
  kind: string;
  body: string;
  dueAt?: Date | null;
}):
  | { ok: true; kind: ClaimDiaryKind; body: string; dueAt: Date | null }
  | { ok: false; error: string } {
  if (!isClaimDiaryKind(input.kind)) {
    return { ok: false, error: "Choose a claim diary kind." };
  }
  const body = input.body.trim();
  if (!body) return { ok: false, error: "A diary note is required." };
  return { ok: true, kind: input.kind, body, dueAt: input.dueAt ?? null };
}

export function isOpenClaimDiary(status: string): boolean {
  return isClaimDiaryStatus(status) && status === "open";
}

export function claimDiaryLine(kind: string, policyNumber?: string | null): string {
  const label = claimDiaryKindLabel(kind);
  return policyNumber ? `${label} · ${policyNumber}` : label;
}

export { CLAIM_DIARY_DISCLAIMER };
