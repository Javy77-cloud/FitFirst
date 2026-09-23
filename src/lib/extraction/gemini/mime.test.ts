import { describe, expect, it } from "vitest";
import { resolveGeminiInlineMime } from "./client";
import { docTypeUsesGemini } from "./index";

describe("resolveGeminiInlineMime", () => {
  it("keeps PDFs as application/pdf", () => {
    expect(resolveGeminiInlineMime("application/pdf", "dec.pdf")).toBe("application/pdf");
    expect(resolveGeminiInlineMime(null, "wind.pdf")).toBe("application/pdf");
  });

  it("maps phone photos to image/* for Gemini vision", () => {
    expect(resolveGeminiInlineMime("image/jpeg", "IMG_001.jpg")).toBe("image/jpeg");
    expect(resolveGeminiInlineMime("image/png", "scan.png")).toBe("image/png");
    expect(resolveGeminiInlineMime("image/webp", "shot.webp")).toBe("image/webp");
    expect(resolveGeminiInlineMime("image/heic", "IMG_001.HEIC")).toBe("image/heic");
    expect(resolveGeminiInlineMime(null, "photo.jpeg")).toBe("image/jpeg");
  });
});

describe("docTypeUsesGemini photos", () => {
  it("routes Photos / Inspections through Gemini like dec/wind/4pt", () => {
    expect(docTypeUsesGemini("photo")).toBe(true);
    expect(docTypeUsesGemini("inspection")).toBe(true);
    expect(docTypeUsesGemini("report")).toBe(true);
    expect(docTypeUsesGemini("dec")).toBe(true);
    expect(docTypeUsesGemini("wind_mit")).toBe(true);
    expect(docTypeUsesGemini("alarm_certificate")).toBe(true);
    expect(docTypeUsesGemini("certificate")).toBe(true);
    expect(docTypeUsesGemini("other")).toBe(false);
  });
});
