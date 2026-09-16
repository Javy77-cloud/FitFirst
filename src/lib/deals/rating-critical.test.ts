import { describe, expect, it } from "vitest";
import {
  filledKeysAreRatingCritical,
  ratingCriticalChanged,
  ratingCriticalFingerprint,
} from "./rating-critical";

describe("rating-critical sheet fields", () => {
  it("fingerprints Cov A / year / roof / claims and ignores address-only edits", () => {
    const before = {
      coverage_a: { value: "310000" },
      year_built: { value: "1998" },
      insured_address: { value: "12 Oak" },
    };
    const afterAddress = {
      coverage_a: { value: "310000" },
      year_built: { value: "1998" },
      insured_address: { value: "88 Pine" },
    };
    const afterCovA = {
      coverage_a: { value: "425000" },
      year_built: { value: "1998" },
      insured_address: { value: "12 Oak" },
    };
    expect(ratingCriticalChanged(before, afterAddress)).toBe(false);
    expect(ratingCriticalChanged(before, afterCovA)).toBe(true);
    expect(ratingCriticalFingerprint(before)).toContain("coverage_a=310000");
    expect(filledKeysAreRatingCritical(["insured_address", "notes"])).toBe(false);
    expect(filledKeysAreRatingCritical(["roof_year", "notes"])).toBe(true);
  });
});
