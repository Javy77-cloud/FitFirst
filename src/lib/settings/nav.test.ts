import { describe, expect, it } from "vitest";
import {
  SETTINGS_KNOWN_HREFS,
  SETTINGS_NAV,
  SETTINGS_NAV_IDS,
  settingsChildFor,
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
      "import-export",
      "billing",
    ]);
    expect(SETTINGS_NAV.every((group) => group.blurb.length > 20)).toBe(true);
    expect(SETTINGS_NAV.every((group) => group.children.length > 0)).toBe(true);
  });

  it("keeps People/Agents and Account recovery as distinct ids", () => {
    expect(new Set(SETTINGS_NAV_IDS).size).toBe(SETTINGS_NAV_IDS.length);
    expect(SETTINGS_NAV_IDS).toContain("developer-hub");
    expect(SETTINGS_NAV_IDS).toContain("master-risk");
    expect(SETTINGS_NAV_IDS).toContain("outbound");
    expect(SETTINGS_NAV_IDS).toContain("import");
    expect(settingsGroupFor("agents")).toBe("agency-people");
    expect(settingsGroupFor("people")).toBe("agency-people");
    expect(settingsGroupFor("profile")).toBe("security");
    expect(settingsGroupFor("security")).toBe("security");
    expect(settingsGroupFor("recovery")).toBe("security");
    expect(settingsGroupFor("compliance")).toBe("security");
    expect(settingsGroupFor("account")).toBe("security");
    expect(settingsGroupFor("outbound")).toBe("desk-phone");
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
      expect.arrayContaining(["phone", "communications", "email", "outbound"]),
    );
  });

  it("nests Social and e-sign under Connect", () => {
    const connect = SETTINGS_NAV.find((group) => group.id === "connect");
    expect(connect?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["integrations", "social", "esign", "carrier-download"]),
    );
    expect(settingsGroupFor("social")).toBe("connect");
    expect(settingsGroupFor("esign")).toBe("connect");
    expect(settingsGroupFor("carrier-download")).toBe("connect");
  });

  it("keeps Developer Hub + Automations macros on one Setup card", () => {
    expect(settingsGroupFor("dev-macros")).toBe("automations-dev");
    expect(settingsGroupFor("dev-buttons")).toBe("automations-dev");
    expect(settingsGroupFor("dev-scripts")).toBe("automations-dev");
    expect(settingsGroupFor("dev-widgets")).toBe("automations-dev");
    expect(settingsGroupFor("dev-functions")).toBe("automations-dev");
    expect(settingsGroupFor("functions")).toBe("automations-dev");
    expect(settingsGroupFor("api-keys")).toBe("automations-dev");
    expect(settingsGroupFor("macros")).toBe("automations-dev");
    expect(settingsGroupFor("developer")).toBe("automations-dev");
    expect(settingsGroupFor("developer-hub")).toBe("automations-dev");
    expect(settingsChildFor("dev-macros")).toBe("macros");
    expect(settingsChildFor("developer")).toBe("developer-hub");
    const hub = SETTINGS_NAV.find((group) => group.id === "automations-dev");
    expect(hub?.label).toBe("Automations & Developer");
    expect(hub?.href).toBe("/automations");
    expect(SETTINGS_NAV.filter((group) => /automations|developer/i.test(group.label))).toHaveLength(1);
    expect(SETTINGS_NAV.filter((group) => group.label === "Developer Hub")).toHaveLength(0);
    expect(hub?.children.filter((child) => child.label === "Macros")).toHaveLength(1);
    expect(hub?.children.find((child) => child.id === "macros")?.href).toBe("/automations/macros");
    expect(hub?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["automations", "macros", "functions", "developer-hub"]),
    );
    expect(hub?.children.filter((child) => child.href.includes("macros"))).toHaveLength(1);
  });

  it("keeps Automations on live hub paths without a second Developer Hub group", () => {
    const hub = SETTINGS_NAV.find((group) => group.id === "automations-dev");
    expect(hub?.href).toBe("/automations");
    expect(hub?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["automations", "templates", "triggers", "playbooks"]),
    );
    expect(hub?.children.some((child) => child.id === "developer")).toBe(false);
    expect(hub?.children.every((child) => child.href !== "/settings/developer")).toBe(true);
    expect(settingsGroupFor("templates")).toBe("automations-dev");
    expect(settingsGroupFor("triggers")).toBe("automations-dev");
    const allChildren = SETTINGS_NAV.flatMap((group) => group.children);
    expect(allChildren.filter((child) => child.label === "Macros")).toHaveLength(1);
    expect(allChildren.filter((child) => child.id === "macros" || child.id === "dev-macros")).toHaveLength(1);
  });

  it("puts Import / Export on its own Admin group", () => {
    expect(settingsGroupFor("export")).toBe("import-export");
    expect(settingsGroupFor("import")).toBe("import-export");
    expect(settingsGroupFor("import-export")).toBe("import-export");
    expect(settingsGroupFor("billing")).toBe("billing");
    expect(settingsGroupFor("routing")).toBe("agency-people");
    expect(SETTINGS_NAV.find((group) => group.id === "import-export")?.badge).toBe("Admin");
    expect(SETTINGS_NAV.find((group) => group.id === "import-export")?.children.map((child) => child.id)).toEqual(
      ["import-export", "import", "export"],
    );
  });

  it("does not invent dead links", () => {
    const hrefs = [SETTINGS_NAV.map((group) => group.href), SETTINGS_NAV.flatMap((group) => group.children.map((child) => child.href))].flat();
    for (const href of hrefs) {
      expect(SETTINGS_KNOWN_HREFS).toContain(href);
    }
  });
});
