import { describe, expect, it } from "vitest";
import {
  formatMilesToCoast,
  haversineMiles,
  milesToNearestCoast,
} from "./miles-to-coast";

/** Miami Beach oceanfront — should be near 0 miles to Atlantic shore. */
const MIAMI_BEACH = { lat: 25.7907, lng: -80.13 };

/** Downtown Orlando — well inland from either coast. */
const ORLANDO = { lat: 28.5383, lng: -81.3792 };

describe("miles-to-coast helper", () => {
  it("haversine matches a known short Florida hop (~1° lat ≈ 69 mi)", () => {
    const a = { lat: 26.0, lng: -81.8 };
    const b = { lat: 27.0, lng: -81.8 };
    const miles = haversineMiles(a, b);
    expect(miles).toBeGreaterThan(68);
    expect(miles).toBeLessThan(70.5);
  });

  it("coastal Miami Beach is under 3 miles to coastline", () => {
    const miles = milesToNearestCoast(MIAMI_BEACH);
    expect(Number.isFinite(miles)).toBe(true);
    expect(miles).toBeLessThan(3);
    expect(miles).toBeGreaterThanOrEqual(0);
  });

  it("inland Orlando is at least 30 miles from coastline", () => {
    const miles = milesToNearestCoast(ORLANDO);
    expect(miles).toBeGreaterThan(30);
  });

  it("formats to 1 decimal mile", () => {
    expect(formatMilesToCoast(15.24)).toBe("15.2");
    expect(formatMilesToCoast(15)).toBe("15.0");
    expect(formatMilesToCoast(Number.POSITIVE_INFINITY)).toBe("");
  });
});
