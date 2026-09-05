import { describe, expect, it } from "vitest";
import { reportFromSheet } from "@/lib/completeness/report";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { readyToShopCue } from "./ready-to-shop";

describe("ready-to-shop cues", () => {
  it("locks Ana at $321k and asks for double approval when the shop is unlocked=false", () => {
    const health = reportFromSheet("home", anaHomeSheetValues(fixture.risk));
    expect(health.shopBlockers.some((row) => row.key === "coverage_a")).toBe(false);
    const cue = readyToShopCue({
      isAna: true,
      sourceDocCount: 2,
      hasQuotingForm: true,
      fillFinished: true,
      unlocked: false,
      health,
    });
    expect(cue.kind).toBe("ana_lock");
    expect(cue.tone).toBe("lock");
    expect(cue.body).toMatch(/\$321,000/);
    expect(cue.body).toMatch(/Do not bind/);
    expect(cue.body).toMatch(/approve twice/i);
    expect(cue.fillStep).toBe(4);
  });

  it("keeps Ana unbound after approve — Fill unlock is not a bind", () => {
    const health = reportFromSheet("home", anaHomeSheetValues(fixture.risk));
    const cue = readyToShopCue({
      isAna: true,
      sourceDocCount: 2,
      hasQuotingForm: true,
      fillFinished: true,
      unlocked: true,
      health,
    });
    expect(cue.kind).toBe("ana_lock");
    expect(cue.body).toMatch(/Do not bind/);
    expect(cue.body).toMatch(/not policies/);
    expect(cue.fillStep).toBe(5);
  });

  it("asks a thin new deal for docs, then line, then fill, then the two-step approve", () => {
    const empty = reportFromSheet("home", emptySheetValues("home"));
    expect(
      readyToShopCue({
        isAna: false,
        sourceDocCount: 0,
        hasQuotingForm: false,
        fillFinished: false,
        unlocked: false,
        health: empty,
      }).kind,
    ).toBe("need_docs");
    expect(
      readyToShopCue({
        isAna: false,
        sourceDocCount: 1,
        hasQuotingForm: false,
        fillFinished: false,
        unlocked: false,
        health: empty,
      }).kind,
    ).toBe("need_line");
    expect(
      readyToShopCue({
        isAna: false,
        sourceDocCount: 1,
        hasQuotingForm: true,
        fillFinished: false,
        unlocked: false,
        health: empty,
      }).kind,
    ).toBe("need_fill");
    const cue = readyToShopCue({
      isAna: false,
      sourceDocCount: 1,
      hasQuotingForm: true,
      fillFinished: true,
      unlocked: false,
      health: empty,
    });
    expect(cue.kind).toBe("need_glance");
    expect(cue.body).toMatch(/approve|unlock/i);
  });
});
