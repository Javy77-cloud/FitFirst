import { describe, expect, it } from "vitest";
import * as ids from "./ids";
import { PORTAL_DEMO_CARRIER_IDS } from "./ids";

function collectUuids(value: unknown, bag: string[]) {
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    bag.push(value.toLowerCase());
    return;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectUuids(child, bag);
    }
  }
}

describe("fixture ids", () => {
  it("keeps portal demo carrier ids unused elsewhere in the desk book", () => {
    const all: string[] = [];
    collectUuids(ids, all);
    const at = PORTAL_DEMO_CARRIER_IDS.americanTraditions.toLowerCase();
    const pt = PORTAL_DEMO_CARRIER_IDS.peoplesTrust.toLowerCase();
    expect(at).not.toBe(pt);
    const others = all.filter((id) => id !== at && id !== pt);
    expect(others).not.toContain(at);
    expect(others).not.toContain(pt);
  });
});
