import { describe, expect, it } from "vitest";
import {
  bestQuotePremium,
  dealJobStamps,
  docsGlanceLabel,
  formatPremiumColumn,
  formatSilenceCue,
  noticeSlugsFromShopFlow,
  premiumColumnAmount,
  quotesGlanceLabel,
} from "./card-glance";

describe("deal card glance", () => {
  it("keeps the money column premium-only and dashes when premium is missing", () => {
    expect(premiumColumnAmount({ premium: null, coverageA: 500_000, faceAmount: 1_000_000 })).toBeNull();
    expect(premiumColumnAmount({ premium: 0, coverageA: 250_000 })).toBeNull();
    expect(premiumColumnAmount({ premium: "1840.5", coverageA: 400_000 })).toBe(1840.5);
    expect(formatPremiumColumn(null)).toBe("—");
    expect(formatPremiumColumn(0)).toBe("—");
    expect(formatPremiumColumn(1840)).toBe("$1,840");
    expect(bestQuotePremium([2400, null, 0, 1810, "1900"])).toBe(1810);
  });

  it("says what the job is: docs, quotes, and one silence cue", () => {
    expect(docsGlanceLabel(true)).toBe("Docs in");
    expect(docsGlanceLabel(false)).toBe("Docs needed");
    expect(quotesGlanceLabel({ count: 0, bestPremium: null, pending: 0 })).toBe("No quotes yet");
    expect(quotesGlanceLabel({ count: 3, bestPremium: 1240, pending: 1 })).toBe(
      "3 quotes pulled · best $1,240 · 1 pending",
    );
    expect(formatSilenceCue(16)).toBe("16 days silent");
    expect(formatSilenceCue(1)).toBe("1 day silent");
    expect(formatSilenceCue(1 / 24)).toBe("1 hour silent");
    expect(formatSilenceCue(0.2)).not.toMatch(/^1h$/);
  });

  it("shows inspection, quote sent, bound, and payment due stamps", () => {
    expect(
      dealJobStamps({
        stageStamp: "bound",
        quoteSent: true,
        inspection: true,
        noticeSlugs: ["check_mortgagee_payment", "inspection_before_bind"],
      }),
    ).toEqual(["Quote sent", "Bound", "Inspection", "Payment due"]);
    expect(
      noticeSlugsFromShopFlow({
        productStages: {
          home: { noticeType: "inspection_before_bind" },
          auto: { inspectionStatus: "none" },
          flood: { noticeType: "check_mortgagee_payment" },
        },
      }),
    ).toEqual(["inspection_before_bind", "check_mortgagee_payment"]);
  });
});
