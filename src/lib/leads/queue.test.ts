import { describe, expect, it } from "vitest";
import {
  formatElapsedClock,
  isConvertedLead,
  isLeadOnQueue,
  isUntouchedLead,
  leadStatusLabel,
  matchesLeadQueueFilters,
  normalizeLeadStatus,
  responseTimerState,
  searchMatchLabel,
  sortLeadQueue,
} from "./queue";

describe("lead queue status", () => {
  it("maps product names onto existing enums", () => {
    expect(normalizeLeadStatus("in-progress")).toBe("qualified");
    expect(normalizeLeadStatus("recycled")).toBe("lost");
    expect(leadStatusLabel("qualified")).toBe("in-progress");
    expect(leadStatusLabel("lost")).toBe("recycled");
  });

  it("removes converted leads from the work queue", () => {
    expect(isLeadOnQueue({ status: "new" })).toBe(true);
    expect(isLeadOnQueue({ status: "converted" })).toBe(false);
    expect(isConvertedLead({ status: "contacted", convertedDealId: "deal-1" })).toBe(true);
    expect(isLeadOnQueue({ status: "lost" })).toBe(true);
  });
});

describe("lead queue sort", () => {
  it("puts untouched new leads first, then newest arrival", () => {
    const olderNew = {
      id: "a",
      status: "new",
      firstContactAt: null,
      createdAt: new Date("2026-09-01T10:00:00Z"),
    };
    const newerNew = {
      id: "b",
      status: "new",
      firstContactAt: null,
      createdAt: new Date("2026-09-06T10:00:00Z"),
    };
    const touched = {
      id: "c",
      status: "contacted",
      firstContactAt: new Date("2026-09-06T11:00:00Z"),
      createdAt: new Date("2026-09-06T12:00:00Z"),
    };
    expect(sortLeadQueue([touched, olderNew, newerNew]).map((row) => row.id)).toEqual(["b", "a", "c"]);
    expect(isUntouchedLead(olderNew)).toBe(true);
    expect(isUntouchedLead(touched)).toBe(false);
  });
});

describe("lead queue filters", () => {
  it("filters status, source, and hot/cold", () => {
    const lead = { status: "qualified", source: "google", temperature: "hot" };
    expect(matchesLeadQueueFilters(lead, { status: "in-progress" })).toBe(true);
    expect(matchesLeadQueueFilters(lead, { source: "referral" })).toBe(false);
    expect(matchesLeadQueueFilters(lead, { temperature: "cold" })).toBe(false);
    expect(matchesLeadQueueFilters(lead, { temperature: "hot", source: "google" })).toBe(true);
  });
});

describe("response timer", () => {
  it("turns overdue after five minutes without contact and clears after a log", () => {
    const created = new Date("2026-09-06T12:00:00Z");
    const fourMin = responseTimerState(created, null, new Date("2026-09-06T12:04:00Z"));
    expect(fourMin.overdue).toBe(false);
    expect(formatElapsedClock(fourMin.elapsedMs)).toBe("4:00");
    const sixMin = responseTimerState(created, null, new Date("2026-09-06T12:06:00Z"));
    expect(sixMin.overdue).toBe(true);
    const cleared = responseTimerState(created, new Date("2026-09-06T12:02:00Z"), new Date("2026-09-06T12:20:00Z"));
    expect(cleared.phase).toBe("cleared");
    expect(cleared.overdue).toBe(false);
  });

  it("labels live search matches", () => {
    expect(searchMatchLabel(0)).toBe("0 matches");
    expect(searchMatchLabel(1)).toBe("1 match");
    expect(searchMatchLabel(3)).toBe("3 matches");
  });
});
