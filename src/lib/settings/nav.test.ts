import { describe, expect, it } from "vitest";
import {
  SETTINGS_KNOWN_HREFS,
  SETTINGS_NAV,
  SETTINGS_NAV_IDS,
  settingsGroupFor,
} from "./nav";

describe("settings IA cards", () => {
  it("groups into Setup categories instead of a flat rail", () => {
    expect(SETTINGS_NAV.map((group) => group.id)).toEqual([
      "agency-people",
      "desk-phone",
      "connect",
      "automations-dev",
      "security",
      "billing",
    ]);
    expect(SETTINGS_NAV.every((group) => group.blurb.length > 20)).toBe(true);
    expect(SETTINGS_NAV.every((group) => group.children.length > 0)).toBe(true);
  });

  it("keeps People/Agents and Account recovery as distinct ids", () => {
    expect(new Set(SETTINGS_NAV_IDS).size).toBe(SETTINGS_NAV_IDS.length);
    expect(settingsGroupFor("agents")).toBe("agency-people");
    expect(settingsGroupFor("people")).toBe("agency-people");
    expect(settingsGroupFor("profile")).toBe("security");
    expect(settingsGroupFor("security")).toBe("security");
    expect(settingsGroupFor("recovery")).toBe("security");
    expect(settingsGroupFor("compliance")).toBe("security");
    expect(settingsGroupFor("account")).toBe("security");
  });

  it("keeps phone and agency under obvious Admin groups", () => {
    expect(settingsGroupFor("phone")).toBe("desk-phone");
    expect(settingsGroupFor("agency")).toBe("agency-people");
    expect(SETTINGS_NAV.find((group) => group.id === "agency-people")?.badge).toBe("Admin");
    expect(SETTINGS_NAV.find((group) => group.id === "desk-phone")?.badge).toBe("Admin");
    expect(SETTINGS_NAV.find((group) => group.id === "agency-people")?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["agency", "agents", "offices", "territories", "routing"]),
    );
    expect(SETTINGS_NAV.find((group) => group.id === "desk-phone")?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["phone", "communications", "email"]),
    );
  });

  it("nests Social and e-sign under Connect", () => {
    const connect = SETTINGS_NAV.find((group) => group.id === "connect");
    expect(connect?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["integrations", "social", "esign"]),
    );
    expect(settingsGroupFor("social")).toBe("connect");
    expect(settingsGroupFor("esign")).toBe("connect");
  });

  it("points Developer Hub at live Automations paths, not a missing /settings/developer", () => {
    const hub = SETTINGS_NAV.find((group) => group.id === "automations-dev");
    expect(hub?.href).toBe("/automations");
    expect(hub?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["automations", "templates", "triggers", "developer"]),
    );
    expect(hub?.children.find((child) => child.id === "developer")?.href).toBe("/automations");
    expect(hub?.children.every((child) => child.href !== "/settings/developer")).toBe(true);
    expect(settingsGroupFor("templates")).toBe("automations-dev");
    expect(settingsGroupFor("triggers")).toBe("automations-dev");
    expect(settingsGroupFor("developer")).toBe("automations-dev");
  });

  it("puts export on the Billing stub group", () => {
    expect(settingsGroupFor("export")).toBe("billing");
    expect(settingsGroupFor("billing")).toBe("billing");
    expect(settingsGroupFor("routing")).toBe("agency-people");
  });

  it("does not invent dead links", () => {
    const hrefs = [SETTINGS_NAV.map((group) => group.href), SETTINGS_NAV.flatMap((group) => group.children.map((child) => child.href))].flat();
    for (const href of hrefs) {
      expect(SETTINGS_KNOWN_HREFS).toContain(href);
    }
  });
});
