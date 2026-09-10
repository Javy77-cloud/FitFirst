import { describe, expect, it } from "vitest";
import {
  JAVY_FLOOD_SHOP_KEYS,
  JAVY_FLOOD_SHOP_LABEL,
  JAVY_FLOOD_SHOP_NAMES,
  matchFloodShopCarriers,
} from "./javy-flood-shop-list";
import { FIRST_WAVE_FLOOD } from "./first-wave";

describe("Javy Flood shop list", () => {
  it("mirrors FIRST_WAVE_FLOOD (5) and excludes Hartford", () => {
    expect([...JAVY_FLOOD_SHOP_KEYS]).toEqual([...FIRST_WAVE_FLOOD]);
    expect(JAVY_FLOOD_SHOP_NAMES).toHaveLength(5);
    expect(JAVY_FLOOD_SHOP_LABEL).toBe("Load my Flood list");
    expect(JAVY_FLOOD_SHOP_NAMES.join(" ")).not.toMatch(/Hartford/i);
    expect(JAVY_FLOOD_SHOP_NAMES).toContain("Flow Flood");
    expect(JAVY_FLOOD_SHOP_NAMES.join(" ")).not.toMatch(/\bNFIP\b/);
  });

  it("matchFloodShopCarriers orders by first-wave and skips NFIP / Hartford", () => {
    const rows = [
      { id: "h", name: "The Hartford" },
      { id: "w", name: "Wright National" },
      { id: "n", name: "Neptune" },
      { id: "d", name: "NFIP Direct" },
      { id: "b", name: "National General" },
      { id: "s", name: "Selective" },
      { id: "f", name: "NFIP" },
      { id: "ff", name: "Flow Flood" },
    ];
    expect(matchFloodShopCarriers(rows).map((r) => r.name)).toEqual([
      "National General",
      "Neptune",
      "Selective",
      "Wright National",
      "Flow Flood",
    ]);
  });
});
