import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isDocumentsSourceDoc,
  isFillSourceDoc,
  isQuoteFileDoc,
  shopLineFromSourceDoc,
} from "./quote-docs";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("quote docs vs documents source docs", () => {
  it("treats agency quote uploads as quote files, not Documents source docs", () => {
    const agency = {
      slot: "quote_file",
      docType: "agency_quote",
      tags: ["quote:q1", "source:agency", "label:Acme"],
    };
    expect(isQuoteFileDoc(agency)).toBe(true);
    expect(isDocumentsSourceDoc(agency)).toBe(false);

    const carrier = {
      slot: "quote_file",
      docType: "carrier_quote",
      tags: ["quote:q1", "source:carrier"],
    };
    expect(isQuoteFileDoc(carrier)).toBe(true);
    expect(isDocumentsSourceDoc(carrier)).toBe(false);

    const taggedOnly = { slot: "source_doc", docType: "other", tags: ["quote:q1"] };
    expect(isQuoteFileDoc(taggedOnly)).toBe(true);
    expect(isDocumentsSourceDoc(taggedOnly)).toBe(false);
  });

  it("keeps wind mit / 4-point / dec source docs on Documents", () => {
    for (const docType of ["wind_mit", "four_point", "dec", "photo"]) {
      const doc = { slot: "source_doc", docType, tags: ["line:home"] };
      expect(isQuoteFileDoc(doc)).toBe(false);
      expect(isDocumentsSourceDoc(doc)).toBe(true);
    }
    expect(isDocumentsSourceDoc({ slot: "quote_pdf", docType: "other", tags: [] })).toBe(false);
    expect(isDocumentsSourceDoc({ slot: "policy_file", docType: "other", tags: [] })).toBe(false);
    expect(
      isQuoteFileDoc({
        slot: "source_doc",
        docType: "dec",
        tags: ["quote:q1", "source:agency", "dec", "mint"],
      }),
    ).toBe(false);
    expect(
      isDocumentsSourceDoc({
        slot: "source_doc",
        docType: "dec",
        tags: ["quote:q1", "source:agency", "dec", "mint"],
      }),
    ).toBe(true);
    expect(shopLineFromSourceDoc({ slot: "source_doc", docType: "dec", tags: ["line:home"] })).toBe(
      "home",
    );
    expect(shopLineFromSourceDoc({ slot: "source_doc", docType: "auto_id_card", tags: [] })).toBe(
      "auto",
    );
    expect(shopLineFromSourceDoc({ slot: "source_doc", docType: "dec", tags: [] })).toBe(null);
    expect(
      isFillSourceDoc({ slot: "quote_file", docType: "dec", tags: [] }),
    ).toBe(true);
    expect(
      isFillSourceDoc({ slot: "source_doc", docType: "auto_id_card", tags: [] }),
    ).toBe(true);
    expect(isFillSourceDoc({ slot: "quote_file", docType: "agency_quote", tags: [] })).toBe(false);
  });

  it("Documents panel filters with isDocumentsSourceDoc; Quotes keeps isQuoteFileDoc", () => {
    const docsPanel = source("src/components/deal/documents-panel.tsx");
    expect(docsPanel).toContain("listWorksheetSourceDocs");
    expect(docsPanel).not.toContain('d.slot !== "quote_pdf" && d.slot !== "policy_file"');
    const worksheet = source("src/lib/documents/deal-docs-save.ts");
    expect(worksheet).toContain("isDocumentsSourceDoc");

    const quotesPanel = source("src/components/deal/quotes-panel.tsx");
    expect(quotesPanel).toContain("isQuoteFileDoc");
    expect(quotesPanel).toContain('@/lib/deals/quote-docs');

    const upload = source("src/app/actions/quote-files.ts");
    expect(upload).toContain('slot: "quote_file"');
    expect(upload).toContain("source:agency");
    expect(upload).toContain('docType: "agency_quote"');

    const fill = source("src/app/actions/quote-sheet.ts");
    expect(fill).toContain("isQuoteFileDoc(doc)");
    expect(fill).toContain("isFillSourceDoc(doc)");
  });
});
