import { describe, expect, it } from "vitest";
import {
  assignmentLabel,
  callDurationLabel,
  isDueCall,
  normalizeActivityStatus,
  pipelineColumn,
} from "./activity";

describe("activity model helpers", () => {
  it("maps legacy open/cancelled onto the task pipeline", () => {
    expect(normalizeActivityStatus("open")).toBe("incomplete");
    expect(normalizeActivityStatus("cancelled")).toBe("incomplete");
    expect(pipelineColumn("delayed")).toBe("delayed");
    expect(pipelineColumn("moved")).toBe("moved");
  });

  it("assigns to contact and policy together", () => {
    expect(
      assignmentLabel({ contactName: "Dib, Ana", policyNumber: "HO-1001" }),
    ).toBe("Contact Dib, Ana · Policy HO-1001");
  });

  it("flags due calls and formats duration", () => {
    expect(
      isDueCall({
        kind: "call",
        status: "incomplete",
        dueAt: new Date("2026-09-02T16:00:00.000Z"),
        startAt: null,
        now: new Date("2026-09-02T16:05:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isDueCall({
        kind: "task",
        status: "incomplete",
        dueAt: new Date("2026-09-02T16:00:00.000Z"),
        startAt: null,
        now: new Date("2026-09-02T16:05:00.000Z"),
      }),
    ).toBe(false);
    expect(callDurationLabel(185)).toBe("3m 5s");
  });
});
