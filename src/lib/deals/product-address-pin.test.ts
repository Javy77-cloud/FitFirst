import { describe, expect, it } from "vitest";
import { labelProductInstances } from "@/lib/deals/product-instance-label";
import { headerAddressesForProductTab } from "@/lib/deals/product-property";
import { resolveVisibleProductInstances } from "@/lib/deals/product-instances";
import {
  boundStorageLineForInstance,
  dealDetailsStoredAddresses,
  headerSheetForPinnedAddress,
  headerWithSplitInsuredAddress,
  mayInsertSeparatePropertyRisk,
  pinPropertyAddresses,
  propertyRiskWriteTarget,
  propertyStreetsMatch,
  quotingFormForProductSheet,
  sheetWithProductInsuredAddress,
} from "@/lib/deals/product-address-pin";
import { quoteMatchesDealProduct } from "@/lib/deals/shop-flow";

/**
 * Gloria Martinez — three products, three locations, no shared insured street.
 * The HO3 that owns `home` keeps its risk at 10358 Doral. Its insured
 * address (header + Deal Details) is 8944 Adriatico — not 10358 and not
 * 16021. The `~88uvyj` HO3 stays at 16021. The landlord sheet is only a
 * Deal address copy of 10358, so it is not a second pin of that building.
 */
const gloriaInstances = resolveVisibleProductInstances({
  shopProducts: ["homeowners", "landlord", "homeowners~88uvyj"],
});

const gloriaSheets = [
  {
    line: "home",
    values: {
      form: { value: "DP3" },
      quoting_form: { value: "HO3" },
      address1: { value: "10358 NW 30th TER" },
      city: { value: "Doral" },
      state: { value: "FL" },
      zip: { value: "33172" },
      mailing_address: { value: "16021 NW 79Th CT" },
      mailing_city: { value: "Miami" },
      occupancy: { value: "Tenant" },
      coverage_a: { value: "309000" },
    },
  },
  {
    line: "home~landlord",
    values: {
      quoting_form: { value: "DP3" },
      address1: { value: "10358 Northwest 30th Terrace" },
      city: { value: "Doral" },
      state: { value: "FL" },
      zip: { value: "33172" },
    },
  },
  {
    line: "home~homeowners~88uvyj",
    values: {
      quoting_form: { value: "HO3" },
      address1: { value: "16021 Northwest 79th Court" },
      city: { value: "Miami Lakes" },
      state: { value: "FL" },
      zip: { value: "33016" },
      occupancy: { value: "Owner" },
      coverage_a: { value: "533000" },
    },
  },
];

const gloriaRisks = [
  {
    productKey: null as string | null,
    address1: "10358 NW 30th TER",
    city: "Doral",
    state: "FL",
    zip: "33172",
  },
  {
    productKey: "homeowners~88uvyj",
    address1: "16021 Northwest 79th Court",
    city: "Miami Lakes",
    state: "FL",
    zip: "33016",
  },
];

const gloriaStored = {
  mailing_address: "8944 Adriatico Lane",
  city: "Kissimmee",
  state: "FL",
  zip: "34747",
  county: "Osceola",
  contact_mailing_address: "16021 Northwest 79th Court",
  contact_mailing_city: "Miami Lakes",
  contact_mailing_state: "FL",
  contact_mailing_zip: "33016",
};

