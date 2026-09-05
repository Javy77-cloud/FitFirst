import { describe, expect, it } from "vitest";
import { SETTINGS_NAV, SETTINGS_NAV_IDS, settingsGroupFor } from "./nav";

describe("settings nav", () => {
  it("nests Social and Developer Hub under Integrations", () => {
    const integrations = SETTINGS_NAV.find((group) => group.id === "integrations");
    expect(integrations?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["integrations", "carrier-download", "social", "developer"]),
    );
    expect(settingsGroupFor("social")).toBe("integrations");
    expect(settingsGroupFor("developer")).toBe("integrations");
  });

  it("keeps People/Agents and Account recovery as distinct ids", () => {
    expect(new Set(SETTINGS_NAV_IDS).size).toBe(SETTINGS_NAV_IDS.length);
    expect(SETTINGS_NAV_IDS).toContain("developer-hub");
    expect(settingsGroupFor("agents")).toBe("people");
    expect(settingsGroupFor("profile")).toBe("account");
    expect(settingsGroupFor("security")).toBe("account");
    expect(settingsGroupFor("recovery")).toBe("account");
    expect(settingsGroupFor("compliance")).toBe("compliance");
  });

  it("keeps Developer Hub as one Settings group", () => {
    expect(settingsGroupFor("dev-macros")).toBe("developer-hub");
    expect(settingsGroupFor("dev-buttons")).toBe("developer-hub");
    expect(settingsGroupFor("dev-scripts")).toBe("developer-hub");
    expect(settingsGroupFor("dev-widgets")).toBe("developer-hub");
    expect(settingsGroupFor("dev-functions")).toBe("developer-hub");
    expect(settingsGroupFor("functions")).toBe("developer-hub");
    expect(settingsGroupFor("api-keys")).toBe("developer-hub");
    expect(settingsGroupFor("macros")).toBe("developer-hub");
    const hub = SETTINGS_NAV.find((group) => group.id === "developer-hub");
    expect(hub?.label).toBe("Developer Hub");
    expect(SETTINGS_NAV.filter((group) => group.label === "Developer Hub")).toHaveLength(1);
    expect(hub?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining([
        "dev-functions",
        "dev-macros",
        "dev-buttons",
        "dev-scripts",
        "dev-widgets",
      ]),
    );
  });

  it("nests Export and Lead routing under Brand / Agency", () => {
    expect(settingsGroupFor("export")).toBe("agency");
    expect(settingsGroupFor("routing")).toBe("agency");
    const agency = SETTINGS_NAV.find((group) => group.id === "agency");
    expect(agency?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["agency", "offices", "territories", "routing", "export"]),
    );
  });
});
