import { describe, expect, it } from "vitest";
import {
  docBelongsToProductWindow,
  filterDocsForProductWindow,
  libraryDocsNotInProductWindow,
  linkDocToProductTags,
  membershipTagsForUpload,
  multiProductMembershipWarning,
  shopLinesFromDocTags,
  unlinkDocFromProductTags,
} from "./product-doc-membership";

describe("product document membership", () => {
  it("treats line tags as multi-membership, not a single owner", () => {
    expect(shopLinesFromDocTags(["line:home", "dec", "line:flood"])).toEqual(["home", "flood"]);
    expect(docBelongsToProductWindow({ tags: ["line:home"] }, { shopLine: "home" })).toBe(true);
    expect(docBelongsToProductWindow({ tags: ["line:home"] }, { shopLine: "flood" })).toBe(false);
    expect(
      docBelongsToProductWindow({ tags: ["line:home", "line:flood"] }, { shopLine: "flood" }),
    ).toBe(true);
  });

  it("matches form tags when the product window has a quoting form", () => {
    expect(
      docBelongsToProductWindow(
        { tags: ["form:HO3", "line:home"] },
        { shopLine: "home", quotingForm: "HO3" },
      ),
    ).toBe(true);
    expect(
      docBelongsToProductWindow(
        { tags: ["form:FLOOD", "line:flood"] },
        { shopLine: "flood", quotingForm: "FLOOD" },
      ),
    ).toBe(true);
    expect(
      docBelongsToProductWindow(
        { tags: ["form:HO3", "line:home"] },
        { shopLine: "flood", quotingForm: "FLOOD" },
      ),
    ).toBe(false);
  });

  it("keeps untagged deal-library files out of every product window", () => {
    expect(docBelongsToProductWindow({ tags: [] }, { shopLine: "home" })).toBe(false);
    expect(docBelongsToProductWindow({ tags: ["source"] }, { shopLine: "flood" })).toBe(false);
  });

  it("filters Rosa-style HO3 docs out of the Flood window", () => {
    const rosa = [
      { id: "1", tags: ["line:home"], filename: "HO policy.pdf" },
      { id: "2", tags: ["line:home"], filename: "Flood policy PDF.pdf" },
      { id: "3", tags: ["line:home"], filename: "ADT.pdf" },
      { id: "4", tags: ["line:home"], filename: "wind mit.pdf" },
    ];
    expect(filterDocsForProductWindow(rosa, { shopLine: "home" })).toHaveLength(4);
    expect(filterDocsForProductWindow(rosa, { shopLine: "flood" })).toHaveLength(0);
  });

  it("upload tags stamp the active product only", () => {
    expect(membershipTagsForUpload({ shopLine: "flood", quotingForm: "FLOOD" })).toEqual([
      "line:flood",
      "form:FLOOD",
    ]);
    expect(membershipTagsForUpload({ shopLine: "home", quotingForm: "HO3" })).toEqual([
      "line:home",
      "form:HO3",
    ]);
  });

  it("unlink removes only the active product membership", () => {
    const linked = linkDocToProductTags(["line:home", "form:HO3"], {
      shopLine: "flood",
      quotingForm: "FLOOD",
    });
    expect(linked).toEqual(["line:home", "form:HO3", "line:flood", "form:FLOOD"]);
    expect(unlinkDocFromProductTags(linked, { shopLine: "flood", quotingForm: "FLOOD" })).toEqual([
      "line:home",
      "form:HO3",
    ]);
  });

  it("library link picker lists deal docs missing from the active window", () => {
    const docs = [
      { id: "home", tags: ["line:home"] },
      { id: "both", tags: ["line:home", "line:flood"] },
      { id: "flood", tags: ["line:flood"] },
    ];
    expect(libraryDocsNotInProductWindow(docs, { shopLine: "flood" }).map((d) => d.id)).toEqual([
      "home",
    ]);
  });

  it("warns before hard-delete when a file is on multiple products", () => {
    expect(multiProductMembershipWarning(["line:home"])).toBeNull();
    expect(multiProductMembershipWarning(["line:home", "line:flood"])).toMatch(/multiple products/);
  });
});
