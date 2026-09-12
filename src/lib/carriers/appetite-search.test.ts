import { describe, expect, it } from "vitest";
import { matchAppetiteSearch, carrierListHaystack } from "./appetite-search";

describe("matchAppetiteSearch", () => {
  it("flags writes vs excludes for flood", () => {
    const hit = matchAppetiteSearch(
      "flood",
      "Writes coastal HO and flood riders on preferred zip.",
      "Do not write standalone flood or NFIP surplus.",
    );
    expect(hit.side).toBe("both");
    expect(hit.writesSnippet?.toLowerCase()).toContain("flood");
    expect(hit.excludesSnippet?.toLowerCase()).toContain("flood");
  });

  it("returns none for empty query", () => {
    expect(matchAppetiteSearch("", "flood", null).side).toBe("none");
  });
});

describe("carrierListHaystack", () => {
  it("includes appetite and dont-write text", () => {
    const hay = carrierListHaystack({
      name: "Tailrow",
      appetiteNotes: "flood ok",
      dontWriteNotes: "no condo",
    });
    expect(hay).toContain("flood");
    expect(hay).toContain("condo");
  });
});
