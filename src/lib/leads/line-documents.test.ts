import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAD_DOC_LINES,
  desiredShopLine,
  documentLinesFromDocs,
  groupDocsByLine,
  isImageDoc,
  leadDocumentCardLines,
  lineFromTags,
  lineTag,
  remainingShopLines,
  shopLinesForConvertWithDocs,
} from "./line-documents";

describe("lead line documents", () => {
  it("keys a file to a shop line through additive tags, not a lead-wide blob", () => {
    expect(lineTag("flood")).toBe("line:flood");
    expect(lineFromTags(["dec", "line:auto"])).toBe("auto");
    expect(lineFromTags(["source"])).toBeNull();
    expect(desiredShopLine("HO")).toBe("home");
    expect(desiredShopLine("AUTO")).toBe("auto");
    expect(desiredShopLine(null)).toBe("home");
  });

  it("always shows Home / Auto / Flood and adds the desired line plus any line that already has a file", () => {
    expect(DEFAULT_LEAD_DOC_LINES).toEqual(["home", "auto", "flood"]);
    expect(leadDocumentCardLines({ insuranceTypeDesired: "HO" })).toEqual(["home", "auto", "flood"]);
    expect(leadDocumentCardLines({ insuranceTypeDesired: "UMBRELLA" })).toEqual([
      "home",
      "auto",
      "flood",
      "umbrella",
    ]);
    expect(
      leadDocumentCardLines({
        insuranceTypeDesired: "HO",
        documentLines: ["life"],
        extraLines: ["rec_rv"],
      }),
    ).toEqual(["home", "auto", "rec_rv", "flood", "life"]);
    expect(remainingShopLines(["home", "auto", "flood"])).toContain("umbrella");
    expect(remainingShopLines(["home", "auto", "flood"])).not.toContain("home");
  });

  it("groups uploaded files by line and carries those lines onto convert", () => {
    const grouped = groupDocsByLine([
      { id: "1", tags: ["line:home"], filename: "dec.pdf" },
      { id: "2", tags: ["line:auto"], filename: "id.jpg" },
      { id: "3", tags: ["other"], filename: "note.txt" },
    ]);
    expect(grouped.map((row) => row.line)).toEqual(["home", "auto"]);
    expect(grouped[0]?.docs).toHaveLength(1);
    expect(documentLinesFromDocs([{ tags: ["line:flood"] }, { tags: ["line:home"] }])).toEqual([
      "home",
      "flood",
    ]);
    expect(shopLinesForConvertWithDocs("HO", ["auto", "flood"])).toEqual(["home", "auto", "flood"]);
    expect(isImageDoc({ filename: "roof.jpg", mimeType: "application/octet-stream" })).toBe(true);
    expect(isImageDoc({ filename: "dec.pdf", mimeType: "application/pdf" })).toBe(false);
  });
});
