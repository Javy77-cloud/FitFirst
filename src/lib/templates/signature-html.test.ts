import { describe, expect, it } from "vitest";
import {
  isAllowedSignatureImage,
  previewMergedSignature,
  sanitizeSignatureHtml,
  signatureToPreviewHtml,
} from "./signature-html";

describe("signature html", () => {
  it("turns plain text into line-broken preview HTML", () => {
    expect(signatureToPreviewHtml("Javy\nFitFirst")).toBe("Javy<br />FitFirst");
  });

  it("strips scripts and event handlers from HTML", () => {
    const html = sanitizeSignatureHtml(
      `<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="data:image/png;base64,abc" alt="logo" />`,
    );
    expect(html).toContain("<p>Hi</p>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('src="data:image/png;base64,abc"');
  });

  it("merges {{signature}} into a sample close", () => {
    const preview = previewMergedSignature("Javy Rivera\n{{agency_name}}");
    expect(preview).toContain("Hi Marcus");
    expect(preview).toContain("Javy Rivera");
    expect(preview).toContain("Javier Garcia Insurance");
    expect(preview).not.toContain("{{signature}}");
  });

  it("guards signature image size and type", () => {
    expect(isAllowedSignatureImage({ type: "image/png", size: 20_000 }).ok).toBe(true);
    expect(isAllowedSignatureImage({ type: "application/pdf", size: 20_000 }).ok).toBe(false);
    expect(isAllowedSignatureImage({ type: "image/png", size: 400_000 }).ok).toBe(false);
  });
});
