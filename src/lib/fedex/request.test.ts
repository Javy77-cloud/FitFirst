import { describe, expect, it } from "vitest";
import {
  classifyFedExHttpStatus,
  fedexResolveRequestAddress,
  streetLinesForFedEx,
} from "./request";

describe("FedEx resolve request shape", () => {
  it("sends a Mapbox US fill as streetLines + 2-letter state + countryCode US", () => {
    expect(
      fedexResolveRequestAddress({
        street: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        county: "Brevard",
        country: "US",
      }),
    ).toEqual({
      streetLines: ["412 Harbor Isle Dr"],
      city: "Melbourne",
      stateOrProvinceCode: "FL",
      postalCode: "32935",
      countryCode: "US",
    });
    expect(
      fedexResolveRequestAddress({
        street: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "Florida",
        zip: "32935-1234",
        county: "",
        country: "United States",
      }),
    ).toMatchObject({
      stateOrProvinceCode: "FL",
      postalCode: "32935-1234",
      countryCode: "US",
    });
  });

  it("splits a unit onto a second street line", () => {
    expect(streetLinesForFedEx("412 Harbor Isle Dr Apt 2")).toEqual(["412 Harbor Isle Dr", "Apt 2"]);
    expect(streetLinesForFedEx("412 Harbor Isle Dr", "Unit 4")).toEqual([
      "412 Harbor Isle Dr",
      "Unit 4",
    ]);
  });

  it("does not treat auth or 5xx as an unmatched address", () => {
    expect(classifyFedExHttpStatus(200)).toBe("ok");
    expect(classifyFedExHttpStatus(401)).toBe("auth");
    expect(classifyFedExHttpStatus(403)).toBe("auth");
    expect(classifyFedExHttpStatus(400)).toBe("unmatched");
    expect(classifyFedExHttpStatus(500)).toBe("transport");
    expect(classifyFedExHttpStatus(503)).toBe("transport");
  });
});
