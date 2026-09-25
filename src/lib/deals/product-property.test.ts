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
  autoVehicleRiskKey,
  blankPropertyCharacteristics,
  dealLevelPropertyAddress,
  DEAL_INSURED_ADDRESS_KEYS,
  DEAL_MAILING_ADDRESS_KEYS,
  editProductAddress,
  headerAddressesForProductTab,
  headerRiskOwnerKey,
  insuredAddressForProductTab,
  instanceOwnsSheet,
  legacyPropertyOwnerKey,
  newCopyPropertySeed,
  tabRiskForInstance,
  vehiclesOnAutoSheet,
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

    const rental = dealLevelPropertyAddress(
      {
        [DEAL_MAILING_ADDRESS_KEYS.street]: "9 Mail St",
        [DEAL_MAILING_ADDRESS_KEYS.city]: "Hialeah",
        [DEAL_MAILING_ADDRESS_KEYS.state]: "FL",
        [DEAL_MAILING_ADDRESS_KEYS.zip]: "33016",
      },
      { dwellingFire: true },
    );
    expect(rental.street).toBe("");
    expect(rental.city).toBe("");
  });

  it("gives each later auto vehicle its own risk key", () => {
    expect(autoVehicleRiskKey("auto", 1)).toBe("auto");
    expect(autoVehicleRiskKey("auto", 2)).toBe("auto#v2");
    const vehicles = vehiclesOnAutoSheet({
      vin: { value: "1HGCM82633A004352" },
      vehicle_year: { value: "2019" },
      vehicle_make: { value: "Toyota" },
      vehicle_model: { value: "Camry" },
      vehicle_2_vin: { value: "2HGCM82633A004353" },
      vehicle_2_year: { value: "2021" },
      vehicle_2_make: { value: "Honda" },
      vehicle_2_model: { value: "Civic" },
    });
    expect(vehicles.map((row) => row.index)).toEqual([1, 2]);
    expect(vehicles[1]).toMatchObject({ vin: "2HGCM82633A004353", make: "Honda", model: "Civic" });
    expect(vehicles[1]?.vin).not.toBe(vehicles[0]?.vin);
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

  it("labels each tab from that form's own insured address, live", () => {
    const instances = [
      { key: "homeowners", productId: "homeowners" as const },
      { key: "landlord", productId: "landlord" as const },
      { key: "homeowners~88uvyj", productId: "homeowners" as const },
    ];
    const legacy = legacyPropertyOwnerKey(instances);
    expect(legacy).toBe("homeowners");
    const homeSheet = {
      address1: { value: "10358 NW 30th TER" },
      property_address: { value: "10358 NW 30th TER, Doral, FL 33172" },
      city: { value: "Doral" },
    };
    const landlordSheet = {
      property_address: { value: "10358 NW 30th TER, Doral, FL 33172" },
    };
    const copySheet = {
      address1: { value: "16021 Northwest 79th Court" },
      city: { value: "Miami" },
    };
    const risks = [{ productKey: null as string | null, address1: "8944 Adriatico Lane", city: "Kissimmee" }];
    const rows = instances.map((instance) => {
      const owns = instanceOwnsSheet(instance, instances);
      const sheet =
        instance.key === "homeowners"
          ? homeSheet
          : instance.key === "landlord"
            ? landlordSheet
            : copySheet;
      const ownRisk = tabRiskForInstance(risks, instance.key, legacy);
      const insured = insuredAddressForProductTab({
        instanceKey: instance.key,
        ownsSheet: owns,
        sheetValues: sheet,
        ownRisk,
      });
      return {
        key: instance.key,
        productId: instance.productId,
        quotingForm: instance.productId === "landlord" ? "DP3" : "HO3",
        address: insured.street,
        city: insured.city,
      };
    });
    const labels = labelProductInstances(rows);
    expect(labels.get("homeowners")).toBe("HO3 8944 Adriatico");
    expect(labels.get("landlord")).toBe("DP3");
    expect(labels.get("homeowners~88uvyj")).toBe("HO3 16021 Northwest 79th");
    expect(labels.get("homeowners")).not.toContain("10358");
    expect(labels.get("landlord")).not.toContain("10358");
    expect(labels.get("landlord")).not.toContain("8944");
    const bare = insuredAddressForProductTab({
      instanceKey: "homeowners",
      ownsSheet: true,
      sheetValues: { property_address: { value: "10358 NW 30th TER" } },
      ownRisk: null,
    });
    expect(bare).toEqual({ street: "", city: "", state: "", zip: "" });
    expect(
      labelProductInstances([{ key: "homeowners", productId: "homeowners", quotingForm: "HO3", address: bare.street }]).get(
        "homeowners",
      ),
    ).toBe("HO3");
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

describe("header addresses follow the active product tab", () => {
  const instances = [
    { key: "homeowners", productId: "homeowners" as const },
    { key: "landlord", productId: "landlord" as const },
    { key: "homeowners~88uvyj", productId: "homeowners" as const },
  ];
  const risks = [
    { productKey: null as string | null, address1: "8944 Adriatico Lane", city: "Kissimmee", state: "FL", zip: "34747" },
    { productKey: "landlord", address1: "10358 Northwest 30th Ter", city: "Doral", state: "FL", zip: "33172" },
  ];
  const homeSheet = {
    address1: { value: "10358 NW 30th TER" },
    property_address: { value: "10358 NW 30th TER, Doral, FL 33172" },
    city: { value: "Doral" },
    state: { value: "FL" },
    zip: { value: "33172" },
    mailing_address: { value: "PO Box 12" },
    mailing_city: { value: "Naples" },
    mailing_state: { value: "FL" },
    mailing_zip: { value: "34102" },
  };
  const landlordSheet = {
    address1: { value: "10358 Northwest 30th Ter" },
    city: { value: "Doral" },
    state: { value: "FL" },
    zip: { value: "33172" },
    property_address: { value: "8944 Adriatico Lane, Kissimmee, FL 34747" },
    mailing_address: { value: "412 Harbor Isle Dr" },
    mailing_city: { value: "Miami" },
    mailing_state: { value: "FL" },
    mailing_zip: { value: "33139" },
  };
  const copySheet = {
    address1: { value: "16021 Northwest 79th Court" },
    city: { value: "Hialeah" },
    state: { value: "FL" },
    zip: { value: "33016" },
    mailing_address: { value: "16021 Northwest 79th Court, Hialeah, FL 33016" },
    mailing_city: { value: "Hialeah" },
    mailing_state: { value: "FL" },
    mailing_zip: { value: "33016" },
  };

  function forTab(key: string) {
    const instance = instances.find((row) => row.key === key)!;
    const sheet = key === "homeowners" ? homeSheet : key === "landlord" ? landlordSheet : copySheet;
    return headerAddressesForProductTab({
      instanceKey: instance.key,
      ownsSheet: instanceOwnsSheet(instance, instances),
      sheetValues: sheet,
      ownRisk: tabRiskForInstance(risks, instance.key, headerRiskOwnerKey(instances)),
    });
  }

  it("reads each tab's own insured and mailing, not the shared oneliner or the first risk", () => {
    expect(headerRiskOwnerKey(instances)).toBe("homeowners");
    const ho3 = forTab("homeowners");
    expect(ho3.insured).toEqual({
      address1: "8944 Adriatico Lane",
      city: "Kissimmee",
      state: "FL",
      zip: "34747",
    });
    expect(ho3.insured.address1).not.toContain("10358");
    expect(ho3.mailing).toEqual({
      address1: "PO Box 12",
      city: "Naples",
      state: "FL",
      zip: "34102",
    });

    const dp3 = forTab("landlord");
    expect(dp3.insured.address1).toBe("10358 Northwest 30th Ter");
    expect(dp3.insured.city).toBe("Doral");
    expect(dp3.insured.address1).not.toContain("8944");
    expect(dp3.mailing.address1).toBe("412 Harbor Isle Dr");
    expect(dp3.mailing.city).toBe("Miami");

    const second = forTab("homeowners~88uvyj");
    expect(second.insured).toEqual({
      address1: "16021 Northwest 79th Court",
      city: "Hialeah",
      state: "FL",
      zip: "33016",
    });
    expect(second.mailing).toEqual({
      address1: "16021 Northwest 79th Court, Hialeah, FL 33016",
      city: "",
      state: "",
      zip: "",
    });
    expect(second.insured.address1).not.toBe(ho3.insured.address1);
    expect(second.mailing.address1).not.toBe(ho3.mailing.address1);
  });

  it("ignores property_address and another tab's sheet when this form has no address1", () => {
    const bare = headerAddressesForProductTab({
      instanceKey: "landlord",
      ownsSheet: true,
      sheetValues: {
        property_address: { value: "10358 NW 30th TER, Doral, FL 33172" },
        mailing_address: { value: "9 Mail St" },
        mailing_city: { value: "Hialeah" },
        mailing_state: { value: "FL" },
        mailing_zip: { value: "33016" },
      },
      ownRisk: null,
    });
    expect(bare.insured.address1).toBe("");
    expect(bare.mailing.address1).toBe("9 Mail St");
  });

  it("reads a shared-sheet sidecar instead of the owner's cells", () => {
    const shared = headerAddressesForProductTab({
      instanceKey: "landlord",
      ownsSheet: false,
      sheetValues: {
        address1: { value: "8944 Adriatico Lane" },
        city: { value: "Kissimmee" },
        state: { value: "FL" },
        zip: { value: "34747" },
        mailing_address: { value: "PO Box 12" },
        "ffpa:landlord:address1": { value: "8662 Northwest 25th St" },
        "ffpa:landlord:city": { value: "Miami" },
        "ffpa:landlord:state": { value: "FL" },
        "ffpa:landlord:zip": { value: "33147" },
        "ffpa:landlord:mailing_address": { value: "1 Owner Home" },
        "ffpa:landlord:mailing_city": { value: "Miami" },
        "ffpa:landlord:mailing_state": { value: "FL" },
        "ffpa:landlord:mailing_zip": { value: "33101" },
      },
      ownRisk: null,
    });
    expect(shared.insured).toEqual({
      address1: "8662 Northwest 25th St",
      city: "Miami",
      state: "FL",
      zip: "33147",
    });
    expect(shared.mailing.address1).toBe("1 Owner Home");
    expect(shared.mailing.city).toBe("Miami");
  });

  it("uses premises, garaging, or the business address on non-home forms", () => {
    const gl = headerAddressesForProductTab({
      instanceKey: "gl",
      ownsSheet: true,
      sheetValues: {
        address1: { value: "10 Dock St" },
        city: { value: "Miami" },
        state: { value: "FL" },
        zip: { value: "33101" },
        mailing_address: { value: "PO Box 9" },
        mailing_city: { value: "Miami" },
        mailing_state: { value: "FL" },
        mailing_zip: { value: "33101" },
      },
      ownRisk: null,
    });
    expect(gl.insured.address1).toBe("10 Dock St");
    expect(gl.mailing.address1).toBe("PO Box 9");

    const premisesOnly = headerAddressesForProductTab({
      instanceKey: "gl",
      ownsSheet: true,
      sheetValues: {
        premises_address: { value: "44 Warehouse Rd" },
        premises_city: { value: "Tampa" },
        premises_state: { value: "FL" },
        premises_zip: { value: "33602" },
      },
      ownRisk: null,
    });
    expect(premisesOnly.insured).toEqual({
      address1: "44 Warehouse Rd",
      city: "Tampa",
      state: "FL",
      zip: "33602",
    });

    const auto = headerAddressesForProductTab({
      instanceKey: "auto",
      ownsSheet: true,
      sheetValues: {
        garaging_address: { value: "500 Garage Rd" },
        garaging_zip: { value: "33172" },
      },
      ownRisk: null,
    });
    expect(auto.insured.address1).toBe("500 Garage Rd");
    expect(auto.insured.zip).toBe("33172");
    expect(auto.mailing.address1).toBe("");

    const businessOnly = headerAddressesForProductTab({
      instanceKey: "gl",
      ownsSheet: true,
      sheetValues: {
        mailing_address: { value: "100 Business Blvd" },
        city: { value: "Miami" },
        state: { value: "FL" },
        zip: { value: "33101" },
        premises_same_as_business: { value: "Yes" },
      },
      ownRisk: null,
    });
    expect(businessOnly.insured).toEqual({
      address1: "100 Business Blvd",
      city: "Miami",
      state: "FL",
      zip: "33101",
    });
    expect(businessOnly.mailing.address1).toBe("100 Business Blvd");
  });

  it("gives an auto-only deal's first tab the unscoped risk and not the next auto tab", () => {
    const autos = [
      { key: "auto", productId: "auto" as const },
      { key: "auto~2", productId: "auto" as const },
    ];
    expect(headerRiskOwnerKey(autos)).toBe("auto");
    const rows = [
      { productKey: null as string | null, address1: "18 Harbor Ct", city: "Miami", state: "FL", zip: "33101" },
    ];
    const first = headerAddressesForProductTab({
      instanceKey: "auto",
      ownsSheet: true,
      sheetValues: {},
      ownRisk: tabRiskForInstance(rows, "auto", headerRiskOwnerKey(autos)),
    });
    const second = headerAddressesForProductTab({
      instanceKey: "auto~2",
      ownsSheet: true,
      sheetValues: { address1: { value: "9 Pine St" }, city: { value: "Orlando" }, state: { value: "FL" }, zip: { value: "32801" } },
      ownRisk: tabRiskForInstance(rows, "auto~2", headerRiskOwnerKey(autos)),
    });
    expect(first.insured.address1).toBe("18 Harbor Ct");
    expect(second.insured.address1).toBe("9 Pine St");
    expect(second.insured.address1).not.toBe(first.insured.address1);
  });

  it("Gloria DP3 reads Deal Details mailing and strips role tags", () => {
    const dp3 = headerAddressesForProductTab({
      instanceKey: "landlord",
      ownsSheet: true,
      dwellingFire: true,
      sheetValues: {
        address1: { value: "10358 NW 30th TER (rental property)" },
        city: { value: "Doral" },
        state: { value: "FL" },
        zip: { value: "33172" },
        mailing_address: { value: "10358 NW 30th TER" },
        mailing_city: { value: "Doral" },
        mailing_state: { value: "FL" },
        mailing_zip: { value: "33172" },
      },
      ownRisk: {
        address1: "16021 NW 79th CT",
        city: "Miami",
        state: "FL",
        zip: "33016",
      },
      dealStored: {
        contact_mailing_address: "16021 NW 79th CT (owner)",
        contact_mailing_city: "Miami",
        contact_mailing_state: "FL",
        contact_mailing_zip: "33016",
      },
    });
    expect(dp3.insured).toEqual({
      address1: "10358 NW 30th TER",
      city: "Doral",
      state: "FL",
      zip: "33172",
    });
    expect(dp3.insured.address1).not.toMatch(/rental/i);
    expect(dp3.mailing).toEqual({
      address1: "16021 NW 79th CT",
      city: "Miami",
      state: "FL",
      zip: "33016",
    });
    expect(dp3.mailing.address1).not.toMatch(/owner/i);
    expect(dp3.mailing.address1).not.toBe(dp3.insured.address1);
  });

  it("keeps an HO3 sheet mailing when Deal Details mailing is shared", () => {
    const ho3 = headerAddressesForProductTab({
      instanceKey: "homeowners",
      ownsSheet: true,
      dwellingFire: false,
      sheetValues: homeSheet,
      ownRisk: tabRiskForInstance(risks, "homeowners", headerRiskOwnerKey(instances)),
      dealStored: {
        contact_mailing_address: "9 Other St",
        contact_mailing_city: "Tampa",
        contact_mailing_state: "FL",
        contact_mailing_zip: "33602",
      },
    });
    expect(ho3.insured.address1).toBe("8944 Adriatico Lane");
    expect(ho3.mailing.address1).toBe("PO Box 12");
    expect(ho3.mailing.address1).not.toBe("9 Other St");
  });

  it("keeps the DP3 sheet mailing when Deal Details mailing is blank", () => {
    const dp3 = headerAddressesForProductTab({
      instanceKey: "landlord",
      ownsSheet: true,
      dwellingFire: true,
      sheetValues: landlordSheet,
      ownRisk: tabRiskForInstance(risks, "landlord", headerRiskOwnerKey(instances)),
      dealStored: { contact_mailing_address: "  " },
    });
    expect(dp3.insured.address1).toBe("10358 Northwest 30th Ter");
    expect(dp3.mailing.address1).toBe("412 Harbor Isle Dr");
  });
});
