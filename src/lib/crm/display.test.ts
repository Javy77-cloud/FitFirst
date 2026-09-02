import { describe, expect, it } from "vitest";
import {
  daysUntil,
  expirationTone,
  expirationToneClass,
  formatIsoDate,
  formatTenure,
  taskKindLabel,
} from "./display";

describe("CRM display helpers", () => {
  it("formats tenure from the book start date", () => {
    const asOf = new Date("2026-09-02T12:00:00.000Z");
    expect(formatTenure(null, asOf)).toBe("—");
    expect(formatTenure(new Date("2026-09-01T00:00:00.000Z"), asOf)).toBe("New this month");
    expect(formatTenure(new Date("2026-03-02T00:00:00.000Z"), asOf)).toBe("6 mo");
    expect(formatTenure(new Date("2024-09-02T00:00:00.000Z"), asOf)).toBe("2 yr");
    expect(formatTenure(new Date("2023-06-02T00:00:00.000Z"), asOf)).toBe("3 yr 3 mo");
  });

  it("bands expiration using token classes, not hex", () => {
    const from = new Date("2026-09-02T00:00:00.000Z");
    expect(daysUntil(new Date("2026-08-20T00:00:00.000Z"), from)).toBe(-13);
    expect(daysUntil(new Date("2026-09-20T00:00:00.000Z"), from)).toBe(18);
    expect(daysUntil(new Date("2026-11-01T00:00:00.000Z"), from)).toBe(60);
    expect(expirationTone(-1)).toBe("overdue");
    expect(expirationTone(30)).toBe("urgent");
    expect(expirationTone(90)).toBe("soon");
    expect(expirationTone(120)).toBe("ok");
    expect(expirationToneClass("overdue")).toContain("fit-red");
    expect(expirationToneClass("urgent")).toContain("fit-flag");
    expect(expirationToneClass("soon")).toContain("fit-yellow");
    expect(expirationToneClass("ok")).toContain("fit-green");
    expect(expirationToneClass("urgent")).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it("labels review kinds and ISO dates", () => {
    expect(taskKindLabel("30_day")).toBe("30-day");
    expect(taskKindLabel("expiration")).toBe("Expiration");
    expect(formatIsoDate(new Date("2026-09-02T16:00:00.000Z"))).toBe("2026-09-02");
    expect(formatIsoDate(null)).toBe("—");
  });
});
