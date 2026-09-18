import { describe, expect, it } from "vitest";
import { formatDisplayDate } from "./display-format";
import { formatDob, formatDay } from "@/lib/domain";

describe("formatDisplayDate / formatDob", () => {
  it("formats ISO calendar dates as M-D-Y; DOB is MM/DD/YYYY", () => {
    expect(formatDisplayDate("1990-05-15")).toBe("5-15-1990");
    expect(formatDob("1990-05-15")).toBe("05/15/1990");
    expect(formatDay("1990-05-15")).toBe("5-15-1990");
  });

  it("formats UTC midnight Date without TZ day-shift", () => {
    expect(formatDisplayDate(new Date("1990-05-15T00:00:00.000Z"))).toBe("5-15-1990");
  });
});
