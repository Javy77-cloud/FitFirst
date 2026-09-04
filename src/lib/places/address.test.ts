import { describe, expect, it } from "vitest";
import { parseGoogleAddressComponents } from "./address";

const HARBOR_ISLE = [
  { long_name: "412", short_name: "412", types: ["street_number"] },
  { long_name: "Harbor Isle Drive", short_name: "Harbor Isle Dr", types: ["route"] },
  { long_name: "Melbourne", short_name: "Melbourne", types: ["locality", "political"] },
  { long_name: "Brevard County", short_name: "Brevard County", types: ["administrative_area_level_2", "political"] },
  { long_name: "Florida", short_name: "FL", types: ["administrative_area_level_1", "political"] },
  { long_name: "32935", short_name: "32935", types: ["postal_code"] },
];

describe("parseGoogleAddressComponents", () => {
  it("splits a Melbourne HO premises into street, city, FL, ZIP, county", () => {
    expect(parseGoogleAddressComponents(HARBOR_ISLE)).toEqual({
      street: "412 Harbor Isle Drive",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "Brevard",
    });
  });

  it("falls back to postal_town when locality is missing", () => {
    const parsed = parseGoogleAddressComponents([
      { long_name: "88", short_name: "88", types: ["street_number"] },
      { long_name: "Harbor Key Blvd", short_name: "Harbor Key Blvd", types: ["route"] },
      { long_name: "Palm Bay", short_name: "Palm Bay", types: ["postal_town"] },
      { long_name: "Florida", short_name: "FL", types: ["administrative_area_level_1"] },
      { long_name: "32907", short_name: "32907", types: ["postal_code"] },
    ]);
    expect(parsed.street).toBe("88 Harbor Key Blvd");
    expect(parsed.city).toBe("Palm Bay");
    expect(parsed.zip).toBe("32907");
  });

  it("returns blanks when Google sends nothing", () => {
    expect(parseGoogleAddressComponents([])).toEqual({
      street: "",
      city: "",
      state: "",
      zip: "",
      county: "",
    });
    expect(parseGoogleAddressComponents(undefined)).toEqual({
      street: "",
      city: "",
      state: "",
      zip: "",
      county: "",
    });
  });
});
