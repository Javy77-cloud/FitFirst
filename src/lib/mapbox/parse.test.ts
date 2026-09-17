import { describe, expect, it } from "vitest";
import { parsedAddressFromMapbox, parseMapboxSuggestPayload } from "./parse";

const HARBOR = {
  id: "address.412",
  place_name: "412 Harbor Isle Dr, Melbourne, Florida 32935, United States",
  address: "412",
  text: "Harbor Isle Dr",
  context: [
    { id: "postcode.1", text: "32935" },
    { id: "place.1", text: "Melbourne" },
    { id: "district.1", text: "Brevard County" },
    { id: "region.1", short_code: "US-FL", text: "Florida" },
  ],
};

describe("Mapbox geocode parse", () => {
  it("maps a v5 Harbor Isle feature onto street / city / state / ZIP / county", () => {
    expect(parsedAddressFromMapbox(HARBOR)).toEqual({
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      county: "Brevard",
      country: "US",
    });
  });

  it("reads Geocoding v6 context properties when v5 context is missing", () => {
    const parsed = parsedAddressFromMapbox({
      properties: {
        name: "88 Harbor Key Blvd",
        address_number: "88",
        street: "Harbor Key Blvd",
        full_address: "88 Harbor Key Blvd, Palm Bay, Florida 32907, United States",
        context: {
          place: { name: "Palm Bay" },
          region: { name: "Florida", region_code: "FL" },
          postcode: { name: "32907" },
          district: { name: "Brevard County" },
        },
      },
    });
    expect(parsed.street).toBe("88 Harbor Key Blvd");
    expect(parsed.city).toBe("Palm Bay");
    expect(parsed.state).toBe("FL");
    expect(parsed.zip).toBe("32907");
  });

  it("returns suggestions from features and skips empty rows", () => {
    const suggestions = parseMapboxSuggestPayload({
      features: [HARBOR, { place_name: "" }, null],
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.label).toContain("Harbor Isle");
    expect(suggestions[0]?.address.zip).toBe("32935");
  });

  it("returns blanks when Mapbox sends nothing", () => {
    expect(parseMapboxSuggestPayload({})).toEqual([]);
    expect(parsedAddressFromMapbox(undefined).street).toBe("");
  });
});
