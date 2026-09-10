import { describe, expect, it } from "vitest";
import {
  FIRST_WAVE_FLOOD,
  FLOOD_NAME_ALIASES,
  firstWaveKeys,
  firstWaveRank,
} from "./first-wave";

describe("Flood first-wave", () => {
  it("firstWaveKeys(flood) returns the five locked markets", () => {
    expect(firstWaveKeys("flood")).toEqual([
      "beyondFloods",
      "neptune",
      "selective",
      "wright",
      "flowFlood",
    ]);
    expect(firstWaveKeys("FLOOD")).toHaveLength(5);
    expect([...FIRST_WAVE_FLOOD]).toEqual(firstWaveKeys("flood"));
  });

  it("ranks Beyond Floods / Neptune / Selective / Wright / Flow Flood; excludes Hartford + NFIP", () => {
    expect(firstWaveRank("FLOOD", "x", "Beyond Floods")).toBe(0);
    expect(firstWaveRank("FLOOD", "x", "National General Beyond Floods")).toBe(0);
    expect(firstWaveRank("FLOOD", "x", "Neptune")).toBe(1);
    expect(firstWaveRank("FLOOD", "x", "Selective")).toBe(2);
    expect(firstWaveRank("FLOOD", "x", "Wright National")).toBe(3);
    expect(firstWaveRank("FLOOD", "x", "Flow Flood")).toBe(4);
    expect(firstWaveRank("FLOOD", "x", "The Hartford")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "Hartford")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "NFIP")).toBeNull();
    expect(firstWaveRank("FLOOD", "x", "NFIP Direct")).toBeNull();
  });

  it("exposes FLOOD_NAME_ALIASES for DB name matching", () => {
    expect(FLOOD_NAME_ALIASES.beyondFloods).toEqual(
      expect.arrayContaining(["beyond floods", "national general"]),
    );
    expect(FLOOD_NAME_ALIASES.neptune).toContain("neptune");
    expect(FLOOD_NAME_ALIASES.selective).toContain("selective");
    expect(FLOOD_NAME_ALIASES.wright).toContain("wright");
    expect(FLOOD_NAME_ALIASES.flowFlood).toEqual(
      expect.arrayContaining(["flow flood", "flowflood"]),
    );
  });
});
