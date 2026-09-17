import { describe, expect, it } from "vitest";
import { parseFedExResolvePayload, parsedAddressFromFedEx } from "./parse";

const HARBOR = {
  streetLinesAddress: { streetLines: ["412 Harbor Isle Dr"] },
  city: "Melbourne",
  stateOrProvinceCode: "FL",
  postalCode: "32935",
  countryCode: "US",
  county: "Brevard County",
};

describe("FedEx address resolve parse", () => {
  it("maps a resolved Harbor Isle row onto street / city / state / ZIP / county", () => {
    expect(parsedAddressFromFedEx(HARBOR)).toEqual({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "Brevard",
      country: "US",
    });
  });

  it("reads top-level streetLines when streetLinesAddress is missing", () => {
    const parsed = parsedAddressFromFedEx({
      streetLines: ["88 Harbor Key Blvd"],
      city: "Palm Bay",
      stateOrProvinceCode: "FL",
      postalCode: "32907",
    });
    expect(parsed.street).toBe("88 Harbor Key Blvd");
    expect(parsed.city).toBe("Palm Bay");
    expect(parsed.zip).toBe("32907");
  });

  it("returns suggestions from output.resolvedAddresses and skips empty rows", () => {
    const suggestions = parseFedExResolvePayload({
      output: {
        resolvedAddresses: [HARBOR, { city: "" }, null],
      },
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.label).toBe("412 Harbor Isle Dr, Melbourne, FL 32935");
    expect(suggestions[0]?.address.state).toBe("FL");
  });

  it("returns blanks when FedEx sends nothing", () => {
    expect(parseFedExResolvePayload({})).toEqual([]);
    expect(parsedAddressFromFedEx(undefined).street).toBe("");
  });

  it("reads streetLinesToken and nested resolvedAddress from production-shaped payloads", () => {
    expect(
      parsedAddressFromFedEx({
        streetLinesToken: ["412 Harbor Isle Dr"],
        city: "Melbourne",
        stateOrProvinceCode: "FL",
        postalCode: "32935",
        countryCode: "US",
      }).street,
    ).toBe("412 Harbor Isle Dr");
    expect(
      parsedAddressFromFedEx({
        resolvedAddress: {
          streetLines: ["88 Harbor Key Blvd"],
          city: "Palm Bay",
          stateOrProvinceCode: "FL",
          postalCode: "32907",
          countryCode: "US",
        },
      }),
    ).toMatchObject({ street: "88 Harbor Key Blvd", city: "Palm Bay", zip: "32907" });
  });
});
