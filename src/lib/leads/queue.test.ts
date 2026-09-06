import { describe, expect, it } from "vitest";
import {
  formatElapsedClock,
  toIsoString,
  isConvertedLead,
  isLeadOnQueue,
  isParkedFromDefaultLeadsView,
  isUntouchedLead,
  leadStatusLabel,
  matchesLeadQueueFilters,
  normalizeLeadStatus,
  normalizeLeadTemperature,
  nurtureDueAt,
  responseTimerState,
  searchMatchLabel,
  sortLeadQueue,
  temperatureForStatus,
} from "./queue";

describe("lead queue status", () => {
  it("maps product names onto existing enums and adds warm/cold", () => {
    expect(normalizeLeadStatus("in-progress")).toBe("qualified");
    expect(normalizeLeadStatus("recycled")).toBe("lost");
    expect(normalizeLeadStatus("warm")).toBe("warm");
    expect(normalizeLeadStatus("cold")).toBe("cold");
    expect(leadStatusLabel("qualified")).toBe("in-progress");
    expect(leadStatusLabel("lost")).toBe("Lost");
    expect(leadStatusLabel("nurture")).toBe("Nurture");
    expect(leadStatusLabel("cold")).toBe("Cold (not interested)");
    expect(leadStatusLabel("warm")).toBe("warm");
    expect(normalizeLeadStatus("nurture")).toBe("nurture");
  });

  it("removes converted leads from the work queue", () => {
    expect(isLeadOnQueue({ status: "new" })).toBe(true);
    expect(isLeadOnQueue({ status: "converted" })).toBe(false);
    expect(isConvertedLead({ status: "contacted", convertedDealId: "deal-1" })).toBe(true);
    expect(isLeadOnQueue({ status: "lost" })).toBe(true);
    expect(isParkedFromDefaultLeadsView({ status: "lost" })).toBe(true);
    expect(isParkedFromDefaultLeadsView({ status: "new" })).toBe(false);
    expect(
      isParkedFromDefaultLeadsView({
        status: "nurture",
        nurtureUntil: new Date("2026-12-01T12:00:00Z"),
      }, new Date("2026-09-06T12:00:00Z")),
    ).toBe(true);
    expect(
      isParkedFromDefaultLeadsView({
        status: "nurture",
        nurtureUntil: new Date("2026-09-01T12:00:00Z"),
      }, new Date("2026-09-06T12:00:00Z")),
    ).toBe(false);
    const start = new Date(Date.UTC(2026, 8, 6, 12));
    const inThirtyDays = nurtureDueAt(start, 30, "days");
    expect(inThirtyDays.getUTCFullYear()).toBe(2026);
    expect(inThirtyDays.getUTCMonth()).toBe(9);
    expect(inThirtyDays.getUTCDate()).toBe(6);
    const inTwoMonths = nurtureDueAt(start, 2, "months");
    expect(inTwoMonths.getUTCFullYear()).toBe(2026);
    expect(inTwoMonths.getUTCMonth()).toBe(10);
    expect(inTwoMonths.getUTCDate()).toBe(6);
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
  it("filters status, source, and hot/warm/cold", () => {
    const lead = { status: "qualified", source: "google", temperature: "hot" };
    expect(matchesLeadQueueFilters(lead, { status: "in-progress" })).toBe(true);
    expect(matchesLeadQueueFilters(lead, { source: "referral" })).toBe(false);
    expect(matchesLeadQueueFilters(lead, { temperature: "cold" })).toBe(false);
    expect(matchesLeadQueueFilters(lead, { temperature: "hot", source: "google" })).toBe(true);
    expect(matchesLeadQueueFilters({ ...lead, temperature: "warm" }, { temperature: "warm" })).toBe(true);
  });

  it("defaults brand-new leads to Hot and maps warm/cold statuses", () => {
    expect(normalizeLeadTemperature(null)).toBe("hot");
    expect(normalizeLeadTemperature("warm")).toBe("warm");
    expect(temperatureForStatus("new", null)).toBe("hot");
    expect(temperatureForStatus("warm", "hot")).toBe("warm");
    expect(temperatureForStatus("cold", "hot")).toBe("cold");
  });
});

describe("response timer", () => {
  it("stays idle until first contact, then counts from that stamp", () => {
    const created = new Date("2026-09-06T12:00:00Z");
    const idle = responseTimerState(created, null, new Date("2026-09-06T12:30:00Z"));
    expect(idle.phase).toBe("idle");
    expect(idle.elapsedMs).toBe(0);
    expect(idle.overdue).toBe(false);
    const contact = new Date("2026-09-06T12:30:00Z");
    const fourMin = responseTimerState(created, contact, new Date("2026-09-06T12:34:00Z"));
    expect(fourMin.phase).toBe("counting");
    expect(fourMin.overdue).toBe(false);
    expect(formatElapsedClock(fourMin.elapsedMs)).toBe("4:00");
    const sixMin = responseTimerState(created, contact, new Date("2026-09-06T12:36:00Z"));
    expect(sixMin.overdue).toBe(true);
    expect(toIsoString(contact)).toBe("2026-09-06T12:30:00.000Z");
    expect(toIsoString("2026-09-06T12:30:00.000Z")).toBe("2026-09-06T12:30:00.000Z");
    expect(toIsoString(null)).toBeNull();
    expect(toIsoString("not-a-date")).toBeNull();
  });

  it("labels live search matches", () => {
    expect(searchMatchLabel(0)).toBe("0 matches");
    expect(searchMatchLabel(1)).toBe("1 match");
    expect(searchMatchLabel(3)).toBe("3 matches");
  });
});
