import { describe, expect, it } from "vitest";
import {
  activitiesOnDay,
  activitiesOnView,
  activityOnDay,
  CALENDAR_ADMIN_ADD,
  CALENDAR_TOOLBAR_ROWS,
  filterCalendarActivities,
  showsOnDeskCalendar,
  formatCalendarTitle,
  formatWhen,
  isActivityKind,
  kindClass,
  monthCells,
  parseCalendarView,
  parseDateParam,
  parseKindsParam,
  parseTags,
  rangeForView,
  rescheduleWindow,
  shiftCalendarAnchor,
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
  it("locks Javy’s calendar toolbar rows (views + Add event menu)", () => {
    expect(CALENDAR_TOOLBAR_ROWS).toEqual([
      ["Month", "Week", "Day"],
      ["Add Event", "Task", "Meeting", "Call", "Email", "SMS"],
    ]);
    expect(CALENDAR_ADMIN_ADD).toEqual(["Add Company Meeting", "Add Training"]);
  });

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

  it("scopes On this view to day or week and hides month", () => {
    const other = {
      ...task,
      id: "t2",
      dueAt: new Date(2026, 8, 8, 10, 0),
      title: "Next week task",
    };
    const anchor = new Date(2026, 8, 2);
    expect(activitiesOnView([task, meeting, other], "month", anchor)).toEqual([]);
    expect(activitiesOnView([task, meeting, other], "day", anchor).map((r) => r.id)).toEqual([
      "t1",
      "m1",
    ]);
    const weekIds = activitiesOnView([task, meeting, other], "week", anchor).map((r) => r.id);
    expect(weekIds).toEqual(["t1", "m1"]);
    expect(weekIds).not.toContain("t2");
  });

  it("maps kinds to --ff-* calendar classes and shares Call / SMS / Email with CONTACT_ACTION_COLORS", () => {
    expect(kindClass("task")).toBe("ff-cal-task");
    expect(kindClass("meeting")).toBe("ff-cal-meeting");
    expect(kindClass("meeting", "company")).toBe("ff-cal-company");
    expect(kindClass("meeting", "training")).toBe("ff-cal-training");
    expect(kindClass("call")).toBe("ff-cal-call");
    expect(kindClass("sms")).toBe("ff-cal-sms");
    expect(kindClass("email")).toBe("ff-cal-email");
    expect(isActivityKind("sms")).toBe(true);
    expect(isActivityKind("email")).toBe(true);
    expect(isActivityKind("quote")).toBe(false);
  });

  it("formats sms and email as due items like tasks", () => {
    const sms = { ...task, id: "s1", kind: "sms", title: "Text Ana" };
    const email = { ...task, id: "e1", kind: "email", title: "Email Ana" };
    expect(formatWhen(sms)).toMatch(/^Due /);
    expect(formatWhen(email)).toMatch(/^Due /);
  });

  it("filters by kind and assignee", () => {
    const rows = filterCalendarActivities([task, meeting], { kinds: ["meeting"] });
    expect(rows.map((r) => r.id)).toEqual(["m1"]);
    expect(parseKindsParam("task,call,quote")).toEqual(["task", "call"]);
  });


  it("excludes completed email/sms/call from calendar surface; keeps open schedule + meetings", () => {
    const doneEmail = {
      ...task,
      id: "e-done",
      kind: "email",
      title: "Email sent · Heather",
      status: "completed",
      startAt: new Date(2026, 8, 23, 10, 0),
      dueAt: null,
    };
    const openEmail = {
      ...task,
      id: "e-open",
      kind: "email",
      title: "Follow up email",
      status: "open",
      dueAt: new Date(2026, 8, 24, 9, 0),
      startAt: null,
    };
    const doneCall = { ...task, id: "c-done", kind: "call", status: "completed", title: "Call logged" };
    const doneMeeting = {
      ...meeting,
      id: "m-done",
      status: "completed",
      title: "Past meeting",
    };
    expect(showsOnDeskCalendar(doneEmail)).toBe(false);
    expect(showsOnDeskCalendar(doneCall)).toBe(false);
    expect(showsOnDeskCalendar(openEmail)).toBe(true);
    expect(showsOnDeskCalendar(doneMeeting)).toBe(true);
    const rows = filterCalendarActivities([doneEmail, openEmail, doneCall, doneMeeting, task]);
    expect(rows.map((r) => r.id).sort()).toEqual(["e-open", "m-done", "t1"].sort());
  });

  it("preserves duration when dropped on a new slot", () => {
    const next = rescheduleWindow(meeting, new Date(2026, 8, 4, 9, 0));
    expect(next.startAt.getHours()).toBe(9);
    expect(next.endAt.getHours()).toBe(10);
    expect(toDateParam(next.startAt)).toBe("2026-09-04");
  });

  it("builds month and week ranges from the Sunday grid", () => {
    const week = rangeForView("week", new Date(2026, 8, 3));
    expect(week.from.getDay()).toBe(0);
    expect(week.to.getDay()).toBe(6);
    const month = rangeForView("month", new Date(2026, 8, 3));
    expect(month.from.getDay()).toBe(0);
  });

  it("defaults an unknown view to month", () => {
    expect(parseCalendarView("week")).toBe("week");
    expect(parseCalendarView("nope")).toBe("month");
  });

    it("parses date params and week days", () => {
    const d = parseDateParam("2026-09-02");
    expect(toDateParam(d)).toBe("2026-09-02");
    const week = weekDays(d);
    expect(week).toHaveLength(7);
    expect(startOfWeek(d).getDay()).toBe(0);
    expect(parseTags("HO3, Renewal-Watch ;  ")).toEqual(["ho3", "renewal-watch"]);
  });

  it("formats center toolbar titles for month week and day", () => {
    const day = new Date(2026, 8, 13); // Sunday Sep 13 2026
    expect(formatCalendarTitle("month", day)).toBe("September 2026");
    expect(formatCalendarTitle("day", day)).toMatch(/Sunday.*September.*13.*2026/);
    expect(formatCalendarTitle("week", day)).toMatch(/Sep/);
  });

  it("shifts anchor by month week or day", () => {
    const day = new Date(2026, 8, 13);
    expect(toDateParam(shiftCalendarAnchor("day", day, 1))).toBe("2026-09-14");
    expect(toDateParam(shiftCalendarAnchor("week", day, -1))).toBe("2026-09-06");
    expect(toDateParam(shiftCalendarAnchor("month", day, 1))).toBe("2026-10-13");
  });
});
