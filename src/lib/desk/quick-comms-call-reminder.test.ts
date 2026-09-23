import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertCommsRecord, hasCommsRecord } from "@/lib/lifecycle/activity";
import { isLoggedCallPulseCandidate } from "@/lib/health/reviews";
import { parseDeskDateTimeLocal } from "@/lib/tasks/due-at";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Quick Comms Schedule call reminder", () => {
  it("allows deal-only related for call/email/sms (not assertRelatedRecord)", () => {
    expect(hasCommsRecord({ dealId: "d1" })).toBe(true);
    expect(assertCommsRecord({ dealId: "d1" }).dealId).toBe("d1");
    const desk = source("src/app/actions/activities-desk.ts");
    expect(desk).toMatch(/assertCommsRecord/);
    expect(desk).toMatch(/kind === "call" \|\| kind === "email" \|\| kind === "sms"/);
    // Must not throw to the client — prod wraps throws as React #441 white screen.
    expect(desk).toMatch(/Never throw to the client form action/);
    expect(desk).toMatch(/return \{ error:/);
  });

  it("Quick Comms surfaces logDeskActivity errors instead of white-screening", () => {
    const board = source("src/components/comms/quick-comms-board.tsx");
    expect(board).toMatch(/setFormError/);
    expect(board).toMatch(/data-ff-quick-comms-error/);
    expect(board).toMatch(/"error" in result && result\.error/);
    expect(board).toMatch(/Minified React error #441/);
    expect(board).toMatch(/Pick date and time to schedule the call reminder/);
    expect(board).toMatch(/callMode === "schedule"/);
  });

  it("keeps Schedule reminder off after-call Pulse (#335)", () => {
    expect(isLoggedCallPulseCandidate({ kind: "call", status: "open" })).toBe(false);
    expect(isLoggedCallPulseCandidate({ kind: "call", status: "completed" })).toBe(true);
  });

  it("parses Quick Comms combineLocal wall clock as Eastern", () => {
    const d = parseDeskDateTimeLocal("2026-09-24T12:30");
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe("2026-09-24T16:30:00.000Z");
  });

  it("defaults dueAt for scheduled calls so they land on Calendar", () => {
    const desk = source("src/app/actions/activities-desk.ts");
    expect(desk).toMatch(
      /kind === "task" \|\| kind === "email" \|\| kind === "sms" \|\| kind === "call"/,
    );
  });
});
