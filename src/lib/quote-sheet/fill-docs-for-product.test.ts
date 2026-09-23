import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectFillDocsForProductWindow } from "./fill-docs-for-product";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("selectFillDocsForProductWindow", () => {
  const rosaDealDocs = [
    { id: "ho", filename: "HO policy.pdf", slot: "source_doc", docType: "dec", tags: ["line:home", "form:HO3"] },
    { id: "flood-misfiled", filename: "Flood policy PDF.pdf", slot: "source_doc", docType: "dec", tags: ["line:home"] },
    { id: "adt", filename: "ADT.pdf", slot: "source_doc", docType: "inspection", tags: ["line:home"] },
    { id: "wind", filename: "wind mit.pdf", slot: "source_doc", docType: "wind_mit", tags: ["line:home"] },
    {
      id: "flood-dec",
      filename: "Flood declaration.pdf",
      slot: "source_doc",
      docType: "dec",
      tags: ["line:flood", "form:FLOOD"],
    },
    { id: "quote", filename: "carrier-quote.pdf", slot: "quote_file", docType: "carrier_quote", tags: ["line:flood"] },
    { id: "untagged", filename: "library.pdf", slot: "source_doc", docType: "dec", tags: [] },
  ];

  it("Flood Fill only loads Flood-membership source docs (Rosa)", () => {
    const flood = selectFillDocsForProductWindow(rosaDealDocs, { shopLine: "flood" });
    expect(flood.map((d) => d.filename)).toEqual(["Flood declaration.pdf"]);
    expect(flood.map((d) => d.id)).not.toContain("ho");
    expect(flood.map((d) => d.id)).not.toContain("flood-misfiled");
    expect(flood.map((d) => d.id)).not.toContain("adt");
    expect(flood.map((d) => d.id)).not.toContain("wind");
  });

  it("HO3 Fill still uses home-membership docs", () => {
    const home = selectFillDocsForProductWindow(rosaDealDocs, { shopLine: "home" });
    expect(home.map((d) => d.filename)).toEqual([
      "HO policy.pdf",
      "Flood policy PDF.pdf",
      "ADT.pdf",
      "wind mit.pdf",
    ]);
    expect(home.map((d) => d.id)).not.toContain("flood-dec");
  });

  it("drops quote files and untagged library docs from Fill", () => {
    const flood = selectFillDocsForProductWindow(rosaDealDocs, { shopLine: "flood" });
    expect(flood.map((d) => d.id)).not.toContain("quote");
    expect(flood.map((d) => d.id)).not.toContain("untagged");
  });

  it("wires product membership into listMasterFillDocs and runFillQuoteSheet", () => {
    const action = source("src/app/actions/quote-sheet.ts");
    expect(action).toMatch(/selectFillDocsForProductWindow/);
    expect(action).toMatch(/listMasterFillDocs/);
    expect(action).toMatch(/runFillQuoteSheet/);
    const listIdx = action.indexOf("export async function listMasterFillDocs");
    const fillIdx = action.indexOf("export async function runFillQuoteSheet");
    expect(listIdx).toBeGreaterThan(-1);
    expect(fillIdx).toBeGreaterThan(-1);
    const listSlice = action.slice(listIdx, listIdx + 1200);
    const fillSlice = action.slice(fillIdx, fillIdx + 900);
    expect(listSlice).toMatch(/selectFillDocsForProductWindow/);
    expect(fillSlice).toMatch(/selectFillDocsForProductWindow/);
    expect(listSlice).toMatch(/shopLine:\s*lineRaw/);
    expect(fillSlice).toMatch(/shopLine:\s*line/);
  });
});
