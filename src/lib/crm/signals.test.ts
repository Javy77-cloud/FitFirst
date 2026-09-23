import { describe, expect, it } from "vitest";
import { createsUserFacingAlert, crmSignalDefaults, shouldCreateStageTask } from "./signals";

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

  it("logs a sent outbound without opening a follow-up task", () => {
    expect(crmSignalDefaults("comms_sent")).toMatchObject({
      createTask: false,
      taskKind: "comms_sent",
    });
  });

  it("does not create a user-facing alert for own outbound send or queue", () => {
    expect(createsUserFacingAlert("comms_sent")).toBe(false);
    expect(createsUserFacingAlert("comms_queued")).toBe(false);
    expect(createsUserFacingAlert("comms_held")).toBe(true);
    expect(createsUserFacingAlert("meeting_scheduled")).toBe(true);
  });

  it("never auto-creates a task on stage moves, including quote sent / review", () => {
    expect(crmSignalDefaults("stage_moved").createTask).toBe(false);
    expect(shouldCreateStageTask("gather")).toBe(false);
    expect(shouldCreateStageTask("markets")).toBe(false);
    expect(shouldCreateStageTask("quotes")).toBe(false);
    expect(shouldCreateStageTask("quote_sent")).toBe(false);
    expect(shouldCreateStageTask("closed_lost")).toBe(false);
    expect(shouldCreateStageTask("quote_review")).toBe(false);
    expect(shouldCreateStageTask("review")).toBe(false);
    expect(shouldCreateStageTask("policy_issued")).toBe(false);
    expect(shouldCreateStageTask("policy_created")).toBe(false);
  });
});
