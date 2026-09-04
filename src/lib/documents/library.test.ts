import { describe, expect, it } from "vitest";
import {
  buildFolderTree,
  canMoveFolder,
  descendantIds,
  inferDocTypeFromName,
  libraryHref,
  parseLibrary,
} from "./library";

const folders = [
  { id: "shared-mkt", name: "Marketing", parentId: null, library: "shared" },
  { id: "shared-hurr", name: "Hurricane season", parentId: "shared-mkt", library: "shared" },
  { id: "forms-acord", name: "ACORD", parentId: null, library: "forms" },
  { id: "forms-ho", name: "HO apps", parentId: "forms-acord", library: "forms" },
];

describe("document libraries", () => {
  it("treats the old library scope as Shared", () => {
    expect(parseLibrary("library")).toBe("shared");
    expect(parseLibrary("forms")).toBe("forms");
    expect(parseLibrary("shared")).toBe("shared");
    expect(libraryHref({ library: "forms", folderId: "forms-acord" })).toBe(
      "/documents?library=forms&folder=forms-acord",
    );
  });

  it("builds a nested tree for one library", () => {
    const tree = buildFolderTree(folders.filter((f) => f.library === "shared"));
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Marketing");
    expect(tree[0]?.children.map((c) => c.name)).toEqual(["Hurricane season"]);
  });

  it("blocks moving a folder into itself or a child", () => {
    expect(canMoveFolder(folders, "shared-mkt", "shared-mkt").ok).toBe(false);
    expect(canMoveFolder(folders, "shared-mkt", "shared-hurr").ok).toBe(false);
    expect(canMoveFolder(folders, "shared-hurr", "forms-acord").ok).toBe(false);
    expect(canMoveFolder(folders, "shared-hurr", null).ok).toBe(true);
    expect([...descendantIds(folders, "forms-acord")]).toEqual(["forms-ho"]);
  });

  it("guesses type from the file name", () => {
    expect(inferDocTypeFromName("Citizens-appetite.pdf", "shared")).toBe("appetite_guide");
    expect(inferDocTypeFromName("ACORD-80.pdf", "forms")).toBe("acord");
    expect(inferDocTypeFromName("AOR-signed.pdf", "forms")).toBe("aor");
    expect(inferDocTypeFromName("notes.txt", "shared")).toBe("other");
  });
});
