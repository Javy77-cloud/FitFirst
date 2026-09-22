import { describe, expect, it } from "vitest";
import { ROSA_DEC_DEAL_ID } from "@/lib/policy/dec-prompt";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { WIND_MIT_INSPECTION_KEY } from "@/lib/quote-sheet/home-inspections";
import {
  ROSA_ALARM_DOCUMENT_ID,
  ROSA_GATHERING_DEAL_ID,
  ROSA_WIND_MIT_DOCUMENT_ID,
  rosaGatheringRetagDecision,
} from "./rosa-gathering-sources";

const WIND_NAME = "HENRY & ROSA CASTELLANOS MIT PDFwind mitigation inspection Kendall October 2020.PDF";
const ALARM_NAME = "ADT alarm certificate.pdf";

describe("Rosa gathering source retag", () => {
  it("is the gathering deal, not the closed-won Florida Peninsula shop", () => {
    expect(ROSA_GATHERING_DEAL_ID).toBe("260de6f1-d91b-4e9f-ae0e-61e38de04b52");
    expect(ROSA_DEC_DEAL_ID.startsWith("5d4a4c04")).toBe(true);
    expect(ROSA_GATHERING_DEAL_ID).not.toBe(ROSA_DEC_DEAL_ID);
  });

  it("retags the two other docs and leaves a correct or foreign row alone", () => {
    expect(
      rosaGatheringRetagDecision({
        id: ROSA_WIND_MIT_DOCUMENT_ID,
        dealId: ROSA_GATHERING_DEAL_ID,
        filename: WIND_NAME,
        docType: "other",
      }),
    ).toEqual({ action: "retag", docType: "wind_mit" });
    expect(
      rosaGatheringRetagDecision({
        id: ROSA_ALARM_DOCUMENT_ID,
        dealId: ROSA_GATHERING_DEAL_ID,
        filename: ALARM_NAME,
        docType: "other",
      }),
    ).toEqual({ action: "retag", docType: "alarm_certificate" });
    expect(
      rosaGatheringRetagDecision({
        id: ROSA_WIND_MIT_DOCUMENT_ID,
        dealId: ROSA_GATHERING_DEAL_ID,
        filename: WIND_NAME,
        docType: "wind_mit",
      }),
    ).toEqual({ action: "keep", docType: "wind_mit" });
    expect(
      rosaGatheringRetagDecision({
        id: ROSA_ALARM_DOCUMENT_ID,
        dealId: ROSA_DEC_DEAL_ID,
        filename: ALARM_NAME,
        docType: "other",
      }).action,
    ).toBe("skip");
    expect(
      rosaGatheringRetagDecision({
        id: ROSA_WIND_MIT_DOCUMENT_ID,
        dealId: ROSA_GATHERING_DEAL_ID,
        filename: "Florida Peninsula Dec Page.pdf",
        docType: "other",
      }),
    ).toEqual({ action: "skip", reason: "filename" });
  });

  it("fills wind-mit OIR fields and the inspection flag, and alarm yes without that flag", () => {
    const blank = emptySheetValues("home");
    const wind = applyExtractedToSheet(
      "home",
      blank,
      [{ fieldKey: "wind_mit_form", normalizedValue: "OIR-B1-1802" }],
      { docType: "wind_mit" },
    );
    expect(wind.values.wind_mit_form?.value).toBe("OIR-B1-1802");
    expect(wind.values[WIND_MIT_INSPECTION_KEY]?.value).toBe("yes");

    const alarm = applyExtractedToSheet(
      "home",
      blank,
      [
        { fieldKey: "fire_alarm", normalizedValue: "yes" },
        { fieldKey: "central_alarm", normalizedValue: "yes" },
      ],
      { docType: "alarm_certificate" },
    );
    expect(alarm.values.fire_alarm?.value).toBe("yes");
    expect(alarm.values.central_alarm?.value).toBe("yes");
    expect(alarm.values[WIND_MIT_INSPECTION_KEY]).toBeUndefined();
  });
});
