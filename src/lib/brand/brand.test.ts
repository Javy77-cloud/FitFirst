import { describe, expect, it } from "vitest";
import { defaultColumnLayout, resolveColumnKeys } from "@/lib/domain";
import { mergeOneList } from "./column-layout";
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
    } as unknown as AgentUiPref;
    const resolved = resolveUiPrefs(brand, agent);
    expect(resolved.agencyName).toBe("Javier Garcia Insurance");
    expect(resolved.colorPreset).toBe("terracotta");
    expect(resolved.fontPreset).toBe("system");
    expect(resolved.density).toBe("compact");
    expect(resolved.colorSource).toBe("agent");
    expect(resolved.columnLayout.deals).toEqual(["title", "stage"]);
    expect(resolved.columnLayout.leads?.length).toBeGreaterThan(0);
    expect(resolved.logoUrl).toBeNull();
  });

  it("never lets agent prefs replace agency logo or name", () => {
    const branded = {
      ...brand,
      logoStoragePath: "tenant/brand/logo.png",
      agencyName: "Javier Garcia Insurance",
    } as AgencyBrand;
    const agent = { colorPreset: "slate" } as AgentUiPref;
    const resolved = resolveUiPrefs(branded, agent);
    expect(resolved.agencyName).toBe("Javier Garcia Insurance");
    expect(resolved.logoUrl).toBe("/api/brand/logo");
    expect(resolved.colorPreset).toBe("slate");
  });
});

describe("resolveColumnKeys", () => {
  it("drops unknown keys and falls back to the catalog", () => {
    expect(resolveColumnKeys("deals", { deals: ["title", "nope"] })).toEqual(["title"]);
    expect(resolveColumnKeys("deals", { deals: [] })[0]).toBe("title");
  });
});

describe("mergeOneList", () => {
  it("writes one list without wiping other lists or inventing keys", () => {
    const next = mergeOneList(defaultColumnLayout(), "deals", ["title", "stage", "ghost"]);
    expect(next.deals).toEqual(["title", "stage"]);
    expect(next.leads).toEqual(defaultColumnLayout().leads);
  });
});
