import { describe, expect, it } from "vitest";
import { SETTINGS_NAV, SETTINGS_NAV_IDS, settingsGroupFor } from "./nav";

describe("settings nav", () => {
  it("nests Social under Integrations", () => {
    const integrations = SETTINGS_NAV.find((group) => group.id === "integrations");
    expect(integrations?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["integrations", "social"]),
    );
    expect(settingsGroupFor("social")).toBe("integrations");
  });

  it("keeps People/Agents and Account recovery as distinct ids", () => {
    expect(new Set(SETTINGS_NAV_IDS).size).toBe(SETTINGS_NAV_IDS.length);
    expect(settingsGroupFor("agents")).toBe("people");
    expect(settingsGroupFor("profile")).toBe("account");
    expect(settingsGroupFor("security")).toBe("account");
    expect(settingsGroupFor("recovery")).toBe("account");
  });

  it("nests Export under Brand / Agency", () => {
    expect(settingsGroupFor("export")).toBe("agency");
    const agency = SETTINGS_NAV.find((group) => group.id === "agency");
    expect(agency?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["agency", "offices", "territories", "export"]),
    );
  });
});
