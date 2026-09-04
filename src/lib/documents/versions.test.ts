import { describe, expect, it } from "vitest";
import {
  currentVersionNumber,
  fileVersionHref,
  groupVersionsByDocument,
  nextVersionNumber,
  priorVersions,
} from "./versions";

describe("document versions", () => {
  it("starts at v1 and increments past the highest kept copy", () => {
    expect(nextVersionNumber([])).toBe(1);
    expect(nextVersionNumber([1])).toBe(2);
    expect(nextVersionNumber([1, 3])).toBe(4);
  });

  it("keeps prior versions after a replace", () => {
    const rows = [
      {
        id: "v2",
        documentId: "wind",
        versionNumber: 2,
        filename: "melbourne-wind-mit-revised.txt",
        mimeType: "text/plain",
        storagePath: "v2",
        docType: "wind_mit",
        uploadedByName: "Maya Chen",
        note: "Replaced after roof year correction",
        createdAt: "2026-08-18T14:40:00.000Z",
      },
      {
        id: "v1",
        documentId: "wind",
        versionNumber: 1,
        filename: "melbourne-wind-mit.txt",
        mimeType: "text/plain",
        storagePath: "v1",
        docType: "wind_mit",
        uploadedByName: "Javy Rivera",
        note: null,
        createdAt: "2026-08-12T15:10:00.000Z",
      },
    ];
    expect(currentVersionNumber(rows)).toBe(2);
    expect(priorVersions(rows).map((row) => row.versionNumber)).toEqual([1]);
    expect(nextVersionNumber(rows.map((row) => row.versionNumber))).toBe(3);
  });

  it("groups versions per document newest first", () => {
    const grouped = groupVersionsByDocument([
      {
        id: "a1",
        documentId: "dec",
        versionNumber: 1,
        filename: "a.txt",
        mimeType: "text/plain",
        storagePath: "a",
        docType: "dec",
        uploadedByName: "Javy Rivera",
        note: null,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "b2",
        documentId: "wind",
        versionNumber: 2,
        filename: "b2.txt",
        mimeType: "text/plain",
        storagePath: "b2",
        docType: "wind_mit",
        uploadedByName: "Maya Chen",
        note: null,
        createdAt: "2026-08-18T00:00:00.000Z",
      },
      {
        id: "b1",
        documentId: "wind",
        versionNumber: 1,
        filename: "b1.txt",
        mimeType: "text/plain",
        storagePath: "b1",
        docType: "wind_mit",
        uploadedByName: "Javy Rivera",
        note: null,
        createdAt: "2026-08-12T00:00:00.000Z",
      },
    ]);
    expect([...grouped.keys()]).toEqual(["dec", "wind"]);
    expect(grouped.get("wind")?.map((row) => row.versionNumber)).toEqual([2, 1]);
  });

  it("points prior copies at the same document id", () => {
    expect(fileVersionHref("doc-1", "ver-9")).toBe("/api/files/doc-1?version=ver-9");
    expect(fileVersionHref("doc-1", "ver-9", true)).toBe("/api/files/doc-1?version=ver-9&download=1");
  });
});
