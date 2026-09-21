import { describe, expect, it } from "vitest";
import {
  SETTINGS_HOME_NAV,
  SETTINGS_KNOWN_HREFS,
  SETTINGS_NAV,
  SETTINGS_NAV_IDS,
  SETTINGS_PINNED_LINKS,
  settingsChildFor,
  settingsGroupFor,
} from "./nav";

describe("settings IA cards", () => {
  it("groups into FitFirst umbrellas instead of Desk & Phone", () => {
    expect(SETTINGS_NAV.map((group) => group.id)).toEqual([
      "agency",
      "people-access",
      "communications",
      "book-desk",
      "growth",
      "connect",
      "import-export",
      "automations-dev",
      "security",
      "billing",
    ]);
    expect(SETTINGS_HOME_NAV.map((group) => group.id)).toEqual([
      "agency",
      "people-access",
      "communications",
      "book-desk",
      "growth",
      "connect",
      "import-export",
      "automations-dev",
    ]);
    expect(SETTINGS_HOME_NAV).toHaveLength(8);
    expect(SETTINGS_NAV.find((group) => group.id === "communications")?.label).toBe("Communications");
    expect(SETTINGS_NAV.every((group) => group.blurb.length > 20)).toBe(true);
    expect(SETTINGS_NAV.every((group) => group.children.length > 0)).toBe(true);
  });

  it("keeps People/Agents and Account recovery as distinct ids", () => {
    expect(new Set(SETTINGS_NAV_IDS).size).toBe(SETTINGS_NAV_IDS.length);
    expect(SETTINGS_NAV_IDS).toContain("developer-hub");
    expect(SETTINGS_NAV_IDS).toContain("master-risk");
    expect(SETTINGS_NAV_IDS).toContain("outbound");
    expect(SETTINGS_NAV_IDS).toContain("import");
    expect(SETTINGS_NAV_IDS).toContain("picklists");
    expect(SETTINGS_NAV_IDS).toContain("policy-labels");
    expect(SETTINGS_NAV_IDS).toContain("agent-policy-access");
    expect(SETTINGS_NAV_IDS).toContain("roles-access");
    expect(settingsGroupFor("policy-labels")).toBe("book-desk");
    expect(settingsGroupFor("picklists")).toBe("book-desk");
    expect(settingsGroupFor("agents")).toBe("people-access");
    expect(settingsGroupFor("people")).toBe("people-access");
    expect(settingsGroupFor("roles-access")).toBe("people-access");
    expect(settingsGroupFor("profile")).toBe("security");
    expect(settingsGroupFor("security")).toBe("security");
    expect(settingsGroupFor("recovery")).toBe("security");
    expect(settingsGroupFor("compliance")).toBe("security");
    expect(settingsGroupFor("account")).toBe("security");
    expect(settingsGroupFor("outbound")).toBe("communications");
  });

  it("keeps phone and agency under obvious Admin groups", () => {
    expect(settingsGroupFor("phone")).toBe("communications");
    expect(settingsGroupFor("agency")).toBe("agency");
    expect(settingsGroupFor("agency-people")).toBe("agency");
    expect(settingsGroupFor("desk-phone")).toBe("communications");
    expect(SETTINGS_NAV.find((group) => group.id === "agency")?.badge).toBe("Admin");
    expect(SETTINGS_NAV.find((group) => group.id === "communications")?.badge).toBe("Admin");
    expect(SETTINGS_NAV.find((group) => group.id === "agency")?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["agency", "lines", "offices", "territories", "routing"]),
    );
    expect(SETTINGS_NAV.find((group) => group.id === "agency")?.children[1]).toMatchObject({
      id: "lines",
      href: "/settings/lines",
      label: "Lines of business",
    });
    expect(SETTINGS_NAV.find((group) => group.id === "communications")?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["phone", "communications", "email", "outbound", "templates", "prefs"]),
    );
  });

  it("nests Social under Growth and e-sign under Integrations", () => {
    const growth = SETTINGS_NAV.find((group) => group.id === "growth");
    const connect = SETTINGS_NAV.find((group) => group.id === "connect");
    expect(growth?.label).toBe("Growth");
    expect(growth?.children.map((child) => child.id)).toEqual(["social"]);
    expect(connect?.label).toBe("Integrations");
    expect(connect?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["integrations", "esign", "carrier-download"]),
    );
    expect(settingsGroupFor("social")).toBe("growth");
    expect(settingsGroupFor("esign")).toBe("connect");
    expect(settingsGroupFor("carrier-download")).toBe("connect");
  });

  it("keeps Developer Hub + Automations macros on one Setup card under Advanced", () => {
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
    expect(settingsGroupFor("missing-questions")).toBe("automations-dev");
    expect(settingsChildFor("dev-macros")).toBe("macros");
    expect(settingsChildFor("developer")).toBe("developer-hub");
    const hub = SETTINGS_NAV.find((group) => group.id === "automations-dev");
    expect(hub?.label).toBe("Automations & tools");
    expect(hub?.href).toBe("/automations");
    expect(SETTINGS_NAV.filter((group) => /automations|developer/i.test(group.label))).toHaveLength(1);
    expect(SETTINGS_NAV.filter((group) => group.label === "Developer Hub")).toHaveLength(0);
    expect(hub?.children.filter((child) => child.label === "Macros")).toHaveLength(1);
    expect(hub?.children.find((child) => child.id === "macros")?.href).toBe("/automations/macros");
    expect(hub?.children.find((child) => child.id === "macros")?.advanced).toBe(true);
    expect(hub?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["automations", "playbooks", "macros", "functions", "developer-hub"]),
    );
    expect(hub?.children.filter((child) => child.href.includes("macros"))).toHaveLength(1);
  });

  it("keeps Automations on live hub paths without a second Developer Hub group", () => {
    const hub = SETTINGS_NAV.find((group) => group.id === "automations-dev");
    expect(hub?.href).toBe("/automations");
    expect(hub?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["automations", "triggers", "playbooks"]),
    );
    expect(hub?.children.some((child) => child.id === "templates")).toBe(false);
    expect(hub?.children.some((child) => child.id === "developer")).toBe(false);
    expect(hub?.children.every((child) => child.href !== "/settings/developer")).toBe(true);
    expect(settingsGroupFor("templates")).toBe("communications");
    expect(settingsGroupFor("email-templates")).toBe("communications");
    expect(settingsGroupFor("triggers")).toBe("automations-dev");
    const allChildren = SETTINGS_NAV.flatMap((group) => group.children);
    expect(allChildren.filter((child) => child.label === "Macros")).toHaveLength(1);
    expect(allChildren.filter((child) => child.id === "macros" || child.id === "dev-macros")).toHaveLength(1);
    expect(allChildren.some((child) => child.label === "Documents library")).toBe(true);
    expect(hub?.children.some((child) => child.label === "Documents")).toBe(false);
  });

  it("puts Data (Import / Export) on its own Admin group", () => {
    expect(settingsGroupFor("export")).toBe("import-export");
    expect(settingsGroupFor("import")).toBe("import-export");
    expect(settingsGroupFor("import-export")).toBe("import-export");
    expect(settingsGroupFor("billing")).toBe("billing");
    expect(settingsGroupFor("routing")).toBe("agency");
    expect(SETTINGS_NAV.find((group) => group.id === "import-export")?.badge).toBe("Admin");
    expect(SETTINGS_NAV.find((group) => group.id === "import-export")?.label).toBe("Data");
    expect(SETTINGS_NAV.find((group) => group.id === "import-export")?.children.map((child) => child.id)).toEqual(
      ["import-export", "import", "export"],
    );
  });

  it("surfaces Lines of business and Email templates as their own findable entries", () => {
    expect(SETTINGS_PINNED_LINKS.map((item) => item.label)).toEqual([
      "Lines of business",
      "Email templates",
    ]);
    expect(SETTINGS_PINNED_LINKS.map((item) => item.href)).toEqual([
      "/settings/lines",
      "/settings/email-templates",
    ]);
    const comms = SETTINGS_NAV.find((group) => group.id === "communications");
    expect(comms?.children.some((child) => child.label === "Email templates")).toBe(true);
    expect(comms?.children.find((child) => child.id === "templates")).toMatchObject({
      href: "/settings/email-templates",
      label: "Email templates",
    });
    const automations = SETTINGS_NAV.find((group) => group.id === "automations-dev");
    expect(automations?.children.some((child) => child.label === "Email templates")).toBe(false);
    expect(automations?.children.some((child) => /task/i.test(child.label) && child.id !== "playbooks")).toBe(
      false,
    );
    expect(settingsChildFor("email-templates")).toBe("templates");
  });

  it("does not invent dead links", () => {
    const hrefs = [SETTINGS_NAV.map((group) => group.href), SETTINGS_NAV.flatMap((group) => group.children.map((child) => child.href))].flat();
    for (const href of hrefs) {
      expect(SETTINGS_KNOWN_HREFS).toContain(href);
    }
  });
});
