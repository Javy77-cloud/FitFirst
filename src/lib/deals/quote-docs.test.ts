import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isDocumentsSourceDoc,
  isQuoteFileDoc,
  quoteFolderKind,
  quoteFoldersByQuoteId,
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
  });

  it("Manual membership is the agency upload, not a shopping source doc", () => {
    const manual = {
      slot: "quote_file",
      docType: "agency_quote",
      tags: ["quote:q1", "source:agency", "label:Travelers.pdf"],
    };
    expect(quoteFolderKind(manual)).toBe("manual");
    expect(quoteFoldersByQuoteId([manual]).q1?.manual).toHaveLength(1);
    expect(quoteFoldersByQuoteId([manual]).q1?.carrier).toHaveLength(0);

    const carrier = {
      slot: "quote_file",
      docType: "carrier_quote",
      tags: ["quote:q-api", "source:carrier"],
    };
    expect(quoteFolderKind(carrier)).toBe("carrier");
    expect(quoteFoldersByQuoteId([manual, carrier])["q-api"]?.carrier).toHaveLength(1);

    const shopping = { slot: "source_doc", docType: "current_policy", tags: ["line:auto"] };
    expect(quoteFolderKind(shopping)).toBeNull();
    expect(quoteFoldersByQuoteId([shopping])).toEqual({});

    const documentsDec = {
      slot: "source_doc",
      docType: "dec",
      tags: ["quote:q1", "source:agency", "dec", "mint"],
    };
    expect(isQuoteFileDoc(documentsDec)).toBe(false);
    expect(quoteFolderKind(documentsDec)).toBeNull();
  });

  it("Documents panel filters with isDocumentsSourceDoc; Quotes uses the same folder buckets as the mint gate", () => {
    const docsPanel = source("src/components/deal/documents-panel.tsx");
    expect(docsPanel).toContain("listWorksheetSourceDocs");
    expect(source("src/lib/documents/deal-docs-save.ts")).toContain("isDocumentsSourceDoc");
    expect(docsPanel).not.toContain('d.slot !== "quote_pdf" && d.slot !== "policy_file"');

    const quotesPanel = source("src/components/deal/quotes-panel.tsx");
    expect(quotesPanel).toContain("quoteFoldersByQuoteId");
    expect(quotesPanel).toContain("folderHasPolicy");
    expect(quotesPanel).toContain('@/lib/deals/quote-docs');
    const life = source("src/components/deal/life-health-quotes-panel.tsx");
    expect(life).toContain("quoteFoldersByQuoteId");
    expect(life).toContain("folderHasPolicy");
    expect(source("src/lib/policy/mint-gate.ts")).toContain("quoteFoldersByQuoteId");
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toContain("folderHasPolicy");

    const upload = source("src/app/actions/quote-files.ts");
    expect(upload).toContain('slot: "quote_file"');
    expect(upload).toContain("source:agency");
    expect(upload).toContain('docType: "agency_quote"');

    const fill = source("src/app/actions/quote-sheet.ts");
    expect(fill).toContain("isQuoteFileDoc(doc)");
    expect(fill).toContain("isDocumentsSourceDoc(doc)");
  });
});
