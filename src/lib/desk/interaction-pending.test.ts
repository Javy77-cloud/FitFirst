import { describe, expect, it } from "vitest";
import { isInternalDeskNavigation } from "./interaction-pending";

const here = {
  pathname: "/deals/abc",
  search: "?tab=details",
  origin: "https://fit-first-seven.vercel.app",
};

describe("desk navigation pending helpers", () => {
  it("treats module and tab hrefs as in-desk navigations", () => {
    expect(isInternalDeskNavigation("/leads", here)).toBe(true);
    expect(isInternalDeskNavigation("/deals/abc?tab=quotes", here)).toBe(true);
    expect(isInternalDeskNavigation("?tab=quotes", here)).toBe(true);
  });

  it("ignores same-page, hash, and off-site clicks", () => {
    expect(isInternalDeskNavigation("/deals/abc?tab=details", here)).toBe(false);
    expect(isInternalDeskNavigation("#notes", here)).toBe(false);
    expect(isInternalDeskNavigation("mailto:javy@fitfirst.local", here)).toBe(false);
    expect(isInternalDeskNavigation("https://example.com/leads", here)).toBe(false);
    expect(isInternalDeskNavigation("", here)).toBe(false);
  });
});
