import { describe, expect, it } from "vitest";
import { labelProductInstances } from "@/lib/deals/product-instance-label";
import { headerAddressesForProductTab } from "@/lib/deals/product-property";
import { resolveVisibleProductInstances } from "@/lib/deals/product-instances";
import {
  boundStorageLineForInstance,
  pinPropertyAddresses,
  propertyRiskWriteTarget,
  propertyStreetsMatch,
  quotingFormForProductSheet,
} from "@/lib/deals/product-address-pin";

/**
 * Gloria Martinez — three products, three insured locations.
 * The plain `home` line holds the DP3 dec (10358 Doral). The HO3 at 16021
 * is the `~88uvyj` copy. Deal insured is the third street (8944 Adriatico).
 * DP3 mailing may be 16021; that must not become either product's insured address.
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

  it("pins HO3 at 16021, DP3 at 10358, and the other HO3 off both", () => {
    const pins = pinPropertyAddresses({
      instances: gloriaInstances,
      sheets: gloriaSheets,
      risks: gloriaRisks,
      storedDeal: gloriaStored,
    });
    const ho3 = pins.get("homeowners")!.address;
    const dp3 = pins.get("landlord")!.address;
    const ho3Copy = pins.get("homeowners~88uvyj")!.address;

    expect(ho3Copy.street).toMatch(/16021/i);
    expect(ho3Copy.city).toBe("Miami Lakes");
    expect(dp3.street).toMatch(/10358/i);
    expect(dp3.city).toBe("Doral");
    expect(ho3.street).toMatch(/8944/);
    expect(ho3.city).toBe("Kissimmee");

    expect(propertyStreetsMatch(ho3.street, dp3.street)).toBe(false);
    expect(propertyStreetsMatch(ho3.street, ho3Copy.street)).toBe(false);
    expect(propertyStreetsMatch(dp3.street, ho3Copy.street)).toBe(false);
    expect(dp3.street).not.toMatch(/16021/);
    expect(ho3.street).not.toMatch(/16021/);
    expect(ho3.street).not.toMatch(/10358/);
    expect(ho3Copy.street).not.toMatch(/10358/);

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
    expect(labels.get("homeowners")).toBe("HO3 8944 Adriatico");
    expect(labels.get("landlord")).toMatch(/^DP3 10358 Northwest 30th/);
    expect(labels.get("homeowners~88uvyj")).toBe("HO3 16021 Northwest 79th");
  });

  it("reads the DP3 dec on the landlord tab and keeps 16021 as mailing only", () => {
    const landlord = gloriaInstances.find((row) => row.key === "landlord")!;
    expect(boundStorageLineForInstance(landlord, gloriaInstances, gloriaSheets)).toBe("home");
    const homeowners = gloriaInstances.find((row) => row.key === "homeowners")!;
    expect(boundStorageLineForInstance(homeowners, gloriaInstances, gloriaSheets)).toBe("home~homeowners");
    expect(quotingFormForProductSheet("landlord", gloriaSheets[0]!.values)).toBe("DP3");
    expect(quotingFormForProductSheet("homeowners", gloriaSheets[0]!.values)).toBeNull();

    const pins = pinPropertyAddresses({
      instances: gloriaInstances,
      sheets: gloriaSheets,
      risks: gloriaRisks,
      storedDeal: gloriaStored,
    });
    const dp3 = pins.get("landlord")!.address;
    const header = headerAddressesForProductTab({
      instanceKey: "landlord",
      ownsSheet: true,
      dwellingFire: true,
      sheetValues: gloriaSheets[0]!.values,
      ownRisk: dp3,
      dealStored: gloriaStored,
    });
    expect(header.insured.address1).toMatch(/10358/);
    expect(header.insured.address1).not.toMatch(/16021/);
    expect(header.mailing.address1).toMatch(/16021/);
    expect(header.mailing.address1).not.toBe(header.insured.address1);
  });

  it("writes the DP3 home line onto landlord and does not reuse the null risk for the other HO3", () => {
    const target = propertyRiskWriteTarget({
      instances: gloriaInstances,
      storageLine: "home",
      values: gloriaSheets[0]!.values,
    });
    expect(target).toEqual({
      instanceKey: "landlord",
      claimMatchingUnscoped: true,
      preserveUnscoped: true,
    });
    const ho3Sheet = propertyRiskWriteTarget({
      instances: gloriaInstances,
      storageLine: "home~homeowners",
      values: {
        quoting_form: { value: "HO3" },
        address1: { value: "8944 Adriatico Lane" },
        city: { value: "Kissimmee" },
      },
    });
    expect(ho3Sheet).toEqual({
      instanceKey: "homeowners",
      claimMatchingUnscoped: false,
      preserveUnscoped: true,
    });
    const copy = propertyRiskWriteTarget({
      instances: gloriaInstances,
      storageLine: "home~homeowners~88uvyj",
      values: gloriaSheets[2]!.values,
    });
    expect(copy?.instanceKey).toBe("homeowners~88uvyj");
    expect(copy?.claimMatchingUnscoped).toBe(false);
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
