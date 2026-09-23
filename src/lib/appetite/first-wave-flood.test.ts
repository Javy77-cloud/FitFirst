import { describe, expect, it } from "vitest";
import {
  FIRST_WAVE_FLOOD,
  FLOOD_NAME_ALIASES,
  firstWaveKeys,
  firstWaveRank,
} from "./first-wave";

describe("Flood first-wave", () => {
  it("firstWaveKeys(flood) returns the four locked markets", () => {
    expect(firstWaveKeys("flood")).toEqual([
      "neptune",
      "selective",
      "towerHill",
      "wright",
    ]);
    expect(firstWaveKeys("FLOOD")).toHaveLength(4);
    expect([...FIRST_WAVE_FLOOD]).toEqual(firstWaveKeys("flood"));
  });

  it("ranks Neptune / Selective / Tower Hill / Wright; excludes Hartford + Beyond + Flow + NFIP", () => {
    expect(firstWaveRank("FLOOD", "x", "Neptune")).toBe(0);
    expect(firstWaveRank("FLOOD", "x", "Selective")).toBe(1);
    expect(firstWaveRank("FLOOD", "x", "Tower Hill")).toBe(2);
    expect(firstWaveRank("FLOOD", "x", "Wright National")).toBe(3);
    expect(firstWaveRank("FLOOD", "x", "Wright Flood")).toBe(3);
    expect(firstWaveRank("FLOOD", "x", "The Hartford")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "Hartford")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "Beyond Floods")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "National General")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "Flow Flood")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "NFIP")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "NFIP Direct")).toBeNull();
  });

  it("exposes FLOOD_NAME_ALIASES for DB name matching", () => {
    expect(FLOOD_NAME_ALIASES.neptune).toContain("neptune");
    expect(FLOOD_NAME_ALIASES.selective).toContain("selective");
    expect(FLOOD_NAME_ALIASES.towerHill).toContain("tower hill");
    expect(FLOOD_NAME_ALIASES.wright).toEqual(
      expect.arrayContaining(["wright national", "wright flood", "wright"]),
    );
    expect(FLOOD_NAME_ALIASES).not.toHaveProperty("beyondFloods");
    expect(FLOOD_NAME_ALIASES).not.toHaveProperty("flowFlood");
  });
});
