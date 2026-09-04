import { describe, expect, it } from "vitest";
import { SETTINGS_NAV, settingsGroupFor } from "./nav";

describe("settings nav", () => {
  it("nests Social under Integrations", () => {
    const integrations = SETTINGS_NAV.find((group) => group.id === "integrations");
    expect(integrations?.children.map((child) => child.id)).toEqual(
      expect.arrayContaining(["integrations", "social"]),
    );
    expect(settingsGroupFor("social")).toBe("integrations");
  });
});
