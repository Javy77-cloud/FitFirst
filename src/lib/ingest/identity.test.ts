import { describe, expect, it } from "vitest";
import { CLEAN_DEC_TEXT } from "@/lib/fixtures/sample-docs";
import { MELBOURNE_DEC_TEXT } from "@/lib/fixtures/sample-melbourne-dec";
import { GARCIA_AUTO_DEC_TEXT, GARCIA_DEC_TEXT } from "@/lib/fixtures/sample-garcia-dec";
import {
  INGEST_CREATES_POLICY,
  INGEST_PATH,
  inferAccountKind,
  inferDocType,
  inferShopLine,
  isQuoteAttachment,
  isSourceDocType,
  parseNamedInsured,
} from "./identity";

describe("drop ingest identity", () => {
  it("locks ingest to Lead→Deal and never a Policy", () => {
    expect(INGEST_PATH).toBe("lead_to_deal");
    expect(INGEST_CREATES_POLICY).toBe(false);
  });

  it("reads named insured from a HO dec (Home first)", () => {
    const ana = parseNamedInsured(CLEAN_DEC_TEXT);
    expect(ana).toEqual({ firstName: "Ana", lastName: "Dib", secondary: "George Dib" });
    expect(inferShopLine(CLEAN_DEC_TEXT, "sample-palm-bay-dec.txt", "dec")).toBe("home");
    expect(inferAccountKind("home")).toBe("personal");
  });

  it("reads named insured from the Melbourne sample dec", () => {
    expect(parseNamedInsured(MELBOURNE_DEC_TEXT)).toEqual({
      firstName: "Maya",
      lastName: "Ortega",
      secondary: null,
    });
    expect(inferShopLine(MELBOURNE_DEC_TEXT, "sample-melbourne-dec.txt", "dec")).toBe("home");
  });

  it("keeps a full HO3 on Home and an auto dec on Auto", () => {
    expect(inferShopLine(GARCIA_DEC_TEXT, "francisco-garcia-ho3-sample-dec.txt", "dec")).toBe("home");
    expect(inferShopLine(GARCIA_AUTO_DEC_TEXT, "francisco-garcia-auto-sample-dec.txt", "dec")).toBe(
      "auto",
    );
  });

  it("classifies source docs vs later quote-PDF attachments", () => {
    expect(inferDocType("wind-mit.pdf")).toBe("wind_mit");
    expect(inferDocType("4-point-inspection.pdf")).toBe("four_point");
    expect(inferDocType("roof-inspection.pdf")).toBe("inspection");
    expect(inferDocType("photo-dec.jpg")).toBe("photo");
    expect(inferDocType("carrier-quote.pdf")).toBe("quote_pdf");
    expect(inferDocType("signed-app.pdf")).toBe("signed_app");
    expect(inferDocType("building-permit.pdf")).toBe("permits");
    expect(inferDocType("hand-notes.txt")).toBe("hand_notes");
    expect(isSourceDocType("dec")).toBe(true);
    expect(isSourceDocType("current_policy")).toBe(true);
    expect(isSourceDocType("quote")).toBe(false);
    expect(isQuoteAttachment("quote", "later-quote.pdf")).toBe(true);
  });
});
