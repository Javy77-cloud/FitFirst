import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SOUTHERN_OAK_CARRIER_ID,
  SOUTHERN_OAK_CARRIER_NAME,
  TRIDENT_CARRIER_ID,
  TRIDENT_CARRIER_NAME,
} from "@/lib/fixtures/ids";
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
      expect.arrayContaining([
        "American Integrity",
        "Universal P&C",
        "Florida Peninsula",
        SOUTHERN_OAK_CARRIER_NAME,
        TRIDENT_CARRIER_NAME,
      ]),
    );
    expect(JAVY_HOME_SHOP_CARRIER_IDS).toContain(SOUTHERN_OAK_CARRIER_ID);
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

  it("enriches Trident via 0125 without a new carrier UUID", () => {
    const sql = readFileSync("drizzle/0125_trident_reciprocal_qrg.sql", "utf8");
    expect(sql).toContain(TRIDENT_CARRIER_ID);
    expect(sql).toContain("trident_reciprocal");
    expect(sql).toContain("min_cov_a:300000");
    expect(sql).toContain("max_cov_a:5000000");
    expect(sql).toContain("max_dwelling_age:40");
    expect(sql).toContain("min_miles_to_coast:0.5");
    expect(sql).toContain("pc:10");
    expect(sql).toContain("QRG Version 06122026");
    expect(sql).toMatch(/ON CONFLICT \(tenant_id, carrier_id\) DO UPDATE/);
    expect(sql).not.toMatch(/0123_trident|0124_comms/);
  });

  it("keeps Southern Oak on the default HO list and enriches via 0127 without a new UUID", () => {
    expect(JAVY_HOME_SHOP_NAMES).toContain(SOUTHERN_OAK_CARRIER_NAME);
    expect(JAVY_HOME_SHOP_CARRIER_IDS).toContain(SOUTHERN_OAK_CARRIER_ID);
    expect(HOME_SHOP_NAME_ALIASES[SOUTHERN_OAK_CARRIER_ID]).toEqual(
      expect.arrayContaining(["southern oak insurance", "southern oak"]),
    );

    const aliasOnly = [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Southern Oak Insurance" }];
    expect(resolveHomeShopCarrierIds(aliasOnly)).toEqual(["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"]);

    const sql = readFileSync("drizzle/0127_southern_oak_qrg.sql", "utf8");
    expect(sql).toContain(SOUTHERN_OAK_CARRIER_ID);
    expect(sql).toContain("southern_oak");
    expect(sql).toContain("max_cov_a:7500000");
    expect(sql).toContain("min_year_built:1950");
    expect(sql).toContain("7/15/2026");
    expect(sql).toContain("$7.5 million");
    expect(sql).toContain("52 counties");
    expect(sql).toContain("$1 million");
    expect(sql).toContain("https://www.southernoak.com");
    expect(sql).toContain("soi.policyport.com");
    expect(sql).toMatch(/ON CONFLICT \(tenant_id, carrier_id\) DO UPDATE/);
    expect(sql).not.toMatch(/0123_trident|0125_trident|0126_policy/);
    expect(sql).not.toMatch(/underwriter_name|underwriter_email|underwriter_phone/);
  });
});
