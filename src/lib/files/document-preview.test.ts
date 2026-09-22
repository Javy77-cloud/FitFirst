import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  documentPreviewKind,
  interpretDocumentBytes,
  interpretDocumentProbe,
  previewMimeFromResponse,
} from "./document-preview";

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

  it("loads PDF/image bytes into a blob: URL and shows missing instead of a blank iframe", () => {
    const dialog = source("src/components/documents/document-preview-dialog.tsx");
    expect(dialog).toMatch(/createObjectURL/);
    expect(dialog).toMatch(/arrayBuffer/);
    expect(dialog).toMatch(/interpretDocumentBytes/);
    expect(dialog).toMatch(/data-ff-document-preview-missing/);
    expect(dialog).toMatch(/is missing — re-upload/);
    // Do not iframe-navigate /api/files for PDFs (Chrome blank viewer with no-store).
    expect(dialog).not.toMatch(/<iframe[^>]*src=\{href\}/);
    const serve = source("src/lib/files/serve-document.ts");
    expect(serve).toMatch(/FILE_MISSING_HEADER/);
    expect(serve).toMatch(/FILE_OK_HEADER/);
    expect(serve).toMatch(/probeDeskDocument/);
    expect(serve).toMatch(/probeStoredFile/);
    expect(serve).toMatch(/file-missing\.txt/);
    expect(serve).toMatch(/max-age=0, must-revalidate/);
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

describe("interpretDocumentBytes", () => {
  it("treats empty body and missing header as missing", () => {
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
        byteLength: 0,
        kind: "pdf",
      }),
    ).toBe("missing");
    expect(
      interpretDocumentBytes({
        ok: false,
        status: 404,
        headers: headers({ "X-FitFirst-File-Missing": "1" }),
        byteLength: 12,
        kind: "pdf",
      }),
    ).toBe("missing");
  });

  it("requires %PDF magic for pdf kind", () => {
    const pdfHead = new TextEncoder().encode("%PDF-1.4 rest");
    const textHead = new TextEncoder().encode("Not a pdf at all");
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
        byteLength: pdfHead.length,
        head: pdfHead,
        kind: "pdf",
      }),
    ).toBe("ready");
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
        byteLength: textHead.length,
        head: textHead,
        kind: "pdf",
      }),
    ).toBe("missing");
  });


  it("accepts BOM/whitespace-prefixed PDF magic (aligned with server looksLikePdf)", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, 0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const spaced = new TextEncoder().encode("  \n%PDF-1.4 rest");
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
        byteLength: bom.length,
        head: bom,
        kind: "pdf",
      }),
    ).toBe("ready");
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
        byteLength: spaced.length,
        head: spaced,
        kind: "pdf",
      }),
    ).toBe("ready");
  });

  it("does not treat PDF binary containing 'unauthorized' as HTML missing", () => {
    // Binary PDF that happens to include the ASCII word "unauthorized" in the head window.
    const pdf = new TextEncoder().encode("%PDF-1.4\n% unauthorized stream placeholder\n");
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "application/pdf" }),
        byteLength: pdf.length,
        head: pdf,
        kind: "pdf",
      }),
    ).toBe("ready");
  });

  it("rejects HTML error bodies", () => {
    const html = new TextEncoder().encode("<!doctype html><html>Unauthorized</html>");
    expect(
      interpretDocumentBytes({
        ok: true,
        status: 200,
        headers: headers({ "Content-Type": "text/html" }),
        byteLength: html.length,
        head: html,
        kind: "pdf",
      }),
    ).toBe("missing");
  });
});

describe("previewMimeFromResponse", () => {
  it("falls back to application/pdf for pdf kind when content-type is plain", () => {
    expect(
      previewMimeFromResponse(
        { headers: headers({ "Content-Type": "text/plain" }) },
        "pdf",
      ),
    ).toBe("application/pdf");
  });
});
