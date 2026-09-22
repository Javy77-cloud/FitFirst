import { describe, expect, it } from "vitest";
import {
  bestQuotePremium,
  dealJobStamps,
  docsGlanceLabel,
  formatPremiumColumn,
  formatSilenceCue,
  isStackQuoteLanguage,
  noticeSlugsFromShopFlow,
  productStageSlugsFromShopFlow,
  premiumColumnAmount,
  quotesGlanceLabel,
  quotesSentGlanceLabel,
  stackHealthFlagged,
  stackPlaceLabel,
  stackProductLines,
  stackProductName,
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
        { id: "q2", shopLine: "home", premium: 2400, agentStatus: "new", stub: false, carrierName: "Other" },
      ],
      selectedQuoteIds: { homeowners: ["q1"] },
    });
    expect(sent[0]?.stamps).toContain("Quote sent");
    expect(sent[0]?.quoteSummary).toBe("$2,100 · AI");
    expect(sent[0]?.quoteSummary).not.toMatch(/pulled/i);
    expect(sent[0]?.label).toBe("HO3");
  });

  it("keeps Form / Stage / Quotes column purity — remaps stuffed premium into Quotes", () => {
    expect(isStackQuoteLanguage("1 quote pulled")).toBe(true);
    expect(isStackQuoteLanguage("No quotes yet")).toBe(true);
    expect(isStackQuoteLanguage("best $2,109 · 1 pending")).toBe(true);
    expect(isStackQuoteLanguage("HO3")).toBe(false);
    expect(isStackQuoteLanguage("Documents")).toBe(false);

    // Domenic-style: premium stuffed into Stage field
    const domenic = stackProductLines({
      products: [{ product: "homeowners", label: "HO3", stage: "best $2,109 · 1 pending" }],
    });
    expect(domenic[0]?.label).toBe("HO3");
    expect(domenic[0]?.label).not.toMatch(/pulled|quotes yet|best \$/i);
    expect(domenic[0]?.stageLabel).toBe("Documents");
    expect(domenic[0]?.stageLabel).not.toMatch(/premium|pending|pulled|\$/i);
    expect(domenic[0]?.quoteSummary).toMatch(/best \$2,109|2,109/);

    // Quote copy stuffed into Form label
    const formLeak = stackProductLines({
      products: [{ product: "auto", label: "1 quote pulled", stage: "markets" }],
    });
    expect(formLeak[0]?.label).toBe("Auto");
    expect(formLeak[0]?.label).not.toMatch(/pulled|quotes yet|best \$/i);
    expect(formLeak[0]?.stageLabel).toBe("Markets");
    expect(formLeak[0]?.stageLabel).not.toMatch(/premium|pending|pulled/i);
    expect(formLeak[0]?.quoteSummary).toMatch(/pulled/i);

    expect(stackProductName("homeowners", "No quotes yet")).toBe("HO3");
    expect(stackPlaceLabel("best $2,109 · 1 pending")).toBe("Documents");
    expect(stackPlaceLabel("gathering")).toBe("Documents");
    expect(stackPlaceLabel("quote_sent")).toBe("Quotes");
  });

  it("flags stack health red when cold OR client weak OR policy weak", () => {
    expect(stackHealthFlagged({ heat: "hot", clientHealth: 80, policyHealth: 80 })).toBe(false);
    expect(stackHealthFlagged({ heat: "cold", clientHealth: 80, policyHealth: 80 })).toBe(true);
    expect(stackHealthFlagged({ heat: "hot", clientHealth: 30, policyHealth: 80 })).toBe(true);
    // Mixed: Client green (≥40), Policy red (<40) → alert
    expect(stackHealthFlagged({ heat: "cooling", clientHealth: 80, policyHealth: 30 })).toBe(true);
    expect(stackHealthFlagged({ heat: "near_cold", clientHealth: 39, policyHealth: 39 })).toBe(true);
  });
});
