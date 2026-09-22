import { describe, expect, it } from "vitest";
import {
  bestQuotePremium,
  dealJobStamps,
  docsGlanceLabel,
  formatPremiumColumn,
  formatSilenceCue,
  noticeSlugsFromShopFlow,
  productStageSlugsFromShopFlow,
  premiumColumnAmount,
  quotesGlanceLabel,
  quotesSentGlanceLabel,
  stackProductLines,
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

  it("stamps a product-level quote sent (Gloria) and never invents Chase", () => {
    expect(
      dealJobStamps({
        stageStamp: null,
        stageLabel: "Quote sent",
        productStageSlugs: ["quote_sent"],
        noticeSlugs: ["chase"],
      }),
    ).toEqual(["Quote sent"]);
    expect(
      dealJobStamps({
        stageStamp: null,
        productStageSlugs: ["pending_inspection"],
      }),
    ).toEqual(["Inspection"]);
    expect(
      productStageSlugsFromShopFlow({
        productStages: { homeowners: { stage: "quote_sent" }, auto: { stage: "review" } },
      }),
    ).toEqual(["quote_sent", "review"]);
    expect(dealJobStamps({ stageStamp: null, noticeSlugs: ["chase"] })).not.toContain("Chase");
  });

  it("keeps Heather and Gloria products on their own lines", () => {
    const heather = stackProductLines({
      products: [
        { product: "homeowners", stage: "gathering" },
        { product: "auto", stage: "markets" },
        { product: "flood", stage: "quote_sent", noticeType: "inspection_before_bind" },
      ],
      quotes: [
        {
          id: "q-flood",
          shopLine: "flood",
          premium: 487,
          agentStatus: "sent_to_client",
          carrierName: "Flow",
          stub: false,
        },
        { id: "q-home", shopLine: "home", premium: 1840, agentStatus: "new", stub: false },
      ],
      selectedQuoteIds: { flood: ["q-flood"] },
    });
    expect(heather.map((line) => line.label)).toEqual(["HO3", "Auto", "Flood"]);
    expect(heather.map((line) => line.stageLabel)).toEqual(["Documents", "Markets", "Quotes"]);
    expect(heather[0]?.quoteSummary).toBe("1 quote pulled · best $1,840 · 1 pending");
    expect(heather[0]?.stamps).not.toContain("Quote sent");
    expect(heather[1]?.quoteSummary).toBe("No quotes yet");
    expect(heather[2]?.stamps).toEqual(expect.arrayContaining(["Quote sent", "Inspection"]));
    expect(heather[2]?.quoteSummary).toBe("$487 · Flow");
    expect(heather[2]?.quoteSummary).not.toMatch(/pulled/i);
    expect(heather[2]?.quoteSummary).not.toContain("1,840");

    const gloria = stackProductLines({
      products: [
        { product: "homeowners", label: "HO3", stage: "quote_sent" },
        { product: "landlord", label: "DP3", stage: "quote_review" },
      ],
      quotes: [{ shopLine: "home", notes: "DP3 landlord dwelling", premium: 900, agentStatus: "new", stub: false }],
    });
    expect(gloria.map((line) => `${line.label}:${line.stageLabel}`)).toEqual([
      "HO3:Quotes",
      "DP3:Quotes",
    ]);
    expect(gloria[0]?.stamps).toContain("Quote sent");
    expect(gloria[1]?.stamps).not.toContain("Quote sent");
    expect(gloria[0]?.quoteSummary).toBe("");
    expect(gloria[0]?.quoteSummary).not.toMatch(/pulled|No quotes yet/i);
    expect(gloria[1]?.quoteSummary).toContain("$900");
  });

  it("uses form codes on the stack — never vague Home", () => {
    expect(
      stackProductLines({
        products: [
          { product: "homeowners", label: "MHO", stage: "gathering" },
          { product: "life", label: "Term Life", stage: "markets" },
          { product: "auto", stage: "bound" },
        ],
      }).map((line) => line.label),
    ).toEqual(["MHO", "Term Life", "Auto"]);
    expect(
      stackProductLines({
        products: [{ product: "homeowners", stage: "gathering" }],
      })[0]?.label,
    ).toBe("HO3");
  });

  it("shows sent quote premium/carrier when Quote sent — never pull count", () => {
    expect(quotesSentGlanceLabel([{ premium: 2100, carrierName: "American Integrity" }])).toBe(
      "$2,100 · American Integrity",
    );
    expect(quotesSentGlanceLabel([{ premium: null, carrierName: "Safepoint" }])).toBe("Safepoint");
    expect(quotesSentGlanceLabel([{ premium: null, carrierName: null }])).toBe("");

    const sent = stackProductLines({
      products: [{ product: "homeowners", label: "HO3", stage: "quote_sent" }],
      quotes: [
        { id: "q1", shopLine: "home", premium: 2100, agentStatus: "sent_to_client", carrierName: "AI", stub: false },
        { id: "q2", shopLine: "home", premium: 2400, agentStatus: "new", carrierName: "Other", stub: false },
      ],
      selectedQuoteIds: { homeowners: ["q1"] },
    });
    expect(sent[0]?.stamps).toContain("Quote sent");
    expect(sent[0]?.quoteSummary).toBe("$2,100 · AI");
    expect(sent[0]?.quoteSummary).not.toMatch(/pulled/i);
    expect(sent[0]?.label).toBe("HO3");
  });
});
