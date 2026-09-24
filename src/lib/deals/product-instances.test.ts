import { describe, expect, it } from "vitest";
import { setProductStage } from "@/lib/deals/product-stages";
import { quoteMatchesDealProduct } from "@/lib/deals/shop-flow";
import {
  addProductInstance,
  normalizeProductInstanceList,
  removeProductInstance,
  resolveVisibleProductInstances,
  storageLineForInstance,
} from "@/lib/deals/product-instances";

describe("duplicate product instances", () => {
  it("keeps a second HO3 as its own instance", () => {
    const first = addProductInstance([], "homeowners");
    const withLandlord = addProductInstance(first.map((row) => row.key), "landlord");
    const withSecondHome = addProductInstance(
      withLandlord.map((row) => row.key),
      "homeowners",
    );
    expect(withSecondHome.map((row) => row.productId)).toEqual([
      "homeowners",
      "landlord",
      "homeowners",
    ]);
    expect(withSecondHome[0]?.key).toBe("homeowners");
    expect(withSecondHome[2]?.key.startsWith("homeowners~")).toBe(true);
    expect(withSecondHome[2]?.key).not.toBe(withSecondHome[0]?.key);
  });

  it("does not collapse an existing Gloria package", () => {
    expect(
      resolveVisibleProductInstances({
        shopProducts: ["homeowners", "landlord"],
        shopLines: ["home"],
        quotingForm: "HO3",
      }).map((row) => row.key),
    ).toEqual(["homeowners", "landlord"]);
  });

  it("gives the second copy its own sheet line and leaves the first on home", () => {
    const [primary, copy] = normalizeProductInstanceList(["homeowners", "homeowners~k7f3a2"]);
    expect(storageLineForInstance(primary!)).toBe("home");
    expect(storageLineForInstance(copy!)).toBe("home~homeowners~k7f3a2");
  });

  it("removes only the instance that was asked for", () => {
    const left = removeProductInstance(
      ["homeowners", "landlord", "homeowners~k7f3a2"],
      "homeowners~k7f3a2",
    );
    expect(left.map((row) => row.key)).toEqual(["homeowners", "landlord"]);
    const withoutPrimary = removeProductInstance(
      ["homeowners", "homeowners~k7f3a2"],
      "homeowners",
    );
    expect(withoutPrimary.map((row) => row.key)).toEqual(["homeowners~k7f3a2"]);
  });

  it("keeps quote rows and stages on the copy that owns them", () => {
    const gloria = {
      shopLine: "home",
      notes: "HO3 Citizens",
    };
    const second = {
      shopLine: "home~homeowners~k7f3a2",
      notes: "HO3 second house",
    };
    expect(quoteMatchesDealProduct(gloria, "homeowners", { splitHomeProducts: true })).toBe(true);
    expect(quoteMatchesDealProduct(second, "homeowners", { splitHomeProducts: true })).toBe(false);
    expect(quoteMatchesDealProduct(gloria, "homeowners~k7f3a2", { splitHomeProducts: true })).toBe(
      false,
    );
    expect(quoteMatchesDealProduct(second, "homeowners~k7f3a2", { splitHomeProducts: true })).toBe(
      true,
    );

    const stages = setProductStage(
      setProductStage({}, "homeowners", { stage: "quote_sent", selectedQuoteIds: ["q1"] }),
      "homeowners~k7f3a2",
      { stage: "gathering" },
    );
    expect(stages.homeowners?.stage).toBe("quote_sent");
    expect(stages.homeowners?.selectedQuoteIds).toEqual(["q1"]);
    expect(stages["homeowners~k7f3a2"]?.stage).toBe("gathering");
    expect(stages["homeowners~k7f3a2"]?.selectedQuoteIds).toEqual([]);
  });
});
