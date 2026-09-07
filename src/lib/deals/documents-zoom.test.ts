import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOCS_ZOOM_DEFAULT,
  DOCS_ZOOM_STORAGE_KEY,
  documentsFitOverflows,
  documentsFitScale,
  documentsZeroScrollScale,
  parseDocsZoomMode,
} from "./documents-zoom";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Documents tab zoom", () => {
  it("defaults to fit-to-screen like a PDF viewer and persists the toggle", () => {
    expect(DOCS_ZOOM_DEFAULT).toBe("fit");
    expect(parseDocsZoomMode(null)).toBe("fit");
    expect(parseDocsZoomMode("fit")).toBe("fit");
    expect(parseDocsZoomMode("100")).toBe("100");
    expect(parseDocsZoomMode("nope")).toBe("fit");
    expect(DOCS_ZOOM_STORAGE_KEY).toBe("ff-docs-zoom");
  });

  it("scales down so the whole page fits and never scales above 100%", () => {
    expect(documentsFitScale(1200, 2000, 800, 700)).toBeCloseTo(0.35, 5);
    expect(documentsFitScale(400, 300, 800, 700)).toBe(1);
    expect(documentsFitScale(0, 100, 800, 700)).toBe(1);
    expect(documentsFitScale(800, 2000, 800, 500)).toBeCloseTo(0.25, 5);
  });

  it("shrinks below 20% when the sheet is taller than the window so fit never scrolls", () => {
    const scale = documentsZeroScrollScale(800, 8000, 800, 500);
    expect(scale).toBeLessThan(0.2);
    expect(documentsFitOverflows(800, 8000, scale, 800, 500)).toBe(false);
    expect(documentsFitOverflows(800, 2000, 0.4, 800, 500)).toBe(true);
    expect(documentsZeroScrollScale(400, 300, 800, 700)).toBe(1);
  });

  it("wires a fit / 100% toggle on the Documents panel", () => {
    const panel = source("src/components/deal/documents-panel.tsx");
    const zoom = source("src/components/deal/documents-zoom.tsx");
    expect(panel).toMatch(/DocumentsZoom/);
    expect(panel).toMatch(/data-ff-deal-docs/);
    expect(panel.indexOf("<DocumentsZoom")).toBeLessThan(panel.indexOf("data-ff-deal-docs"));
    expect(zoom).toMatch(/data-ff-docs-zoom/);
    expect(zoom).toMatch(/data-ff-docs-zoom-fit/);
    expect(zoom).toMatch(/data-ff-docs-zoom-full/);
    expect(zoom).toMatch(/Fit to screen/);
    expect(zoom).toMatch(/100%/);
    expect(zoom).toMatch(/sessionStorage/);
    expect(zoom).toMatch(/DOCS_ZOOM_STORAGE_KEY/);
    expect(zoom).toMatch(/overflow-hidden/);
    expect(zoom).toMatch(/documentsZeroScrollScale/);
    expect(zoom).toMatch(/overflow = "hidden"/);
    expect(zoom).toMatch(/data-ff-docs-zoom-scroll/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/data-ff-master-sheet-scroll/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).not.toMatch(/max-h-\[36rem\]/);
  });
});
