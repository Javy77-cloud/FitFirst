import { describe, expect, it } from "vitest";
import { toastForFillCounts } from "./fill-toast";

describe("toastForFillCounts", () => {
  it("says filled vs skipped already on sheet", () => {
    expect(toastForFillCounts({ filledCount: 8, skippedCount: 9 })).toBe(
      "Filled 8, skipped 9 already on sheet",
    );
  });

  it("does not make a skip-heavy run feel like nothing", () => {
    expect(toastForFillCounts({ filledCount: 0, skippedCount: 12 })).toBe(
      "Filled 0, skipped 12 already on sheet",
    );
  });

  it("handles empty parse", () => {
    expect(toastForFillCounts({ filledCount: 0, skippedCount: 0 })).toBe(
      "Parsed source. No fields to fill.",
    );
  });

  it("stays within flash 80-char cap for large counts", () => {
    const msg = toastForFillCounts({ filledCount: 99, skippedCount: 120 });
    expect(msg.length).toBeLessThanOrEqual(80);
  });
});
