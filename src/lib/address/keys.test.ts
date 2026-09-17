import { describe, expect, it } from "vitest";
import { addressFillForKey, addressFillNames, isStreetAddressField, qualifyAddressFill } from "./keys";
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
    expect(addressFillForKey("field_mailing_address")).toEqual({
      city: "city",
      state: "state",
      zip: "zip",
      county: "county",
    });
    expect(addressFillForKey("previous_address")).toEqual({
      city: "previous_city",
      state: "previous_state",
      zip: "previous_zip",
    });
  });

  it("qualifies deal-details field_ sibling names so Mapbox can fill city/state/ZIP", () => {
    expect(qualifyAddressFill(addressFillForKey("mailing_address"), "field_mailing_address")).toEqual({
      city: "field_city",
      state: "field_state",
      zip: "field_zip",
      county: "field_county",
    });
    expect(addressFillNames("contact_mailing_address", "field_contact_mailing_address")).toEqual({
      city: "field_contact_mailing_city",
      state: "field_contact_mailing_state",
      zip: "field_contact_mailing_zip",
      county: "field_contact_mailing_county",
    });
    expect(isStreetAddressField("field_mailing_address")).toBe(true);
    expect(isStreetAddressField("applicant_address")).toBe(true);
    expect(qualifyAddressFill(addressFillNames("mailing_address", "field_mailing_address"), "field_mailing_address")).toEqual({
      city: "field_city",
      state: "field_state",
      zip: "field_zip",
      county: "field_county",
    });
  });

  it("prefers section siblings so mailing does not write insured city/state/ZIP", () => {
    const mixed = [
      "mailing_address",
      "city",
      "state",
      "zip",
      "contact_mailing_address",
      "contact_mailing_city",
      "contact_mailing_state",
      "contact_mailing_zip",
    ];
    expect(addressFillNames("mailing_address", "field_mailing_address", mixed)).toEqual({
      city: "field_city",
      state: "field_state",
      zip: "field_zip",
      county: "field_county",
    });
    expect(addressFillNames("contact_mailing_address", "field_contact_mailing_address", mixed)).toEqual({
      city: "field_contact_mailing_city",
      state: "field_contact_mailing_state",
      zip: "field_contact_mailing_zip",
      county: "field_contact_mailing_county",
    });
    expect(
      addressFillNames("property_street", "field_property_street", [
        "property_street",
        "insured_city",
        "insured_state",
        "insured_zip",
      ]),
    ).toEqual({
      city: "field_insured_city",
      state: "field_insured_state",
      zip: "field_insured_zip",
      county: "field_county",
    });
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
