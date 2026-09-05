import { describe, expect, it } from "vitest";
import { NOTICE_DIARY_DISCLAIMER } from "@/lib/domain-ams";
import {
  isOpenNotice,
  nextNoticeStatus,
  noticeFilesPolicy,
  noticeKindLine,
  validateNoticeDraft,
} from "./notices";

describe("policy notice diary", () => {
  it("drafts Hale non-renew without filing the Policy", () => {
    const parsed = validateNoticeDraft({
      kind: "non_renewal",
      reason: "Carrier appetite — draft only",
      effectiveOn: new Date("2026-10-15T05:00:00.000Z"),
      notes: "Do not mail. Do not file. HP-FL-88421 stays in force.",
    });
    expect(parsed.ok).toBe(true);
    expect(noticeFilesPolicy()).toBe(false);
    expect(nextNoticeStatus("drafted", "mail")).toBe("mailed");
    expect(nextNoticeStatus("drafted", "withdraw")).toBe("withdrawn");
    expect(nextNoticeStatus("mailed", "mail")).toBeNull();
    expect(nextNoticeStatus("mailed", "withdraw")).toBeNull();
    expect(isOpenNotice("drafted")).toBe(true);
    expect(noticeKindLine("non_renewal", "HP-FL-88421")).toContain("Non-renewal notice");
    expect(NOTICE_DIARY_DISCLAIMER.toLowerCase()).toContain("does not file");
  });

  it("requires kind, reason, and effective date", () => {
    expect(validateNoticeDraft({ kind: "cancel", reason: "x", effectiveOn: new Date() }).ok).toBe(
      false,
    );
    expect(
      validateNoticeDraft({
        kind: "cancellation",
        reason: "   ",
        effectiveOn: new Date("2026-10-01T05:00:00.000Z"),
      }).ok,
    ).toBe(false);
    expect(
      validateNoticeDraft({ kind: "reinstatement", reason: "Premium received", effectiveOn: null })
        .ok,
    ).toBe(false);
  });
});
