import { describe, expect, it } from "vitest";
import { fileGlyph, folderBreadcrumbs, folderHref, isFolderKind } from "./documents";

describe("document manager helpers", () => {
  it("maps types to icons without hardcoding palette hex", () => {
    expect(fileGlyph("acord").icon).toBe("form");
    expect(fileGlyph("flyer").icon).toBe("flyer");
    expect(fileGlyph("photo").icon).toBe("image");
    expect(fileGlyph("dec").icon).toBe("pdf");
    expect(fileGlyph("other", "application/pdf").icon).toBe("pdf");
    expect(isFolderKind("agency_library")).toBe(true);
  });

  it("builds breadcrumbs from parent chain", () => {
    const trail = folderBreadcrumbs(
      [
        { id: "a", name: "Agency library", parentId: null },
        { id: "b", name: "ACORD", parentId: "a" },
        { id: "c", name: "HO apps", parentId: "b" },
      ],
      "c",
    );
    expect(trail.map((f) => f.name)).toEqual(["Agency library", "ACORD", "HO apps"]);
    expect(folderHref({ folderId: "b", scope: "library" })).toBe("/documents?scope=library&folder=b");
  });
});
