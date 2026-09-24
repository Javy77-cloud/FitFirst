import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealLineSwitcher } from "@/components/deal/deal-line-switcher";
import { labelProductInstances } from "@/lib/deals/product-instance-label";
import { parseProductInstanceToken } from "@/lib/deals/product-instances";
import { parseProductStages } from "@/lib/deals/product-stages";
import { productQuoteCompleteness } from "@/lib/deals/quote-completeness";
import { EXPLICIT_MARKET_ACTION_MARKER } from "@/lib/deals/manual-markets";
import {
  blankPropertyCharacteristics,
  dealLevelPropertyAddress,
  DEAL_INSURED_ADDRESS_KEYS,
  DEAL_MAILING_ADDRESS_KEYS,
  editProductAddress,
  legacyPropertyOwnerKey,
  newCopyPropertySeed,
  overlaySharedProductSheet,
  productTabShowsError,
  resolveProductPropertyAddress,
  restoreDealInsuredFields,
  splitSharedSheetAddressSave,
} from "@/lib/deals/product-property";
import { sheetValuesFingerprint } from "@/lib/deals/shop-flow";

const LANDLORD_STREET = "16021 Northwest 79th Court";
const DEAL_STREET = "100 Ocean Dr";

const dealInsured = {
  [DEAL_INSURED_ADDRESS_KEYS.street]: DEAL_STREET,
  [DEAL_INSURED_ADDRESS_KEYS.unit]: "4B",
  [DEAL_INSURED_ADDRESS_KEYS.city]: "Miami Beach",
  [DEAL_INSURED_ADDRESS_KEYS.state]: "FL",
  [DEAL_INSURED_ADDRESS_KEYS.zip]: "33139",
  [DEAL_INSURED_ADDRESS_KEYS.county]: "Miami-Dade",
};

describe("second property product", () => {
  it("pre-fills a new HO3 from the deal insured address and never from another product", () => {
    const seed = newCopyPropertySeed(dealInsured);
    expect(seed.address).toEqual({
      street: DEAL_STREET,
      unit: "4B",
      city: "Miami Beach",
      state: "FL",
      zip: "33139",
      county: "Miami-Dade",
    });
    expect(seed.address.street).not.toBe(LANDLORD_STREET);
    expect(seed.characteristics).toEqual(blankPropertyCharacteristics());
    expect(Object.values(seed.characteristics).every((value) => value === "")).toBe(true);

    const resolved = resolveProductPropertyAddress({
      instanceKey: "homeowners~88uvyj",
      ownsSheet: true,
      legacyOwner: false,
      storedDeal: dealInsured,
      sheetValues: {},
      ownRisk: null,
    });
    expect(resolved.source).toBe("deal");
    expect(resolved.address.street).toBe(DEAL_STREET);

    const mailingOnly = dealLevelPropertyAddress({
      [DEAL_MAILING_ADDRESS_KEYS.street]: "9 Mail St",
      [DEAL_MAILING_ADDRESS_KEYS.unit]: "2",
      [DEAL_MAILING_ADDRESS_KEYS.city]: "Hialeah",
      [DEAL_MAILING_ADDRESS_KEYS.state]: "FL",
      [DEAL_MAILING_ADDRESS_KEYS.zip]: "33016",
      [DEAL_MAILING_ADDRESS_KEYS.county]: "Miami-Dade",
    });
    expect(mailingOnly.street).toBe("9 Mail St");
    expect(mailingOnly.unit).toBe("2");
    expect(mailingOnly.city).toBe("Hialeah");
  });

  it("starts a new copy at Gathering with no error chip", () => {
    expect(productTabShowsError({ shopped: false, complete: false })).toBe(false);
    expect(productTabShowsError({ shopped: true, complete: false })).toBe(true);
    const stages = parseProductStages({
      "homeowners~88uvyj": { stage: "gathering" },
    });
    expect(stages["homeowners~88uvyj"]?.stage).toBe("gathering");

    const html = renderToString(
      createElement(DealLineSwitcher, {
        dealId: "deal-1",
        products: ["homeowners", "landlord", "homeowners~88uvyj"],
        active: "homeowners",
        quoteGaps: {
          homeowners: { complete: true, shopped: true, summary: "2 quotes in" },
          landlord: { complete: true, shopped: true, summary: "1 quote in" },
          "homeowners~88uvyj": {
            complete: false,
            shopped: false,
            summary: "No quotes on this product yet",
          },
        },
        stages: {
          "homeowners~88uvyj": { stage: "gathering" },
        },
      }),
    );
    expect(html).toMatch(/data-ff-deal-product-chip="homeowners~88uvyj"[^>]*data-ff-product-missing-quotes="0"/);
    expect(html).toMatch(/data-ff-product-stage="gathering"/);
    expect(html).not.toMatch(/data-ff-deal-product-chip="homeowners~88uvyj"[^>]*data-ff-product-missing-quotes-chip/);
  });

  it("does not treat the other home's shop as an error on the ~suffix copy", () => {
    const copy = productQuoteCompleteness({
      product: "homeowners~88uvyj",
      multiLine: true,
      splitHomeProducts: true,
      logs: [
        {
          id: "l1",
          carrierId: "citizens",
          lineOfBusiness: "HO",
          result: "timeout",
          why: `${EXPLICIT_MARKET_ACTION_MARKER} timed out`,
        },
      ],
      quotes: [{ carrierId: "citizens", stub: false, shopLine: "home", notes: "Rated" }],
    });
    expect(copy.shopped).toBe(false);
    expect(copy.complete).toBe(false);
    expect(productTabShowsError(copy)).toBe(false);
    expect(parseProductInstanceToken("homeowners~88uvyj")?.productId).toBe("homeowners");
  });
});

