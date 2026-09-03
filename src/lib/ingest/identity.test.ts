import { describe, expect, it } from "vitest";
import { CLEAN_DEC_TEXT } from "@/lib/fixtures/sample-docs";
import { MELBOURNE_DEC_TEXT } from "@/lib/fixtures/sample-melbourne-dec";
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
    expect(parseNamedInsured(MELBOURNE_DEC_TEXT)).toBeNull();
    expect(inferShopLine(MELBOURNE_DEC_TEXT, "sample-melbourne-dec.txt", "dec")).toBe("home");
  });

  it("classifies source docs vs later quote-PDF attachments", () => {
    expect(inferDocType("wind-mit.pdf")).toBe("wind_mit");
    expect(inferDocType("4-point-inspection.pdf")).toBe("four_point");
    expect(inferDocType("roof-inspection.pdf")).toBe("inspection");
    expect(inferDocType("photo-dec.jpg")).toBe("photo");
    expect(inferDocType("carrier-quote.pdf")).toBe("quote");
    expect(isSourceDocType("dec")).toBe(true);
    expect(isSourceDocType("quote")).toBe(false);
    expect(isQuoteAttachment("quote", "later-quote.pdf")).toBe(true);
  });
});
