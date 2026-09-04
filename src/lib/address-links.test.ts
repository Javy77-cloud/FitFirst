import { describe, expect, it } from "vitest";
import {
  femaFloodMapUrl,
  formatPropertyAddress,
  propertyAddressLinks,
  zillowHomesUrl,
} from "./address-links";

const ana = {
  address1: "1098 Adige Ct SE",
  city: "Palm Bay",
  state: "FL",
  zip: "32909",
};

const formatted = "1098 Adige Ct SE, Palm Bay, FL 32909";

describe("property address public links", () => {
  it("formats Ana Dib Palm Bay as street, city, state ZIP", () => {
    expect(formatPropertyAddress(ana)).toBe(formatted);
  });

  it("builds a Zillow homes search URL from the street address", () => {
    expect(zillowHomesUrl(formatted)).toBe(
      `https://www.zillow.com/homes/${encodeURIComponent(formatted)}_rb/`,
    );
  });

  it("builds a FEMA MSC flood-map search URL from the street address", () => {
    expect(femaFloodMapUrl(formatted)).toBe(
      `https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(formatted)}`,
    );
  });

  it("returns both public links for Ana and nothing when the street is empty", () => {
    const links = propertyAddressLinks(ana);
    expect(links?.formatted).toBe(formatted);
    expect(links?.zillow).toContain("zillow.com/homes/");
    expect(links?.femaFlood).toContain("msc.fema.gov/portal/search?AddressQuery=");
    expect(propertyAddressLinks({ address1: "  ", city: "Palm Bay", state: "FL" })).toBeNull();
    expect(propertyAddressLinks({})).toBeNull();
  });
});
