import { describe, expect, it, vi } from "vitest";
import { logPulseSaveFailure, pulseSaveLogContext } from "./pulse-save-log";

describe("pulse save log", () => {
  it("keeps Postgres code and omits raw party ids", () => {
    const ctx = pulseSaveLogContext({
      stage: "insert-without-optional-fks",
      error: {
        code: "23503",
        message: "insert or update on table experience_reviews violates foreign key",
        detail: "Key (reviewer_user_id)=(...) is not present",
        constraint: "experience_reviews_reviewer_user_id_users_id_fk",
      },
      moment: "logged_call",
      promptId: "next_step",
      skipped: true,
      hasActivity: true,
    });
    expect(ctx.stage).toBe("insert-without-optional-fks");
    expect(ctx.code).toBe("23503");
    expect(ctx.constraint).toMatch(/reviewer_user_id/);
    expect(JSON.stringify(ctx)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("prints a single greppable server line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logPulseSaveFailure({
      stage: "ensure-table",
      error: new Error("permission denied for schema public"),
      moment: "bind",
    });
    expect(spy).toHaveBeenCalledWith(
      "[pulse] could not save experience review",
      expect.objectContaining({ stage: "ensure-table", message: expect.stringMatching(/permission denied/) }),
    );
    spy.mockRestore();
  });
});
