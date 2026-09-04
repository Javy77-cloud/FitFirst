import { describe, expect, it } from "vitest";
import { PORTAL_DEMO_CARRIER_IDS } from "../fixtures/ids";
import { PORTAL_DEMO_SEEDS } from "./seed-carrier-portals";

describe("portal demo seeds", () => {
  it("uses unused American Traditions / People's Trust ids and fake logins", () => {
    expect(PORTAL_DEMO_SEEDS).toHaveLength(2);
    expect(PORTAL_DEMO_SEEDS.map((row) => row.id).sort()).toEqual(
      [PORTAL_DEMO_CARRIER_IDS.americanTraditions, PORTAL_DEMO_CARRIER_IDS.peoplesTrust].sort(),
    );
    expect(PORTAL_DEMO_SEEDS.some((row) => row.name === "American Traditions")).toBe(true);
    expect(PORTAL_DEMO_SEEDS.some((row) => row.name === "People's Trust")).toBe(true);
    for (const row of PORTAL_DEMO_SEEDS) {
      expect(row.username.startsWith("fitfirst.")).toBe(true);
      expect(row.password.includes("demo")).toBe(true);
      expect(row.agencyCode.startsWith("FF-")).toBe(true);
      expect(row.portalUrl.startsWith("https://")).toBe(true);
    }
  });
});
