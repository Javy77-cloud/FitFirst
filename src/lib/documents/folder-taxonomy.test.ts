import { describe, expect, it } from "vitest";
import { folderRole, typeFolderName, typeFolderOptions } from "./folder-taxonomy";

describe("document folder taxonomy", () => {
  it("lists form types and shared types as root folders", () => {
    expect(typeFolderOptions("forms").map((row) => row.docType)).toEqual(
      expect.arrayContaining(["acord", "cancellation", "aor"]),
    );
    expect(typeFolderOptions("shared").map((row) => row.docType)).toEqual(
      expect.arrayContaining(["marketing", "flyer", "appetite_guide"]),
    );
  });

  it("treats root as type and nested as carrier", () => {
    expect(folderRole(null)).toBe("type");
    expect(folderRole("")).toBe("type");
    expect(folderRole("folder-id")).toBe("carrier");
  });

  it("labels type folders from the doc-type catalog", () => {
    expect(typeFolderName("acord")).toBe("ACORD form");
    expect(typeFolderName("cancellation")).toBe("Cancellation");
  });
});
