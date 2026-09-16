import { describe, expect, it } from "vitest";
import type { CarrierMatch } from "./match";
import {
  APPETITE_BAND_COPY,
  appetiteAction,
  appetiteActionLabel,
  appetiteNote,
  appointmentLabel,
  dontWriteNote,
  isAppointedMatch,
  marketWhy,
} from "./present";

function match(partial: Partial<CarrierMatch>): CarrierMatch {
  return {
    carrierId: "c1",
    carrierName: "Demo",
    band: "green",
    fitScore: 80,
    reasons: [],
    learnedDecline: false,
    shoppable: true,
    ...partial,
  };
}

describe("appetite presentation (no matcher change)", () => {
  it("maps bands to shop / caution / don't-write", () => {
    expect(appetiteAction("green")).toBe("shop");
    expect(appetiteAction("yellow")).toBe("caution");
    expect(appetiteAction("red")).toBe("dont_write");
    expect(appetiteActionLabel("green")).toBe("Shop");
    expect(appetiteActionLabel("yellow")).toBe("Caution");
    expect(appetiteActionLabel("red")).toBe("Don't write");
    expect(APPETITE_BAND_COPY.red).toBe("Don't write");
  });

  it("surfaces appointment from the not_appointed reason", () => {
    const appointed = match({
      reasons: [{ code: "portal_open", message: "Portal open", severity: "pass" }],
    });
    const paper = match({
      band: "red",
      shoppable: false,
      reasons: [
        { code: "not_appointed", message: "Not appointed to write this line", severity: "fail" },
      ],
    });
    expect(isAppointedMatch(appointed)).toBe(true);
    expect(appointmentLabel(appointed)).toBe("Appointed");
    expect(isAppointedMatch(paper)).toBe(false);
    expect(appointmentLabel(paper)).toBe("Not appointed");
  });

  it("keeps don't-write notes visible on skip rows", () => {
    const row = match({
      band: "red",
      reasons: [
        { code: "roof_age", message: "Roof age 37y exceeds max 15y", severity: "fail" },
        { code: "dont_write", message: "No coastal frame HO3", severity: "pass" },
      ],
    });
    expect(dontWriteNote(row)).toBe("No coastal frame HO3");
    expect(marketWhy(row)).toContain("Roof age");
    expect(marketWhy(row)).not.toBe("No coastal frame HO3");
  });

  it("surfaces published appetite notes when the risk clears structured limits", () => {
    const row = match({
      reasons: [
        { code: "portal_open", message: "Portal open", severity: "pass" },
        {
          code: "appetite_note",
          message: "FL HO-3 via QuoteRUSH. Minimum Coverage A $300,000.",
          severity: "pass",
        },
      ],
    });
    expect(appetiteNote(row)).toMatch(/\$300,000/);
    expect(marketWhy(row)).toMatch(/QuoteRUSH/);
  });
});
