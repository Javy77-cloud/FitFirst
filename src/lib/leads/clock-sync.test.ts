import { describe, expect, it } from "vitest";
import { publishLeadClock, subscribeLeadClock } from "./clock-sync";

describe("lead clock sync", () => {
  it("publishes a contacted dueAt to listeners", () => {
    const seen: string[] = [];
    const stop = subscribeLeadClock((patch) => {
      seen.push(`${patch.leadId}:${patch.dueAt}:${patch.followUpName ?? ""}`);
    });
    publishLeadClock({
      leadId: "lead-1",
      dueAt: "2026-09-06T12:05:00.000Z",
      followUpName: "Default",
    });
    stop();
    publishLeadClock({ leadId: "lead-1", dueAt: null, followUpName: "" });
    expect(seen).toEqual(["lead-1:2026-09-06T12:05:00.000Z:Default"]);
  });
});
