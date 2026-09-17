import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESK_AS_OF, deskNow } from "./as-of";

function source(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("desk clock", () => {
  it("keeps DESK_AS_OF as a seed fixture and exposes a live clock", () => {
    expect(DESK_AS_OF.toISOString()).toBe("2026-09-03T16:00:00.000Z");
    const before = Date.now();
    const now = deskNow().getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it("loads live desk/admin KPIs from deskNow, not the seed week", () => {
    expect(source("src/lib/deals/motivation-data.ts")).toMatch(/deskNow\(\)/);
    expect(source("src/lib/deals/motivation-data.ts")).not.toMatch(/DESK_AS_OF/);
    expect(source("src/lib/leads/motivation-data.ts")).toMatch(/deskNow\(\)/);
    expect(source("src/lib/db/queries.ts")).toMatch(/asOf: deskNow\(\)/);
    expect(source("src/app/calendar/page.tsx")).toMatch(/deskNow\(\)/);
    expect(source("src/components/deal/deal-motivation.tsx")).not.toMatch(/%/);
    expect(source("src/components/deal/deal-motivation.tsx")).toMatch(/quotes pulled today/);
    expect(source("src/lib/social/pulse.ts")).not.toMatch(/SOCIAL_PULSE_SEEDS/);
  });
});
