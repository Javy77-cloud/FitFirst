import { describe, expect, it } from "vitest";
import {
  contentDisposition,
  fileDownloadHref,
  filePreviewHref,
  fileViewHref,
  inferMimeFromName,
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
