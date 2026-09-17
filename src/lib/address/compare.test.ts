import { describe, expect, it } from "vitest";
import { addressFingerprint, addressesMatch, parseAddressLine } from "./compare";

describe("address compare", () => {
  it("treats St vs Street as the same premises", () => {
    expect(
      addressesMatch(
        {
          street: "412 Harbor Isle Drive",
          city: "Melbourne",
          state: "FL",
          zip: "32935",
          county: "",
          country: "US",
        },
        {
          street: "412 Harbor Isle Dr",
          city: "melbourne",
          state: "fl",
          zip: "32935-1234",
          county: "Brevard",
          country: "US",
        },
      ),
    ).toBe(true);
    expect(
      addressFingerprint({
        street: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        county: "",
        country: "US",
      }),
    ).toContain("harbor isle");
  });

  it("parses a composed one-line address", () => {
    expect(parseAddressLine("412 Harbor Isle Dr, Melbourne, FL 32935")).toEqual({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "",
      country: "US",
    });
  });

  it("parses a Mapbox place_name with a full state name", () => {
    expect(parseAddressLine("412 Harbor Isle Dr, Melbourne, Florida 32935, United States")).toEqual({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "",
      country: "US",
    });
  });
});
