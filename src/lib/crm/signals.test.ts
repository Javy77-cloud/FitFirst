import { describe, expect, it } from "vitest";
import { crmSignalDefaults, shouldCreateStageTask } from "./signals";

describe("CRM action signals", () => {
  it("opens a follow-up task when a lead converts", () => {
    expect(crmSignalDefaults("lead_converted")).toMatchObject({
      createTask: true,
      taskKind: "convert_followup",
      dueInDays: 1,
    });
  });

  it("opens a task when a meeting is scheduled", () => {
    expect(crmSignalDefaults("meeting_scheduled").createTask).toBe(true);
  });

  it("creates a stage task only on quote-sent, review, quotes, or closed-lost", () => {
    expect(shouldCreateStageTask("gather")).toBe(false);
    expect(shouldCreateStageTask("quote_sent")).toBe(true);
    expect(shouldCreateStageTask("closed_lost")).toBe(true);
    expect(shouldCreateStageTask("quotes")).toBe(true);
  });
});
