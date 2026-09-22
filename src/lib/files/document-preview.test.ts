import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentPreviewKind, interpretDocumentProbe } from "./document-preview";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("documentPreviewKind", () => {
  it("classifies PDF and jpeg/png/webp as inline, everything else unsupported", () => {
    expect(documentPreviewKind({ filename: "dec.pdf" })).toBe("pdf");
    expect(documentPreviewKind({ mimeType: "application/pdf" })).toBe("pdf");
    expect(documentPreviewKind({ filename: "roof.jpg" })).toBe("image");
    expect(documentPreviewKind({ filename: "roof.JPEG" })).toBe("image");
    expect(documentPreviewKind({ filename: "photo.png" })).toBe("image");
    expect(documentPreviewKind({ filename: "scan.webp" })).toBe("image");
    expect(documentPreviewKind({ mimeType: "image/png" })).toBe("image");
    expect(documentPreviewKind({ filename: "notes.txt" })).toBe("unsupported");
    expect(documentPreviewKind({ filename: "scan.heic" })).toBe("unsupported");
    expect(documentPreviewKind({ mimeType: "image/heic", filename: "scan.heic" })).toBe(
      "unsupported",
    );
    expect(documentPreviewKind({ filename: "sheet.csv" })).toBe("unsupported");
  });
});

describe("in-app document View modal", () => {
  const VIEW_SURFACES = [
    "src/components/documents/file-action-menu.tsx",
    "src/components/deal/doc-file-actions.tsx",
    "src/components/deal/quote-file-actions.tsx",
    "src/components/quotes/quote-actions.tsx",
    "src/components/deal/quote-compare-board.tsx",
    "src/components/documents/document-versions.tsx",
  ] as const;

  it("opens DocumentPreviewDialog instead of a new tab on every View surface", () => {
    for (const file of VIEW_SURFACES) {
      const text = source(file);
      expect(text, file).toMatch(/DocumentPreviewDialog|DocumentViewButton/);
    }
    const menu = source("src/components/documents/file-action-menu.tsx");
    expect(menu).toMatch(/data-ff-file-action="view"/);
    expect(menu).not.toMatch(/target="_blank"/);

    const docs = source("src/components/deal/doc-file-actions.tsx");
    expect(docs).toMatch(/DocumentViewButton/);
    expect(docs.indexOf("View")).toBeGreaterThan(-1);
    expect(docs).not.toMatch(/href=\{viewHref\}[\s\S]*target="_blank"/);

    const quotes = source("src/components/deal/quote-file-actions.tsx");
    expect(quotes).toMatch(/DocumentViewButton/);
    expect(quotes).not.toMatch(/target="_blank"/);

    const dialog = source("src/components/documents/document-preview-dialog.tsx");
    expect(dialog).toMatch(/data-ff-document-preview/);
    expect(dialog).toMatch(/data-ff-document-preview-unsupported/);
    expect(dialog).toMatch(/This file type can’t be previewed here/);
    expect(dialog).not.toMatch(/target="_blank"/);
    expect(dialog).toMatch(/fileViewHref/);
    expect(dialog).toMatch(/fileDownloadHref/);
  });

  it("probes storage and shows a missing-file message instead of a blank iframe", () => {
    const dialog = source("src/components/documents/document-preview-dialog.tsx");
    expect(dialog).toMatch(/probe=1/);
    expect(dialog).toMatch(/interpretDocumentProbe/);
    expect(dialog).toMatch(/data-ff-document-preview-missing/);
    expect(dialog).toMatch(/is missing — re-upload/);
    const serve = source("src/lib/files/serve-document.ts");
    expect(serve).toMatch(/FILE_MISSING_HEADER/);
    expect(serve).toMatch(/FILE_OK_HEADER/);
    expect(serve).toMatch(/probeDeskDocument/);
    expect(serve).toMatch(/probeStoredFile/);
  });
});

function headers(map: Record<string, string>) {
  return {
    get(name: string) {
      const key = Object.keys(map).find((k) => k.toLowerCase() === name.toLowerCase());
      return key ? map[key] : null;
    },
  };
}

describe("interpretDocumentProbe", () => {
  it("treats 204 as ready without requiring the ok header", () => {
    expect(
      interpretDocumentProbe({ ok: true, status: 204, headers: headers({}) }),
    ).toBe("ready");
  });

  it("treats ok JSON/PDF content-type as ready when custom headers are absent", () => {
    expect(
      interpretDocumentProbe({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/json; charset=utf-8" }),
      }),
    ).toBe("ready");
    expect(
      interpretDocumentProbe({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
      }),
    ).toBe("ready");
  });

  it("treats missing header or 404 as missing even if ok is true", () => {
    expect(
      interpretDocumentProbe({
        ok: false,
        status: 404,
        headers: headers({ "X-FitFirst-File-Missing": "1" }),
      }),
    ).toBe("missing");
    expect(
      interpretDocumentProbe({
        ok: true,
        status: 200,
        headers: headers({ "X-FitFirst-File-Missing": "1" }),
      }),
    ).toBe("missing");
  });

  it("treats ok status without missing header as ready (soft)", () => {
    expect(
      interpretDocumentProbe({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "text/plain" }),
      }),
    ).toBe("ready");
  });

  it("treats 401/403 as error", () => {
    expect(
      interpretDocumentProbe({ ok: false, status: 401, headers: headers({}) }),
    ).toBe("error");
  });
});
