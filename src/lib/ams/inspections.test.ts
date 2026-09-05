import { describe, expect, it } from "vitest";
import { INSPECTION_DISCLAIMER } from "@/lib/domain-ams";
import {
  inspectionFilesPolicy,
  inspectionLine,
  isOpenInspection,
  nextInspectionStatus,
  validateInspectionDraft,
} from "./inspections";

describe("policy inspection diary", () => {
  it("schedules then completes Elena roof without filing", () => {
    expect(nextInspectionStatus("requested", "schedule")).toBe("scheduled");
    expect(nextInspectionStatus("scheduled", "complete")).toBe("completed");
    expect(nextInspectionStatus("requested", "waive")).toBe("waived");
    expect(nextInspectionStatus("completed", "complete")).toBeNull();
    expect(inspectionFilesPolicy()).toBe(false);
    expect(isOpenInspection("scheduled")).toBe(true);
    expect(isOpenInspection("completed")).toBe(false);
    expect(inspectionLine("roof", "HO3-ELENA-2026")).toContain("HO3-ELENA-2026");
    expect(INSPECTION_DISCLAIMER.toLowerCase()).toContain("does not file");
  });

  it("requires a known inspection kind", () => {
    expect(validateInspectionDraft({ kind: "carrier_api", scheduledOn: null }).ok).toBe(false);
    const parsed = validateInspectionDraft({
      kind: "roof",
      vendor: "Brevard Roof Docs",
      scheduledOn: new Date("2026-09-12T14:00:00.000Z"),
      notes: "Do not file.",
    });
    expect(parsed.ok).toBe(true);
  });
});
