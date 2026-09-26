import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stackProductName } from "./card-glance";
import { dealNativeColumnText, type DealColumnDeal } from "./deal-columns";
import {
  displayProductLabel,
  formatShopLinesForDesk,
  presentProductLabel,
} from "./product-chip-label";

/** Gloria Martinez shop (deal 03dccdd7 was the DP3 sibling). Second HO3 stores `~88uvyj`. */
const GLORIA_KEYS = [
  "homeowners",
  "landlord",
  "homeowners~88uvyj",
  "home~homeowners~88uvyj",
  "home~landlord",
] as const;

describe("desk product labels", () => {
  it("labels Gloria Martinez products as HO3 and DP3, never the storage key", () => {
    expect(displayProductLabel("homeowners")).toBe("HO3");
    expect(displayProductLabel("homeowners~88uvyj")).toBe("HO3");
    expect(displayProductLabel("home~homeowners~88uvyj")).toBe("HO3");
    expect(displayProductLabel("landlord")).toBe("DP3");
    expect(displayProductLabel("home~landlord")).toBe("DP3");
    expect(displayProductLabel("auto")).toBe("Auto");
    expect(displayProductLabel("workers_comp")).toBe("WC");
    expect(displayProductLabel("general_liability")).toBe("GL");
    expect(displayProductLabel("HO6")).toBe("HO6");
    for (const key of GLORIA_KEYS) {
      expect(displayProductLabel(key)).not.toMatch(/~|88uvyj/);
      expect(presentProductLabel(key)).not.toMatch(/~|88uvyj/);
    }
    expect(presentProductLabel("HO3 16021 Northwest 79th")).toBe("HO3 16021 Northwest 79th");
    expect(presentProductLabel("Gloria Martinez · home~homeowners~88uvyj")).toBe("Gloria Martinez · HO3");
  });

  it("formats Quotes and deal shop-line columns with form labels", () => {
    expect(formatShopLinesForDesk(["home", "home~homeowners~88uvyj", "auto", "workers_comp"])).toBe(
      "HO3, Auto, WC",
    );
    expect(presentProductLabel("home~homeowners~88uvyj")).toBe("HO3");
    expect(
      dealNativeColumnText(
        "shopLines",
        { shopLines: ["home~landlord", "home~homeowners~88uvyj"] } as DealColumnDeal,
        new Map(),
      ),
    ).toBe("DP3, HO3");
    expect(stackProductName("homeowners~88uvyj")).toBe("HO3");
    expect(stackProductName("home~homeowners~88uvyj", "home~homeowners~88uvyj")).toBe("HO3");
    expect(stackProductName("homeowners", "No quotes yet")).toBe("HO3");

    const quotes = readFileSync("src/components/deal/quotes-panel.tsx", "utf8");
    const markets = readFileSync("src/components/deal/markets-panel.tsx", "utf8");
    const table = readFileSync("src/components/deals/deals-table.tsx", "utf8");
    expect(quotes).toMatch(/presentProductLabel/);
    expect(markets).toMatch(/presentProductLabel/);
    expect(table).toMatch(/formatShopLinesForDesk/);
  });
});
