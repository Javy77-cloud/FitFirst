import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOCS_ZOOM_DEFAULT, DOCS_ZOOM_LOCKED, parseDocsZoomMode } from "./documents-zoom";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Documents tab zoom", () => {
  it("locks the master sheet at 100% and deletes the Fit / 100% toggle", () => {
    expect(DOCS_ZOOM_LOCKED).toBe("100");
    expect(DOCS_ZOOM_DEFAULT).toBe("100");
    expect(parseDocsZoomMode(null)).toBe("100");
    expect(parseDocsZoomMode("fit")).toBe("100");

    const panel = source("src/components/deal/documents-panel.tsx");
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(panel).toMatch(/data-ff-docs-zoom="100"/);
    expect(panel).not.toMatch(/DocumentsZoom/);
    expect(panel).not.toMatch(/Fit to screen/);
    expect(panel).not.toMatch(/data-ff-docs-zoom-fit/);
    expect(panel).not.toMatch(/data-ff-docs-zoom-full/);
    expect(panel).not.toMatch(/data-ff-docs-zoom-toolbar/);
    expect(panel).not.toMatch(/sessionStorage/);
    expect(panel).not.toMatch(/documentsZeroScrollScale/);
    expect(sheet).toMatch(/data-ff-master-sheet-scroll/);
    expect(sheet).toMatch(/overflow-visible/);
    expect(sheet).not.toMatch(/max-h-\[36rem\]/);
    expect(sheet).not.toMatch(/transform:\s*`scale/);
  });
});
