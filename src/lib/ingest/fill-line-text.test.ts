import { describe, expect, it, vi } from "vitest";
import { compareFillSourceDocs, fillShopLineSkipsTextExtract, readFillShopLineText } from "./fill-line-text";

describe("Fill shop-line text gate", () => {
  it("does not OCR an auto declaration photo", async () => {
    const readText = vi.fn(async () => {
      await new Promise(() => undefined);
      return { text: "never" };
    });
    const result = await readFillShopLineText(Buffer.from("jpeg"), "image/jpeg", "domenic-iori-dec.jpg", "photo", {
      readText,
    });
    expect(result).toEqual({ text: "", timedOut: false });
    expect(readText).not.toHaveBeenCalled();
    expect(
      fillShopLineSkipsTextExtract({
        docType: "dec",
        mimeType: "image/heic",
        filename: "IMG_1001.HEIC",
      }),
    ).toBe(true);
  });

  it("stops a hung PDF text read instead of blocking Docs", async () => {
    const readText = vi.fn(
      () => new Promise<{ text: string }>(() => undefined),
    );
    const started = Date.now();
    const result = await readFillShopLineText(Buffer.from("%PDF"), "application/pdf", "wind-mit.pdf", "wind_mit", {
      timeoutMs: 30,
      readText,
    });
    expect(result).toEqual({ text: "", timedOut: true });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(readText).toHaveBeenCalledOnce();
  });

  it("reads a PDF text layer when it returns", async () => {
    const result = await readFillShopLineText(Buffer.from("%PDF"), "application/pdf", "auto-policy.pdf", "dec", {
      readText: async () => ({ text: "Vehicle Identification Number 4T1B11HK5KU123456" }),
    });
    expect(result.timedOut).toBe(false);
    expect(result.text).toMatch(/Vehicle Identification Number/);
  });

  it("orders declaration photos ahead of PDFs", () => {
    const docs = [
      { docType: "wind_mit", mimeType: "application/pdf", filename: "wind.pdf" },
      { docType: "photo", mimeType: "image/jpeg", filename: "dec.jpg" },
    ];
    expect([...docs].sort(compareFillSourceDocs).map((doc) => doc.filename)).toEqual(["dec.jpg", "wind.pdf"]);
  });
});
