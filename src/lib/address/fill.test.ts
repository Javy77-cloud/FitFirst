import { describe, expect, it } from "vitest";
import { layoutKeyFromControlName, mergeParsedAddress, siblingPatchFromAddress } from "./fill";
import { addressFillNames } from "./keys";

describe("address fill helpers", () => {
  it("strips deal-details field_ prefixes", () => {
    expect(layoutKeyFromControlName("field_city")).toBe("city");
    expect(layoutKeyFromControlName("field_contact_mailing_zip")).toBe("contact_mailing_zip");
    expect(layoutKeyFromControlName("city")).toBe("city");
  });

  it("merges a Mapbox label when structured city/state/ZIP are blank", () => {
    expect(
      mergeParsedAddress(
        { street: "412 Harbor Isle Dr", city: "", state: "", zip: "", county: "", country: "US" },
        "412 Harbor Isle Dr, Melbourne, Florida 32935, United States",
      ),
    ).toEqual({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "",
      country: "US",
    });
  });

  it("keeps structured Mapbox parts when present", () => {
    expect(
      mergeParsedAddress(
        {
          street: "88 Harbor Key Blvd",
          city: "Palm Bay",
          state: "FL",
          zip: "32907",
          county: "Brevard",
          country: "US",
        },
        "88 Harbor Key Blvd, Palm Bay, Florida 32907, United States",
      ),
    ).toMatchObject({ city: "Palm Bay", state: "FL", zip: "32907", county: "Brevard" });
  });

  it("patches insured vs mailing siblings onto separate layout keys", () => {
    const address = {
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "Brevard",
      country: "US",
    };
    expect(
      siblingPatchFromAddress(
        addressFillNames("mailing_address", "field_mailing_address"),
        address,
        "field_mailing_address",
      ),
    ).toEqual({
      mailing_address: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "Brevard",
    });
    expect(
      siblingPatchFromAddress(
        addressFillNames("contact_mailing_address", "field_contact_mailing_address"),
        address,
        "field_contact_mailing_address",
      ),
    ).toEqual({
      contact_mailing_address: "412 Harbor Isle Dr",
      contact_mailing_city: "Melbourne",
      contact_mailing_state: "FL",
      contact_mailing_zip: "32935",
      contact_mailing_county: "Brevard",
    });
  });
});
