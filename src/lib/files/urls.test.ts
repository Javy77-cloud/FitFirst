import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}
import {
  contentDisposition,
  fileDownloadHref,
  filePreviewHref,
  fileVersionHref,
  fileViewHref,
  inferMimeFromName,
  isProposalAttachment,
  isFilenameOnlyStub,
  inflateIfGzip,
  isGzipMagic,
  looksLikePdf,
  resolveFileMime,
  shouldWrapAsPdf,
} from "./urls";
import { matchQuotePdf } from "./quote-match";

describe("file URLs", () => {
  it("uses /api/files for view and download", () => {
    expect(fileViewHref("abc")).toBe("/api/files/abc");
    expect(fileDownloadHref("abc")).toBe("/api/files/abc?download=1");
    expect(filePreviewHref("abc")).toBe("/files/abc");
    expect(filePreviewHref("abc", true)).toBe("/files/abc?print=1");
    expect(fileVersionHref("abc", "ver-1")).toBe("/api/files/abc?version=ver-1");
    expect(fileVersionHref("abc", "ver-1", true)).toBe("/api/files/abc?version=ver-1&download=1");
  });

  it("sniffs PDF magic and quote slots", () => {
    expect(looksLikePdf(Buffer.from("%PDF-1.4"))).toBe(true);
    expect(looksLikePdf(Buffer.from("ISSUED QUOTE"))).toBe(false);
    expect(inferMimeFromName("quote.pdf", "application/octet-stream")).toBe("application/pdf");
    expect(
      resolveFileMime({
        filename: "american-integrity-quote-2840.txt",
        storedMime: "text/plain",
        bytes: Buffer.from("%PDF-1.7\n"),
      }),
    ).toBe("application/pdf");
    expect(
      shouldWrapAsPdf({
        filename: "tailrow-quote-3120.txt",
        storedMime: "text/plain",
        docType: "quote_pdf",
        slot: "quote_pdf",
        bytes: Buffer.from("ISSUED QUOTE PDF (stub)\n"),
      }),
    ).toBe(true);
    expect(isProposalAttachment({ docType: "proposal_pdf", slot: "proposal" })).toBe(true);
    expect(isProposalAttachment({ docType: "proposal", slot: "proposal" })).toBe(true);
    expect(
      resolveFileMime({
        filename: "proposal-Ruiz_Melbourne_HO3.pdf",
        storedMime: "application/pdf",
        docType: "proposal_pdf",
        slot: "proposal",
      }),
    ).toBe("application/pdf");
    expect(
      resolveFileMime({
        filename: "proposal-Ruiz_Melbourne_HO3.pdf",
        storedMime: "application/octet-stream",
        docType: "proposal",
        slot: "proposal",
      }),
    ).toBe("application/pdf");
  });

  it("treats filename-only leftover stubs as missing, not a preview PDF", () => {
    expect(isFilenameOnlyStub("dec.pdf", Buffer.from("dec.pdf"))).toBe(true);
    expect(isFilenameOnlyStub("dec.pdf", Buffer.from(""))).toBe(true);
    expect(isFilenameOnlyStub("dec.pdf", Buffer.from("%PDF-1.4 bytes"))).toBe(false);
    expect(source("src/app/files/[id]/page.tsx")).toMatch(/data-ff-file-missing/);
    expect(source("src/lib/files/serve-document.ts")).toMatch(/isFilenameOnlyStub/);
  });

  it("builds inline and attachment Content-Disposition", () => {
    expect(contentDisposition('quote "A".pdf', false)).toContain("inline;");
    expect(contentDisposition("quote.pdf", true)).toContain("attachment;");
  });
});

describe("matchQuotePdf", () => {
  const docs = [
    { id: "1", filename: "american-integrity-quote-2840.pdf", docType: "quote_pdf", slot: "quote_pdf" },
    { id: "2", filename: "Q-TR-MEL-3120-Tailrow.pdf", docType: "quote_pdf", slot: "quote_pdf" },
  ];

  it("matches each issued quote to its own PDF", () => {
    expect(
      matchQuotePdf({ quoteNumber: "Q-AI-MEL-2840" }, { name: "American Integrity" }, docs)?.id,
    ).toBe("1");
    expect(matchQuotePdf({ quoteNumber: "Q-TR-MEL-3120" }, { name: "Tailrow" }, docs)?.id).toBe("2");
  });
});

describe("looksLikePdf hardening", () => {
  it("accepts BOM-prefixed and whitespace-prefixed PDF magic", () => {
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("%PDF-1.7\n")]);
    expect(looksLikePdf(bom)).toBe(true);
    expect(looksLikePdf(Buffer.from("  \n\t%PDF-1.4\n"))).toBe(true);
    expect(looksLikePdf(Buffer.from("xxxx%PDF-1.5\n"))).toBe(true);
  });

  it("accepts %PDF followed by version digit without hyphen", () => {
    expect(looksLikePdf(Buffer.from("%PDF1.4\n"))).toBe(true);
    expect(looksLikePdf(Buffer.from("%PDFx"))).toBe(false);
  });

  it("accepts gzip-wrapped PDF and inflateIfGzip returns PDF bytes", async () => {
    const { gzipSync } = await import("node:zlib");
    const pdf = Buffer.from("%PDF-1.4 gzip-wrapped\n");
    const gz = gzipSync(pdf);
    expect(isGzipMagic(gz)).toBe(true);
    expect(looksLikePdf(gz)).toBe(true);
    expect(looksLikePdf(pdf)).toBe(true);
    const inflated = inflateIfGzip(gz);
    expect(inflated.toString("utf8")).toContain("%PDF-1.4");
    expect(isGzipMagic(inflated)).toBe(false);
  });

  it("rejects plain text and tiny buffers", () => {
    expect(looksLikePdf(Buffer.from("ISSUED QUOTE"))).toBe(false);
    expect(looksLikePdf(Buffer.from("%PD"))).toBe(false);
    expect(looksLikePdf(Buffer.alloc(0))).toBe(false);
  });
});