describe("per-product address edits", () => {
  it("editing one product address leaves the other product and the deal address alone", () => {
    const deal = dealLevelPropertyAddress(dealInsured);
    const rows = editProductAddress(
      [
        { key: "homeowners", address: { ...deal } },
        {
          key: "landlord",
          address: {
            street: LANDLORD_STREET,
            unit: "",
            city: "Miami Lakes",
            state: "FL",
            zip: "33016",
            county: "Miami-Dade",
          },
        },
        { key: "homeowners~88uvyj", address: { ...deal } },
      ],
      "homeowners~88uvyj",
      {
        street: "8662 Northwest 25th St",
        unit: "",
        city: "Miami",
        state: "FL",
        zip: "33147",
        county: "Miami-Dade",
      },
    );
    expect(rows.find((row) => row.key === "landlord")?.address.street).toBe(LANDLORD_STREET);
    expect(rows.find((row) => row.key === "homeowners")?.address.street).toBe(DEAL_STREET);
    expect(rows.find((row) => row.key === "homeowners~88uvyj")?.address.street).toBe(
      "8662 Northwest 25th St",
    );
    const restored = restoreDealInsuredFields(
      {
        ...dealInsured,
        mailing_address: "8662 Northwest 25th St",
        city: "Miami",
      },
      dealInsured,
    );
    expect(restored.mailing_address).toBe(DEAL_STREET);
    expect(restored.city).toBe("Miami Beach");
    expect(dealLevelPropertyAddress(dealInsured).street).toBe(DEAL_STREET);
  });

  it("labels the ~suffix tab from that product's street", () => {
    const labels = labelProductInstances([
      {
        key: "landlord",
        productId: "landlord",
        address: LANDLORD_STREET,
        city: "Miami Lakes",
      },
      {
        key: "homeowners~88uvyj",
        productId: "homeowners",
        quotingForm: "HO3",
        address: "8662 NW 25th St",
        city: "Miami",
      },
    ]);
    expect(labels.get("homeowners~88uvyj")).toBe("HO3 8662 Northwest 25th");
    expect(labels.get("landlord")).toBe("DP3 16021 Northwest 79th");
    expect(legacyPropertyOwnerKey([
      { key: "homeowners", productId: "homeowners" },
      { key: "landlord", productId: "landlord" },
      { key: "homeowners~88uvyj", productId: "homeowners" },
    ])).toBe("homeowners");
  });

  it("keeps the other product's address and characteristics when a shared sheet is saved", () => {
    const saved = splitSharedSheetAddressSave({
      previous: {
        address1: { value: LANDLORD_STREET, status: "confirmed", source: "agent" },
        year_built: { value: "1988", status: "confirmed", source: "agent" },
      },
      merged: {
        address1: { value: DEAL_STREET, status: "confirmed", source: "agent" },
        year_built: { value: "1988", status: "confirmed", source: "agent" },
        city: { value: "Miami Beach", status: "confirmed", source: "agent" },
      },
      instanceKey: "landlord",
      submitted: {
        street: "8662 Northwest 25th St",
        unit: "",
        city: "Miami",
        state: "FL",
        zip: "33147",
        county: "Miami-Dade",
      },
      characteristicSource: { year_built: "" },
    });
    expect(saved.address1?.value).toBe(LANDLORD_STREET);
    expect(saved.year_built?.value).toBe("1988");
    expect(saved["ffpa:landlord:address1"]?.value).toBe("8662 Northwest 25th St");
    expect(saved["ffpa:landlord:year_built"]?.value ?? "").toBe("");
    const shown = overlaySharedProductSheet(saved, "landlord", {
      street: "8662 Northwest 25th St",
      unit: "",
      city: "Miami",
      state: "FL",
      zip: "33147",
      county: "Miami-Dade",
    });
    expect(shown.address1?.value).toBe("8662 Northwest 25th St");
    expect(shown.year_built?.value ?? "").toBe("");
    expect(saved.address1?.value).toBe(LANDLORD_STREET);
    expect(sheetValuesFingerprint(saved)).toBe(
      sheetValuesFingerprint({
        address1: { value: LANDLORD_STREET },
        year_built: { value: "1988" },
      }),
    );
  });
});
