import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRIDENT_CARRIER_ID, TRIDENT_CARRIER_NAME } from "@/lib/fixtures/ids";
import {
  HOME_SHOP_NAME_ALIASES,
  JAVY_HOME_SHOP_CARRIER_IDS,
  JAVY_HOME_SHOP_LABEL,
  JAVY_HOME_SHOP_NAMES,
  resolveHomeShopCarrierIds,
} from "./javy-home-shop-list";

describe("Javy Home shop list", () => {
  it("includes Trident Reciprocal Exchange among the default HO markets without duplicates", () => {
    expect(JAVY_HOME_SHOP_NAMES).toContain(TRIDENT_CARRIER_NAME);
    expect(JAVY_HOME_SHOP_CARRIER_IDS).toContain(TRIDENT_CARRIER_ID);
    expect(new Set(JAVY_HOME_SHOP_CARRIER_IDS).size).toBe(JAVY_HOME_SHOP_CARRIER_IDS.length);
    expect(JAVY_HOME_SHOP_CARRIER_IDS).toHaveLength(JAVY_HOME_SHOP_NAMES.length);
    expect(JAVY_HOME_SHOP_LABEL).toBe("Load my Home list");
    expect(JAVY_HOME_SHOP_NAMES).toEqual(
      expect.arrayContaining(["American Integrity", "Universal P&C", "Florida Peninsula", TRIDENT_CARRIER_NAME]),
    );
  });

  it("resolveHomeShopCarrierIds prefers the seeded UUID and reuses an alias row", () => {
    const seeded = [
      { id: "33333333-3333-4333-8333-333333333309", name: "American Integrity" },
      { id: TRIDENT_CARRIER_ID, name: TRIDENT_CARRIER_NAME },
    ];
    expect(resolveHomeShopCarrierIds(seeded)).toEqual([
      "33333333-3333-4333-8333-333333333309",
      TRIDENT_CARRIER_ID,
    ]);

    const aliasOnly = [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Trident Reciprocal" },
    ];
    expect(resolveHomeShopCarrierIds(aliasOnly)).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    expect(HOME_SHOP_NAME_ALIASES[TRIDENT_CARRIER_ID]).toEqual(
      expect.arrayContaining(["trident reciprocal exchange", "trident reciprocal", "trident"]),
    );
  });

  it("keeps the shop-list UUID in sync with the Neon seed migration", () => {
    const sql = readFileSync("drizzle/0123_trident_reciprocal_ho.sql", "utf8");
    expect(sql).toContain(TRIDENT_CARRIER_ID);
    expect(sql).toContain("min_cov_a:300000");
    expect(sql).toMatch(/npm run appetite:import/);
    expect(JAVY_HOME_SHOP_CARRIER_IDS).toContain(TRIDENT_CARRIER_ID);
  });
});
