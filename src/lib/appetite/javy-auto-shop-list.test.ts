import { describe, expect, it } from "vitest";
import {
  JAVY_AUTO_SHOP_CARRIER_IDS,
  JAVY_AUTO_SHOP_LABEL,
  JAVY_AUTO_SHOP_NAMES,
} from "./javy-auto-shop-list";
import { FIRST_WAVE_AUTO } from "./first-wave";

describe("Javy Auto shop list", () => {
  it("has the eight Auto markets in order", () => {
    expect([...JAVY_AUTO_SHOP_NAMES]).toEqual([
      "Liberty Mutual",
      "Bristol West",
      "Allstate",
      "Geico",
      "Progressive",
      "Travelers",
      "The General",
      "Nationwide",
    ]);
    expect(JAVY_AUTO_SHOP_CARRIER_IDS).toHaveLength(8);
    expect(JAVY_AUTO_SHOP_LABEL).toBe("Load my Auto list");
    expect([...FIRST_WAVE_AUTO]).toEqual([
      "libertyMutual",
      "bristolWest",
      "allstate",
      "geico",
      "progressive",
      "travelers",
      "theGeneral",
      "nationwide",
    ]);
  });
});
