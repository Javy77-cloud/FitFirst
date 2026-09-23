import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DATE_ONLY_TASK_DUE_TIME,
  formatTaskDueAt,
  parseDeskDateTimeLocal,
  parseTaskDueAt,
  TASK_DUE_TIMEZONE,
  taskDueFromForm,
  taskDueInputParts,
  taskReminderFireAt,
} from "./due-at";

describe("parseTaskDueAt", () => {
  it("saves tomorrow 7:00 PM America/New_York as that instant", () => {
    const due = parseTaskDueAt("2026-09-16", "19:00");
    expect(due?.toISOString()).toBe("2026-09-16T23:00:00.000Z");
    expect(TASK_DUE_TIMEZONE).toBe("America/New_York");
  });

  it("uses Eastern standard time in winter", () => {
    expect(parseTaskDueAt("2026-01-16", "19:00")?.toISOString()).toBe(
      "2026-01-17T00:00:00.000Z",
    );
  });

  it("defaults date-only (legacy / blank time) to 23:59 Eastern", () => {
    expect(DATE_ONLY_TASK_DUE_TIME).toBe("23:59");
    expect(parseTaskDueAt("2026-09-16", "")?.toISOString()).toBe("2026-09-17T03:59:00.000Z");
    expect(parseTaskDueAt("2026-09-16")?.toISOString()).toBe("2026-09-17T03:59:00.000Z");
  });

  it("returns null for a missing or invalid date", () => {
    expect(parseTaskDueAt("")).toBeNull();
    expect(parseTaskDueAt("09/16/2026", "19:00")).toBeNull();
    expect(parseTaskDueAt("2026-09-16", "7pm")).toBeNull();
  });

  it("reads dueDate + dueTime from form data", () => {
    const form = new FormData();
    form.set("dueDate", "2026-09-16");
    form.set("dueTime", "19:00");
    expect(taskDueFromForm(form).toISOString()).toBe("2026-09-16T23:00:00.000Z");
  });
});

describe("formatTaskDueAt / taskDueInputParts", () => {
  it("displays the stored datetime in America/New_York", () => {
    expect(formatTaskDueAt(new Date("2026-09-16T23:00:00.000Z"))).toBe("9-16-2026 7:00 PM");
    expect(formatTaskDueAt(null)).toBe("—");
  });

  it("round-trips date and time for edit fields", () => {
    expect(taskDueInputParts(new Date("2026-09-16T23:00:00.000Z"))).toEqual({
      date: "2026-09-16",
      time: "19:00",
    });
    expect(taskDueInputParts(new Date("2026-09-17T03:59:00.000Z"))).toEqual({
      date: "2026-09-16",
      time: "23:59",
    });
  });

  it("schedules reminders at the due instant, not start-of-day", () => {
    const due = new Date("2026-09-16T23:00:00.000Z");
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(taskReminderFireAt(due, now).toISOString()).toBe("2026-09-16T23:00:00.000Z");
    expect(taskReminderFireAt(due, new Date("2026-09-17T00:00:00.000Z")).getTime()).toBe(
      new Date("2026-09-17T00:00:00.000Z").getTime(),
    );
  });

  it("keeps existing 16:00 UTC date-only rows displayable", () => {
    const legacy = new Date("2026-09-10T16:00:00.000Z");
    expect(formatTaskDueAt(legacy)).toBe("9-10-2026 12:00 PM");
    expect(taskDueInputParts(legacy)).toEqual({ date: "2026-09-10", time: "12:00" });
  });
});

describe("due time wired on create/edit and lists", () => {
  it("Create Task form posts dueTime next to dueDate", () => {
    const src = readFileSync("src/components/tasks/create-task-form.tsx", "utf8");
    expect(src).toMatch(/name="dueDate"/);
    expect(src).toMatch(/name="dueTime"/);
    expect(src).toMatch(/type="time"/);
    expect(src).toMatch(/Due time/);
  });

  it("task list and cards format the due datetime", () => {
    const list = readFileSync("src/components/notifications/commitments-timeline.tsx", "utf8");
    expect(list).toMatch(/formatTaskDueAt\(row\.dueAt\)/);
    const board = readFileSync("src/components/comms/quick-comms-board.tsx", "utf8");
    expect(board).toMatch(/formatTaskDueAt\(item\.dueAt\)/);
    const detail = readFileSync("src/components/record-context/activity-record-page.tsx", "utf8");
    expect(detail).toMatch(/formatTaskDueAt\(task\.dueDate\)/);
    expect(detail).toMatch(/name="dueTime"/);
  });
});


describe("parseDeskDateTimeLocal", () => {
  it("treats datetime-local as America/New_York, not UTC", () => {
    // 7:00 AM Eastern on Sep 24 2026 (EDT = UTC-4) → 11:00Z
    expect(parseDeskDateTimeLocal("2026-09-24T07:00")?.toISOString()).toBe(
      "2026-09-24T11:00:00.000Z",
    );
    expect(parseDeskDateTimeLocal("2026-09-24T17:25")?.toISOString()).toBe(
      "2026-09-24T21:25:00.000Z",
    );
  });

  it("keeps absolute ISO instants", () => {
    expect(parseDeskDateTimeLocal("2026-09-24T11:00:00.000Z")?.toISOString()).toBe(
      "2026-09-24T11:00:00.000Z",
    );
  });

  it("returns null for empty input", () => {
    expect(parseDeskDateTimeLocal("")).toBeNull();
    expect(parseDeskDateTimeLocal(null)).toBeNull();
  });
});
