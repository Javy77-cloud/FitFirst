import { describe, expect, it } from "vitest";
import { wrapTextAsPdf } from "./wrap-text-pdf";

describe("wrapTextAsPdf", () => {
  it("builds a viewable PDF from a leftover text stub", async () => {
    const buf = await wrapTextAsPdf(
      "american-integrity-quote-2840.txt",
      "ISSUED QUOTE PDF (stub)\nAmerican Integrity HO3\nThis is a shopping quote. It is not a policy.\n",
    );
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(200);
  });
});
