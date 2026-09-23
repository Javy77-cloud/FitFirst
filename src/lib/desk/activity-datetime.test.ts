import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("desk activity datetime + call title", () => {
  it("activities-desk parses form times via parseDeskDateTimeLocal", () => {
    const src = readFileSync("src/app/actions/activities-desk.ts", "utf8");
    expect(src).toMatch(/parseDeskDateTimeLocal/);
    expect(src).toMatch(/resolveCallTitle/);
    expect(src).not.toMatch(/const d = new Date\(raw\)/);
  });

  it("Quick Comms schedule title rejects phone autofill", () => {
    const src = readFileSync("src/components/comms/quick-comms-board.tsx", "utf8");
    expect(src).toMatch(/titleIsPhone/);
    expect(src).toMatch(/autoComplete="off"/);
  });

  it("Google push never uses bare phone as summary", () => {
    const src = readFileSync("src/lib/integrations/calendar-event-sync.ts", "utf8");
    expect(src).toMatch(/titleIsPhone/);
    expect(src).toMatch(/never a bare phone/i);
  });
});
