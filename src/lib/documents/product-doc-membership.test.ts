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

  it("keeps a DEC on the original tabs after Link on a copy", () => {
    const dec = { tags: ["line:home", "form:DP3", "instance:homeowners~88uvyj"] };
    expect(
      docBelongsToProductWindow(dec, {
        shopLine: "home",
        quotingForm: "HO3",
        instanceKey: "homeowners",
      }),
    ).toBe(true);
    expect(
      docBelongsToProductWindow(dec, {
        shopLine: "home",
        quotingForm: "DP3",
        instanceKey: "landlord",
      }),
    ).toBe(true);
    expect(
      docBelongsToProductWindow(dec, {
        shopLine: "home~homeowners~88uvyj",
        quotingForm: "HO3",
        instanceKey: "homeowners~88uvyj",
      }),
    ).toBe(true);
    expect(
      docBelongsToProductWindow(
        { tags: ["line:home", "form:DP3"] },
        { shopLine: "home~homeowners~88uvyj", quotingForm: "HO3", instanceKey: "homeowners~88uvyj" },
      ),
    ).toBe(false);
  });

  it("links and unlinks original and copy without dropping the other form", () => {
    const dec = ["line:home", "form:DP3"];
    const onCopy = linkDocToProductTags(dec, {
      shopLine: "home~homeowners~88uvyj",
      quotingForm: "HO3",
      instanceKey: "homeowners~88uvyj",
    });
    expect(onCopy).toEqual(["line:home", "form:DP3", "form:HO3", "instance:homeowners~88uvyj"]);
    const onOriginal = linkDocToProductTags(onCopy, {
      shopLine: "home",
      quotingForm: "HO3",
      instanceKey: "homeowners",
    });
    expect(onOriginal).toContain("instance:homeowners");
    expect(onOriginal).toContain("instance:homeowners~88uvyj");
    expect(onOriginal).toContain("line:home");
    const copyRemoved = unlinkDocFromProductTags(onOriginal, {
      shopLine: "home~homeowners~88uvyj",
      quotingForm: "HO3",
      instanceKey: "homeowners~88uvyj",
    });
    expect(copyRemoved).not.toContain("instance:homeowners~88uvyj");
    expect(copyRemoved).toContain("line:home");
    expect(copyRemoved).toContain("form:DP3");
    expect(copyRemoved).toContain("instance:homeowners");
    const originalRemoved = unlinkDocFromProductTags(copyRemoved, {
      shopLine: "home",
      quotingForm: "HO3",
      instanceKey: "homeowners",
    });
    expect(originalRemoved).not.toContain("instance:homeowners");
    expect(originalRemoved).not.toContain("line:home");
    expect(originalRemoved).toContain("form:DP3");
  });

  it("stamps an instance tag for a plain product key", () => {
    expect(
      membershipTagsForUpload({ shopLine: "home", quotingForm: "DP3", instanceKey: "landlord" }),
    ).toEqual(["line:home", "form:DP3", "instance:landlord"]);
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
