import { describe, expect, it, vi } from "vitest";
import { DeadlineError, isDeadlineError, withDeadline } from "./deadline";

describe("withDeadline", () => {
  it("resolves when the work finishes before the wall", async () => {
    await expect(withDeadline(Promise.resolve("ok"), 200, "late")).resolves.toBe("ok");
  });

  it("rejects with DeadlineError when the wall fires first", async () => {
    vi.useFakeTimers();
    const pending = withDeadline(
      new Promise<string>(() => undefined),
      50,
      "Docs timed out",
    );
    const assertion = expect(pending).rejects.toMatchObject({
      name: "DeadlineError",
      message: "Docs timed out",
      timedOut: true,
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    vi.useRealTimers();
  });

  it("isDeadlineError detects the marker", () => {
    expect(isDeadlineError(new DeadlineError("x"))).toBe(true);
    expect(isDeadlineError(new Error("x"))).toBe(false);
  });
});
