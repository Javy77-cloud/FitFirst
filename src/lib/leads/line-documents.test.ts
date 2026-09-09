import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAD_DOC_LINES,
  FORM_TAG_PREFIX,
  desiredShopLine,
  docCardKeyFromTags,
  documentFormKeysFromDocs,
  documentLinesFromDocs,
  formFromTags,
  formTag,
  groupDocsByLine,
  isImageDoc,
  labelForDocCardKey,
  leadDocumentCardKeys,
  leadDocumentCardLines,
  lineFromTags,
  lineTag,
  parseSelectedShopLines,
  remainingLeadDocFormKeys,
  remainingShopLines,
  shopLinesForConvertWithDocs,
} from "./line-documents";

describe("lead line documents", () => {
  it("keys a file to a shop line through additive tags, not a lead-wide blob", () => {
    expect(lineTag("flood")).toBe("line:flood");
    expect(formTag("HO3")).toBe("form:HO3");
    expect(lineFromTags(["dec", "line:auto"])).toBe("auto");
    expect(formFromTags(["dec", "form:DP1", "line:home"])).toBe("DP1");
    expect(lineFromTags(["source"])).toBeNull();
    expect(desiredShopLine("HO")).toBe("home");
    expect(desiredShopLine("AUTO")).toBe("auto");
    expect(desiredShopLine(null)).toBe("home");
  });

  it("starts with zero cards until the agent picks a line or a file already exists", () => {
    expect(DEFAULT_LEAD_DOC_LINES).toEqual(["home", "auto", "flood"]);
    expect(leadDocumentCardLines({ insuranceTypeDesired: "HO" })).toEqual([]);
    expect(leadDocumentCardLines({ insuranceTypeDesired: "UMBRELLA" })).toEqual([]);
    expect(
      leadDocumentCardLines({
        insuranceTypeDesired: "HO",
        documentLines: ["life"],
        extraLines: ["rec_rv"],
      }),
    ).toEqual(["rec_rv", "life"]);
    expect(remainingShopLines([])).toContain("home");
    expect(remainingShopLines(["home", "auto", "flood"])).toContain("umbrella");
    expect(remainingShopLines(["home", "auto", "flood"])).not.toContain("home");
  });

  it("offers policy subtypes on Add-line and keeps HO3 + DP1 as separate cards", () => {
    expect(remainingLeadDocFormKeys([])).toEqual(
      expect.arrayContaining([
        "form:HO3",
        "form:DP1",
        "form:DP3",
        "form:PA",
        "form:FLOOD",
        "form:GL",
        "form:WC",
        "form:BOP",
        "form:REC_RV",
      ]),
    );
    const keys = leadDocumentCardKeys({
      documentKeys: ["form:HO3", "form:DP1"],
      extraKeys: ["form:PA"],
    });
    expect(keys).toEqual(["form:HO3", "form:DP1", "form:PA"]);
    expect(labelForDocCardKey("form:HO3")).toBe("HO3");
    expect(labelForDocCardKey("form:DP1")).toBe("DP1");
    expect(labelForDocCardKey("line:home")).toBe("Home");
  });

  it("groups uploaded files by form subtype when form: tag is present", () => {
    const grouped = groupDocsByLine([
      { id: "1", tags: ["form:HO3", "line:home"], filename: "dec.pdf" },
      { id: "2", tags: ["form:DP1", "line:home"], filename: "dp1.pdf" },
      { id: "3", tags: ["line:auto"], filename: "id.jpg" },
      { id: "4", tags: ["other"], filename: "note.txt" },
    ]);
    expect(grouped.map((row) => row.line)).toEqual(["HO3", "DP1", "auto"]);
    expect(grouped.map((row) => row.label)).toEqual(["HO3", "DP1", "Auto"]);
    expect(grouped[0]?.docs).toHaveLength(1);
    expect(docCardKeyFromTags(["form:HO3", "line:home"])).toBe("form:HO3");
    expect(documentFormKeysFromDocs([{ tags: ["form:FLOOD", "line:flood"] }])).toEqual([
      "form:FLOOD",
    ]);
    expect(documentLinesFromDocs([{ tags: ["form:HO3", "line:home"] }, { tags: ["line:flood"] }])).toEqual([
      "home",
      "flood",
    ]);
    expect(shopLinesForConvertWithDocs("HO", ["auto", "flood"])).toEqual(["home", "auto", "flood"]);
    expect(shopLinesForConvertWithDocs("HO", [], ["life", "umbrella"])).toEqual([
      "home",
      "umbrella",
      "life",
    ]);
    expect(isImageDoc({ filename: "roof.jpg", mimeType: "application/octet-stream" })).toBe(true);
    expect(isImageDoc({ filename: "dec.pdf", mimeType: "application/pdf" })).toBe(false);
    expect(parseSelectedShopLines("home,life,umbrella")).toEqual(["home", "umbrella", "life"]);
    expect(parseSelectedShopLines("HO3,DP1")).toEqual(["home"]);
    expect(parseSelectedShopLines("nope")).toEqual([]);
    expect(FORM_TAG_PREFIX).toBe("form:");
  });
});
