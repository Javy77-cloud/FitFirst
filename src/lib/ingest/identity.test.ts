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
  trustSheetLineForFill,
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

  it("treats an auto policy PDF as Auto even when the page says Vehicle Identification Number", () => {
    const policy = `PERSONAL AUTOMOBILE POLICY
Named Insured: ALEX RIVERA
Vehicle Identification Number: 4T1B11HK5KU123456
2019 TOYOTA CAMRY
Bodily Injury Liability 100/300
Policy Number: PA-441902
Effective 03/15/2026 to 09/15/2026`;
    expect(inferShopLine(policy, "client-auto-policy.pdf", "current_policy")).toBe("auto");
    expect(inferShopLine(policy, "scan.pdf", "dec")).toBe("auto");
  });

  it("trusts Auto sheet for photo with weak OCR instead of defaulting Home skip", () => {
    expect(
      trustSheetLineForFill({
        sheetLine: "auto",
        inferred: "home",
        docType: "photo",
        mimeType: "image/jpeg",
        text: "",
      }),
    ).toBe(true);
    expect(
      trustSheetLineForFill({
        sheetLine: "auto",
        inferred: "home",
        docType: "photo",
        mimeType: "image/jpeg",
        text: "HOMEOWNERS Coverage A lots of OCR noise that used to skip Auto fills",
        filename: "1000010842.jpeg",
      }),
    ).toBe(true);
    expect(
      trustSheetLineForFill({
        sheetLine: "auto",
        inferred: "home",
        docType: "dec",
        mimeType: "application/pdf",
        text: "HOMEOWNERS Coverage A 310000 wind mit",
      }),
    ).toBe(false);
  });

  it("classifies source docs vs later quote-PDF attachments", () => {
    expect(inferDocType("wind-mit.pdf")).toBe("wind_mit");
    expect(inferDocType("4-point-inspection.pdf")).toBe("four_point");
    expect(inferDocType("roof-inspection.pdf")).toBe("inspection");
    expect(inferDocType("photo-dec.jpg")).toBe("photo");
    expect(inferDocType("floor-plan.pdf")).toBe("floor_plan");
    expect(inferDocType("floor_plan.jpg")).toBe("floor_plan");
    expect(inferDocType("carrier-quote.pdf")).toBe("quote_pdf");
    expect(inferDocType("proposal-Ruiz_Melbourne_HO3.pdf")).toBe("proposal");
    expect(inferDocType("signed-app.pdf")).toBe("signed_app");
    expect(inferDocType("building-permit.pdf")).toBe("permits");
    expect(inferDocType("hand-notes.txt")).toBe("hand_notes");
    expect(isSourceDocType("dec")).toBe(true);
    expect(isSourceDocType("floor_plan")).toBe(true);
    expect(isSourceDocType("current_policy")).toBe(true);
    expect(isSourceDocType("quote")).toBe(false);
    expect(isQuoteAttachment("quote", "later-quote.pdf")).toBe(true);
    expect(isQuoteAttachment("quote_pdf", "issued.pdf")).toBe(true);
    expect(isQuoteAttachment("wind_mit", "wind-mit-quote-notes.pdf")).toBe(false);
    expect(isQuoteAttachment("four_point", "4-point.pdf")).toBe(false);
  });

  it("keeps wind mit and 4-point on the homeowners sheet even if flood is mentioned", () => {
    expect(
      inferShopLine("Flood zone X noted on the page", "client-wind-mit.pdf", "wind_mit"),
    ).toBe("home");
    expect(inferShopLine("FOUR POINT INSPECTION", "4-point.pdf", "four_point")).toBe("home");
  });
});
