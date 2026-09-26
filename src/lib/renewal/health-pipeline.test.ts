import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HEALTH_PIPELINE_STATUS_LABELS,
  HEALTH_PIPELINE_STATUSES,
  appendHealthPipelineNote,
  healthPipelineStatusAfterTaskComplete,
  isHealthPipelineStatus,
} from "./health-pipeline";

describe("health pipeline", () => {
  it("lists the eight manual statuses", () => {
    expect(HEALTH_PIPELINE_STATUSES).toEqual([
      "identified",
      "contacted",
      "quotes_pulled",
      "proposal_shared",
      "decision_pending",
      "submitted",
      "bound",
      "dropped",
    ]);
    expect(HEALTH_PIPELINE_STATUS_LABELS.quotes_pulled).toBe("Quotes pulled (external)");
    expect(HEALTH_PIPELINE_STATUS_LABELS.dropped).toMatch(/client staying with current/i);
    expect(isHealthPipelineStatus("submitted")).toBe(true);
    expect(isHealthPipelineStatus("quoted")).toBe(false);
  });

  it("appends a free-text or voice note without dropping earlier notes", () => {
    const first = appendHealthPipelineNote([], {
      id: "n1",
      status: "contacted",
      body: "OE notice sent",
      lang: "en",
      channel: "text",
      actorId: "agent",
      at: "2026-09-01T00:00:00.000Z",
    });
    const second = appendHealthPipelineNote(first, {
      id: "n2",
      status: "quotes_pulled",
      body: "Cotización lista",
      lang: "es",
      channel: "voice",
      actorId: "agent",
      at: "2026-09-02T00:00:00.000Z",
    });
    expect(second).toHaveLength(2);
    expect(second[1]?.channel).toBe("voice");
    expect(second[1]?.lang).toBe("es");
  });

  it("does not advance the pipeline when a task is completed", () => {
    expect(healthPipelineStatusAfterTaskComplete("proposal_shared")).toBe("proposal_shared");
    expect(healthPipelineStatusAfterTaskComplete(null)).toBeNull();
    expect(healthPipelineStatusAfterTaskComplete("quoted")).toBeNull();

    const source = readFileSync("src/app/actions/alerts.ts", "utf8");
    const start = source.indexOf("export async function completeTask");
    const end = source.indexOf("export async function createDeskTask");
    const complete = source.slice(start, end);
    expect(complete).toMatch(/healthPipelineStatusAfterTaskComplete/);
    expect(complete).not.toMatch(/setHealthPipelineStatus|health_pipeline_status/);
  });
});
