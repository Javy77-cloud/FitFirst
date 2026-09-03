import { describe, expect, it } from "vitest";
import { defaultColumnLayout, resolveColumnKeys } from "@/lib/domain";
import { resolveUiPrefs } from "./resolve";
import type { AgencyBrand, AgentUiPref } from "@/lib/db/schema";

const brand = {
  agencyName: "Javier Garcia Insurance",
  logoStoragePath: null,
  defaultColorPreset: "agency",
  defaultFontPreset: "plex",
  defaultDensity: "comfortable",
  defaultColumnLayout: defaultColumnLayout(),
} as AgencyBrand;

describe("resolveUiPrefs", () => {
  it("uses agency defaults when the agent has no overrides", () => {
    const resolved = resolveUiPrefs(brand, null);
    expect(resolved.agencyName).toBe("Javier Garcia Insurance");
    expect(resolved.colorPreset).toBe("agency");
    expect(resolved.colorSource).toBe("agency");
    expect(resolved.columnLayout.deals).toContain("title");
  });

  it("lets an agent override color without changing agency name", () => {
    const agent = {
      colorPreset: "terracotta",
      fontPreset: "system",
      density: "compact",
      columnLayout: { deals: ["title", "stage"] },
    } as AgentUiPref;
    const resolved = resolveUiPrefs(brand, agent);
    expect(resolved.agencyName).toBe("Javier Garcia Insurance");
    expect(resolved.colorPreset).toBe("terracotta");
    expect(resolved.fontPreset).toBe("system");
    expect(resolved.density).toBe("compact");
    expect(resolved.colorSource).toBe("agent");
    expect(resolved.columnLayout.deals).toEqual(["title", "stage"]);
    expect(resolved.columnLayout.leads?.length).toBeGreaterThan(0);
  });
});

describe("resolveColumnKeys", () => {
  it("drops unknown keys and falls back to the catalog", () => {
    expect(resolveColumnKeys("deals", { deals: ["title", "nope"] })).toEqual(["title"]);
    expect(resolveColumnKeys("deals", { deals: [] })[0]).toBe("title");
  });
});
