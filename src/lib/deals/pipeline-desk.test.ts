import { describe, expect, it } from "vitest";
import {
  classifyDealActivityType,
  countTodayDealActivity,
  dealNextActionState,
  filterTodayDealActivity,
  isDealStale,
  nextDealActionAt,
  todayActivityWorkHref,
  uploadDealCta,
  uploadDealCtaLabel,
} from "./pipeline-desk";

const now = new Date("2026-09-07T15:00:00.000Z");

describe("Deals today activity strip", () => {
  const rows = [
    { id: "1", kind: "task", title: "Call back", status: "open", dueAt: new Date("2026-09-07T16:00:00.000Z") },
    { id: "2", kind: "call", title: "Dial", status: "open", dueAt: new Date("2026-09-07T17:00:00.000Z") },
    { id: "3", kind: "email", title: "Send dec", status: "open", dueAt: new Date("2026-09-07T18:00:00.000Z") },
    { id: "4", kind: "meeting", title: "Review", status: "open", startAt: new Date("2026-09-07T19:00:00.000Z") },
    { id: "5", kind: "meeting", title: "HO3 class", status: "open", startAt: new Date("2026-09-07T20:00:00.000Z"), meetingType: "training" },
    { id: "6", kind: "task", title: "Tomorrow", status: "open", dueAt: new Date("2026-09-08T16:00:00.000Z") },
    { id: "7", kind: "call", title: "Done", status: "completed", dueAt: new Date("2026-09-07T12:00:00.000Z") },
  ];

  it("counts open items due today by chip type", () => {
    expect(countTodayDealActivity(rows, now)).toEqual({
      task: 1,
      call: 1,
      email: 1,
      meeting: 1,
      training: 1,
    });
  });

  it("filters the work queue to one type", () => {
    expect(filterTodayDealActivity(rows, "training", now).map((row) => row.id)).toEqual(["5"]);
    expect(todayActivityWorkHref("call")).toBe("/deals?queue=call");
  });

  it("classifies training from meetingType, not as a meeting", () => {
    expect(classifyDealActivityType({ kind: "meeting", meetingType: "training" })).toBe("training");
    expect(classifyDealActivityType({ kind: "meeting", meetingType: "video" })).toBe("meeting");
  });
});

describe("next-action timer + stale flag", () => {
  it("uses the earliest open follow-up and turns overdue at zero", () => {
    const due = nextDealActionAt({
      activities: [
        { id: "a", kind: "task", title: "Later", status: "open", dueAt: new Date("2026-09-07T18:00:00.000Z") },
        { id: "b", kind: "call", title: "Soon", status: "open", dueAt: new Date("2026-09-07T16:00:00.000Z") },
      ],
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(due?.toISOString()).toBe("2026-09-07T16:00:00.000Z");
    const live = dealNextActionState(due, new Date("2026-09-07T15:00:00.000Z"));
    expect(live.overdue).toBe(false);
    expect(live.label).toBe("1:00:00");
    const late = dealNextActionState(due, new Date("2026-09-07T16:00:01.000Z"));
    expect(late.overdue).toBe(true);
    expect(late.label).toBe("0:00");
  });

  it("flags a deal stale after the untouched threshold and skips bound shops", () => {
    expect(
      isDealStale({
        updatedAt: new Date("2026-08-20T00:00:00.000Z"),
        pipelineStage: "shopping",
        now,
      }),
    ).toBe(true);
    expect(
      isDealStale({
        updatedAt: new Date("2026-08-20T00:00:00.000Z"),
        pipelineStage: "bound",
        boundAt: new Date("2026-08-21T00:00:00.000Z"),
        now,
      }),
    ).toBe(false);
    expect(
      isDealStale({
        updatedAt: new Date("2026-09-06T00:00:00.000Z"),
        pipelineStage: "quoting",
        now,
      }),
    ).toBe(false);
  });
});

describe("upload Select this deal vs Create deal", () => {
  const deals = [
    { id: "d-gonzalez", title: "Gonzalez · HO3 shop", partyName: "Gonzalez, Maria" },
    { id: "d-ruiz", title: "Ruiz · Melbourne HO3", partyName: "Ruiz, Elena" },
  ];

  it("selects an existing Gonzalez instead of offering Create deal", () => {
    const cta = uploadDealCta(deals, "Gonzalez");
    expect(cta.kind).toBe("select");
    expect(cta.match?.id).toBe("d-gonzalez");
    expect(uploadDealCtaLabel(cta.kind)).toBe("Select this deal");
  });

  it("offers Create deal only when search has no match", () => {
    const cta = uploadDealCta(deals, "Brandnew Prospect");
    expect(cta.kind).toBe("create");
    expect(cta.match).toBeNull();
    expect(uploadDealCtaLabel(cta.kind)).toBe("Create deal");
  });
});