describe("Gloria product address pins", () => {
  it("treats NW / Northwest and Ter / Terrace as one street", () => {
    expect(propertyStreetsMatch("10358 NW 30th TER", "10358 Northwest 30th Terrace")).toBe(true);
    expect(propertyStreetsMatch("16021 NW 79Th CT", "16021 Northwest 79th Court")).toBe(true);
    expect(propertyStreetsMatch("8944 Adriatico Lane", "16021 Northwest 79th Court")).toBe(false);
    expect(propertyStreetsMatch("10358 NW 30th TER", "16021 NW 79th CT")).toBe(false);
  });

  it("pins the deal HO3 at 10358, the copy at 16021, and does not reuse 10358 for DP3", () => {
    const pins = pinPropertyAddresses({
      instances: gloriaInstances,
      sheets: gloriaSheets,
      risks: gloriaRisks,
      storedDeal: gloriaStored,
    });
    const ho3 = pins.get("homeowners")!.address;
    const dp3 = pins.get("landlord")!.address;
    const ho3Copy = pins.get("homeowners~88uvyj")!.address;

    expect(ho3.street).toMatch(/10358/i);
    expect(ho3.city).toBe("Doral");
    expect(ho3.zip).toBe("33172");
    expect(ho3Copy.street).toMatch(/16021/i);
    expect(ho3Copy.city).toBe("Miami Lakes");
    expect(ho3Copy.zip).toBe("33016");
    expect(dp3.street).toBe("");

    expect(propertyStreetsMatch(ho3.street, dp3.street)).toBe(false);
    expect(propertyStreetsMatch(ho3.street, ho3Copy.street)).toBe(false);
    expect(ho3.street).not.toMatch(/16021|8944/);
    expect(ho3Copy.street).not.toMatch(/10358|8944/);

    const labels = labelProductInstances(
      gloriaInstances.map((instance) => {
        const pin = pins.get(instance.key)!;
        return {
          key: instance.key,
          productId: instance.productId,
          quotingForm: instance.productId === "landlord" ? "DP3" : "HO3",
          address: pin.address.street,
          city: pin.address.city,
        };
      }),
    );
    expect(labels.get("homeowners")).toBe("HO3 10358 Northwest 30th");
    expect(labels.get("landlord")).toBe("DP3");
    expect(labels.get("homeowners~88uvyj")).toBe("HO3 16021 Northwest 79th");
  });

  it("keeps the HO3 tab on the home line and leaves 16021 quotes on the copy", () => {
    const landlord = gloriaInstances.find((row) => row.key === "landlord")!;
    const homeowners = gloriaInstances.find((row) => row.key === "homeowners")!;
    expect(boundStorageLineForInstance(homeowners, gloriaInstances, gloriaSheets)).toBe("home");
    expect(boundStorageLineForInstance(landlord, gloriaInstances, gloriaSheets)).toBe("home~landlord");
    expect(quotingFormForProductSheet("homeowners", gloriaSheets[0]!.values)).toBeNull();
    expect(quotingFormForProductSheet("landlord", gloriaSheets[1]!.values)).toBe("DP3");

    const pins = pinPropertyAddresses({
      instances: gloriaInstances,
      sheets: gloriaSheets,
      risks: gloriaRisks,
      storedDeal: gloriaStored,
    });
    const headerSheet = headerSheetForPinnedAddress(gloriaSheets[1]!.values, pins.get("landlord"));
    const header = headerAddressesForProductTab({
      instanceKey: "landlord",
      ownsSheet: true,
      dwellingFire: true,
      sheetValues: headerSheet,
      ownRisk: pins.get("landlord")!.address,
      dealStored: gloriaStored,
    });
    expect(header.insured.address1).toBe("");
    expect(header.insured.address1).not.toMatch(/10358|16021/);
    expect(header.mailing.address1).toMatch(/16021/);

    const copyNotes = "HO3 product 803-16021 [[ff-instance:homeowners~88uvyj]]";
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home~homeowners~88uvyj", notes: copyNotes },
        "homeowners~88uvyj",
        { splitHomeProducts: true },
      ),
    ).toBe(true);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home~homeowners~88uvyj", notes: copyNotes },
        "homeowners",
        { splitHomeProducts: true },
      ),
    ).toBe(false);
    expect(
      quoteMatchesDealProduct(
        { shopLine: "home~homeowners~88uvyj", notes: copyNotes },
        "landlord",
        { splitHomeProducts: true },
      ),
    ).toBe(false);
  });

  it("writes the home line onto the HO3 risk and does not clone it onto DP3", () => {
    const target = propertyRiskWriteTarget({
      instances: gloriaInstances,
      storageLine: "home",
      values: gloriaSheets[0]!.values,
    });
    expect(target).toEqual({
      instanceKey: "homeowners",
      claimMatchingUnscoped: false,
      preserveUnscoped: false,
    });
    expect(
      mayInsertSeparatePropertyRisk({
        instanceKey: "landlord",
        legacyOwnerKey: "homeowners",
        addressStreet: "10358 Northwest 30th Terrace",
        unscopedStreet: "10358 NW 30th TER",
      }),
    ).toBe(false);
    expect(
      mayInsertSeparatePropertyRisk({
        instanceKey: "homeowners~88uvyj",
        legacyOwnerKey: "homeowners",
        addressStreet: "16021 Northwest 79th Court",
        unscopedStreet: "10358 NW 30th TER",
      }),
    ).toBe(true);
  });

  it("shows 8944 as the Doral HO3 insured address and leaves the 16021 copy alone", () => {
    const pins = pinPropertyAddresses({
      instances: gloriaInstances,
      sheets: gloriaSheets,
      risks: gloriaRisks,
      storedDeal: gloriaStored,
    });
    const location = pins.get("homeowners")!.address;
    expect(location.street).toMatch(/10358/i);
    expect(location.city).toBe("Doral");

    const raw = headerAddressesForProductTab({
      instanceKey: "homeowners",
      ownsSheet: true,
      dwellingFire: false,
      sheetValues: gloriaSheets[0]!.values,
      ownRisk: location,
      dealStored: gloriaStored,
    });
    expect(raw.insured.address1).toMatch(/10358/);
    const header = headerWithSplitInsuredAddress({
      instanceKey: "homeowners",
      legacyOwnerKey: "homeowners",
      locationStreet: location.street,
      dealStored: gloriaStored,
      header: raw,
    });
    expect(header.insured).toEqual({
      address1: "8944 Adriatico Lane",
      city: "Kissimmee",
      state: "FL",
      zip: "34747",
    });
    expect(header.insured.address1).not.toMatch(/10358|16021/);
    expect(header.mailing.address1).toMatch(/16021/);

    const shown = sheetWithProductInsuredAddress(
      {
        ...gloriaSheets[0]!.values,
        applicant_address: { value: "16021 NW 79Th CT" },
        address1: gloriaSheets[0]!.values.address1,
      },
      {
        instanceKey: "homeowners",
        legacyOwnerKey: "homeowners",
        locationStreet: location.street,
        dealStored: gloriaStored,
      },
    );
    expect(shown?.address1?.value).toMatch(/10358/);
    expect(shown?.mailing_address?.value).toMatch(/16021/);
    expect(shown?.applicant_address?.value).toBe("8944 Adriatico Lane");

    const copy = headerWithSplitInsuredAddress({
      instanceKey: "homeowners~88uvyj",
      legacyOwnerKey: "homeowners",
      locationStreet: pins.get("homeowners~88uvyj")!.address.street,
      dealStored: gloriaStored,
      header: headerAddressesForProductTab({
        instanceKey: "homeowners~88uvyj",
        ownsSheet: true,
        sheetValues: gloriaSheets[2]!.values,
        ownRisk: pins.get("homeowners~88uvyj")!.address,
        dealStored: gloriaStored,
      }),
    });
    expect(copy.insured.address1).toMatch(/16021/);
    expect(copy.insured.address1).not.toMatch(/8944|10358/);
    const copySheet = sheetWithProductInsuredAddress(gloriaSheets[2]!.values, {
      instanceKey: "homeowners~88uvyj",
      legacyOwnerKey: "homeowners",
      locationStreet: pins.get("homeowners~88uvyj")!.address.street,
      dealStored: gloriaStored,
    });
    expect(copySheet?.address1?.value).toMatch(/16021/);
    expect(copySheet?.applicant_address?.value).toBeUndefined();

    const dp3 = headerWithSplitInsuredAddress({
      instanceKey: "landlord",
      legacyOwnerKey: "homeowners",
      locationStreet: pins.get("landlord")!.address.street,
      dealStored: gloriaStored,
      header: {
        insured: { address1: "", city: "", state: "", zip: "" },
        mailing: { address1: "16021 Northwest 79th Court", city: "Miami Lakes", state: "FL", zip: "33016" },
      },
    });
    expect(dp3.insured.address1).toBe("");
    expect(dp3.insured.address1).not.toMatch(/8944|10358|16021/);
  });

  it("keeps Deal Details insured at 8944 and does not confirm it as 16021", () => {
    const details = dealDetailsStoredAddresses({
      ...gloriaStored,
      mailing_same_as_insured: "true",
      mailing_address__verify:
        '{"status":"confirmed","fingerprint":"16021 northwest 79th ct|miami lakes|FL|33016"}',
    });
    expect(details.mailing_address).toBe("8944 Adriatico Lane");
    expect(details.city).toBe("Kissimmee");
    expect(details.zip).toBe("34747");
    expect(details.mailing_address).not.toMatch(/16021/);
    expect(details.mailing_same_as_insured).toBe("false");
    expect(details.mailing_address__verify).toBeUndefined();
    expect(details.contact_mailing_address).toMatch(/16021/);
  });

  it("still lets the first product keep an unscoped risk when the home line is its own form", () => {
    const instances = resolveVisibleProductInstances({
      shopProducts: ["homeowners", "landlord", "homeowners~88uvyj"],
    });
    const sheets = [
      { line: "home", values: { address1: { value: "10358 NW 30th TER" }, quoting_form: { value: "HO3" } } },
      { line: "home~landlord", values: { property_address: { value: "10358 NW 30th TER, Doral, FL 33172" } } },
      { line: "home~homeowners~88uvyj", values: { address1: { value: "16021 Northwest 79th Court" } } },
    ];
    const pins = pinPropertyAddresses({
      instances,
      sheets,
      risks: [{ productKey: null, address1: "8944 Adriatico Lane", city: "Kissimmee" }],
    });
    expect(pins.get("homeowners")?.address.street).toBe("8944 Adriatico Lane");
    expect(pins.get("landlord")?.address.street).toBe("");
    expect(pins.get("homeowners~88uvyj")?.address.street).toMatch(/16021/);
    expect(
      propertyRiskWriteTarget({
        instances,
        storageLine: "home",
        values: sheets[0]!.values,
      }),
    ).toMatchObject({ instanceKey: "homeowners", claimMatchingUnscoped: false, preserveUnscoped: false });
  });
});
