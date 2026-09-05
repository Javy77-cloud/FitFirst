import { describe, expect, it } from "vitest";
import { ENDORSEMENT_DRAFT_DISCLAIMER } from "@/lib/domain-ams";
import {
  endorsementDraftFilesPolicy,
  endorsementDraftLine,
  isOpenEndorsementDraft,
  nextEndorsementDraftStatus,
  validateEndorsementDraft,
} from "./endorsement-drafts";

describe("endorsement draft stubs", () => {
  it("drafts Elena mortgagee wording without filing the Policy", () => {
    const parsed = validateEndorsementDraft({
      formCode: "mortgagee",
      wording: "Add First Community Bank ISAOA as mortgagee. Desk stub only.",
      effectiveOn: new Date("2026-09-15T05:00:00.000Z"),
      notes: "Tied to the in-progress CSR endorsement. Do not file.",
    });
    expect(parsed.ok).toBe(true);
    expect(endorsementDraftFilesPolicy()).toBe(false);
    expect(nextEndorsementDraftStatus("drafted", "ready")).toBe("ready");
    expect(nextEndorsementDraftStatus("drafted", "withdraw")).toBe("withdrawn");
    expect(nextEndorsementDraftStatus("ready", "withdraw")).toBe("withdrawn");
    expect(nextEndorsementDraftStatus("ready", "ready")).toBeNull();
    expect(isOpenEndorsementDraft("drafted")).toBe(true);
    expect(isOpenEndorsementDraft("withdrawn")).toBe(false);
    expect(endorsementDraftLine("mortgagee", "HO3-ELENA-2026")).toContain("HO3-ELENA-2026");
    expect(ENDORSEMENT_DRAFT_DISCLAIMER.toLowerCase()).toContain("does not file");
  });

  it("requires form, wording, and effective date", () => {
    expect(
      validateEndorsementDraft({
        formCode: "acord",
        wording: "x",
        effectiveOn: new Date("2026-09-15T05:00:00.000Z"),
      }).ok,
    ).toBe(false);
    expect(
      validateEndorsementDraft({
        formCode: "coverage_change",
        wording: "   ",
        effectiveOn: new Date("2026-09-15T05:00:00.000Z"),
      }).ok,
    ).toBe(false);
    expect(
      validateEndorsementDraft({
        formCode: "other",
        wording: "Wording",
        effectiveOn: null,
      }).ok,
    ).toBe(false);
  });
});
