import { describe, expect, it } from "vitest";
import { addressFillForKey, isStreetAddressField } from "./keys";
import { formatAddressLine } from "./types";

describe("shared address keys", () => {
  it("treats Address-type and known street keys as the shared control", () => {
    expect(isStreetAddressField("custom_loc", "address")).toBe(true);
    expect(isStreetAddressField("mailing_address", "single_line")).toBe(true);
    expect(isStreetAddressField("address1")).toBe(true);
    expect(isStreetAddressField("first_name", "single_line")).toBe(false);
  });

  it("fills city / state / ZIP siblings from the street key", () => {
    expect(addressFillForKey("mailing_address")).toEqual({
      city: "city",
      state: "state",
      zip: "zip",
      county: "county",
    });
    expect(addressFillForKey("premisesAddress")).toEqual({
      city: "premisesCity",
      state: "premisesState",
      zip: "premisesZip",
    });
    expect(addressFillForKey("garaging_address")).toEqual({ zip: "garaging_zip" });
  });

  it("formats a confirmed line the desk can write back", () => {
    expect(
      formatAddressLine({
        street: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        county: "Brevard",
        country: "US",
      }),
    ).toBe("412 Harbor Isle Dr, Melbourne, FL 32935");
  });
});
