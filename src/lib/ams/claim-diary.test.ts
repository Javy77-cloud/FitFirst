import { describe, expect, it } from "vitest";
import { CLAIM_DIARY_DISCLAIMER } from "@/lib/domain-ams";
import {
  claimDiaryChangesClaim,
  claimDiaryLine,
  isOpenClaimDiary,
  nextClaimDiaryStatus,
  validateClaimDiaryDraft,
} from "./claim-diary";

describe("claim diary", () => {
  it("opens Elena wind follow-up without filing FNOL or changing claim status", () => {
    const parsed = validateClaimDiaryDraft({
      kind: "docs_requested",
      body: "Request roof photos. Handle FNOL on the carrier site. Do not file.",
      dueAt: new Date("2026-09-10T16:00:00.000Z"),
    });
    expect(parsed.ok).toBe(true);
    expect(claimDiaryChangesClaim()).toBe(false);
    expect(nextClaimDiaryStatus("open", "complete")).toBe("completed");
    expect(nextClaimDiaryStatus("completed", "complete")).toBeNull();
    expect(isOpenClaimDiary("open")).toBe(true);
    expect(claimDiaryLine("docs_requested", "HO3-ELENA-2026")).toContain("Docs requested");
    expect(CLAIM_DIARY_DISCLAIMER.toLowerCase()).toContain("does not file fnol");
  });

  it("requires a known kind and a note", () => {
    expect(validateClaimDiaryDraft({ kind: "reserve", body: "x" }).ok).toBe(false);
    expect(validateClaimDiaryDraft({ kind: "follow_up", body: "   " }).ok).toBe(false);
    expect(validateClaimDiaryDraft({ kind: "insured_call", body: "Called Elena." }).ok).toBe(true);
  });
});
