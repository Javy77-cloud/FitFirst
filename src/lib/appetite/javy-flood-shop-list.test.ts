import { describe, expect, it } from "vitest";
import {
  JAVY_FLOOD_SHOP_KEYS,
  JAVY_FLOOD_SHOP_LABEL,
  JAVY_FLOOD_SHOP_NAMES,
  matchFloodShopCarriers,
} from "./javy-flood-shop-list";
import { FIRST_WAVE_FLOOD } from "./first-wave";

describe("Javy Flood shop list", () => {
  it("mirrors FIRST_WAVE_FLOOD (4) and excludes Hartford / Beyond / Flow", () => {
    expect([...JAVY_FLOOD_SHOP_KEYS]).toEqual([...FIRST_WAVE_FLOOD]);
    expect(JAVY_FLOOD_SHOP_NAMES).toHaveLength(4);
    expect(JAVY_FLOOD_SHOP_NAMES).toEqual([
      "Neptune",
      "Selective",
      "Tower Hill",
      "Wright",
    ]);
    expect(JAVY_FLOOD_SHOP_LABEL).toBe("Load my Flood list");
    expect(JAVY_FLOOD_SHOP_NAMES.join(" ")).not.toMatch(/Hartford/i);
    expect(JAVY_FLOOD_SHOP_NAMES.join(" ")).not.toMatch(/Beyond/i);
    expect(JAVY_FLOOD_SHOP_NAMES.join(" ")).not.toMatch(/Flow Flood/i);
    expect(JAVY_FLOOD_SHOP_NAMES.join(" ")).not.toMatch(/\bNFIP\b/);
  });

  it("matchFloodShopCarriers orders by first-wave and prefers Wright National", () => {
    const rows = [
      { id: "h", name: "The Hartford" },
      { id: "w", name: "Wright" },
      { id: "wn", name: "Wright National" },
      { id: "n", name: "Neptune" },
      { id: "d", name: "NFIP Direct" },
      { id: "b", name: "Beyond Floods" },
      { id: "s", name: "Selective" },
      { id: "th", name: "Tower Hill" },
      { id: "f", name: "NFIP" },
      { id: "ff", name: "Flow Flood" },
    ];
    expect(matchFloodShopCarriers(rows).map((r) => r.name)).toEqual([
      "Neptune",
      "Selective",
      "Tower Hill",
      "Wright National",
    ]);
  });
});
