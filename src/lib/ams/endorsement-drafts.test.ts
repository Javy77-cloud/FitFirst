import { describe, expect, it } from "vitest";
import { ENDORSEMENT_DRAFT_DISCLAIMER } from "@/lib/domain-ams";
import {
  endorsementAdvanceLabel,
  endorsementDraftFilesPolicy,
  endorsementDraftLine,
  isOpenEndorsementDraft,
  nextEndorsementDraftStatus,
  validateEndorsementDraft,
} from "./endorsement-drafts";

describe("endorsement draft pipeline", () => {
  it("creates a draft and advances drafted → submitted → approved → filed → effective", () => {
    const parsed = validateEndorsementDraft({
      formCode: "mortgagee",
      wording: "Add First Community Bank ISAOA as mortgagee. Desk stub only.",
      effectiveOn: new Date("2026-09-15T05:00:00.000Z"),
      notes: "Tied to the in-progress CSR endorsement. Do not file.",
    });
    expect(parsed.ok).toBe(true);
    expect(endorsementDraftFilesPolicy()).toBe(false);
    expect(nextEndorsementDraftStatus("drafted", "advance")).toBe("submitted");
    expect(nextEndorsementDraftStatus("submitted", "advance")).toBe("approved");
    expect(nextEndorsementDraftStatus("approved", "advance")).toBe("filed");
    expect(nextEndorsementDraftStatus("filed", "advance")).toBe("effective");
    expect(nextEndorsementDraftStatus("effective", "advance")).toBeNull();
    expect(nextEndorsementDraftStatus("drafted", "ready")).toBe("submitted");
    expect(nextEndorsementDraftStatus("ready", "advance")).toBe("approved");
    expect(nextEndorsementDraftStatus("drafted", "withdraw")).toBe("withdrawn");
    expect(nextEndorsementDraftStatus("submitted", "withdraw")).toBe("withdrawn");
    expect(isOpenEndorsementDraft("drafted")).toBe(true);
    expect(isOpenEndorsementDraft("filed")).toBe(true);
    expect(isOpenEndorsementDraft("effective")).toBe(false);
    expect(isOpenEndorsementDraft("withdrawn")).toBe(false);
    expect(endorsementAdvanceLabel("drafted")).toBe("Submit");
    expect(endorsementDraftLine("mortgagee", "HO3-ELENA-2026")).toContain("HO3-ELENA-2026");
    expect(ENDORSEMENT_DRAFT_DISCLAIMER.toLowerCase()).toContain("drafted");
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
