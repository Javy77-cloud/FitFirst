import { describe, expect, it } from "vitest";
import {
  activitiesOnDay,
  activityOnDay,
  isActivityKind,
  kindClass,
  monthCells,
  parseDateParam,
  parseTags,
  startOfWeek,
  toDateParam,
  weekDays,
} from "./calendar";

const task = {
  id: "t1",
  kind: "task",
  title: "Call Ana about HO3",
  status: "open",
  dueAt: new Date(2026, 8, 2, 9, 0),
  startAt: null,
  endAt: null,
  assignee: "Broker",
  contactId: "c1",
  dealId: "d1",
  policyId: null,
  notes: null,
};

const meeting = {
  id: "m1",
  kind: "meeting",
  title: "Market review",
  status: "open",
  dueAt: null,
  startAt: new Date(2026, 8, 2, 14, 0),
  endAt: new Date(2026, 8, 2, 15, 0),
  assignee: "Broker",
  contactId: "c1",
  dealId: "d1",
  policyId: null,
  notes: null,
};

describe("calendar helpers", () => {
  it("builds a 6x7 month grid starting Sunday", () => {
    const cells = monthCells(new Date(2026, 8, 2));
    expect(cells).toHaveLength(42);
    expect(cells[0].date.getDay()).toBe(0);
    expect(cells.filter((c) => c.inMonth).length).toBe(30);
  });

  it("places tasks and meetings on the same day", () => {
    const day = new Date(2026, 8, 2);
    const onDay = activitiesOnDay([task, meeting], day);
    expect(onDay.map((a) => a.kind)).toEqual(["task", "meeting"]);
    expect(activityOnDay(task, new Date(2026, 8, 3))).toBe(false);
  });

  it("maps kinds to --ff-* calendar classes", () => {
    expect(kindClass("task")).toBe("ff-cal-task");
    expect(kindClass("meeting")).toBe("ff-cal-meeting");
    expect(kindClass("call")).toBe("ff-cal-call");
    expect(isActivityKind("task")).toBe(true);
    expect(isActivityKind("quote")).toBe(false);
  });

  it("parses date params and week days", () => {
    const d = parseDateParam("2026-09-02");
    expect(toDateParam(d)).toBe("2026-09-02");
    const week = weekDays(d);
    expect(week).toHaveLength(7);
    expect(startOfWeek(d).getDay()).toBe(0);
    expect(parseTags("HO3, Renewal-Watch ;  ")).toEqual(["ho3", "renewal-watch"]);
  });
});
