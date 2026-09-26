import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CLIENT_T45_ACTIONS,
  SHOPPING_IN_PROGRESS_BADGE,
  buildRenewalShoppingSnapshot,
  clientRenewalEmailHasShopCta,
  dealVisibleOnGeneralDealsList,
  planShoppingResolution,
  planStartRenewalShopping,
  renewalShopBlockedFromDealsList,
  shoppingBadgeVisible,
  type RenewalShopState,
} from "./shopping-branch";

function shop(partial: Partial<RenewalShopState> = {}): RenewalShopState {
  return {
    queueId: "q-med",
    policyId: "pol-med",
    stage: "contacted",
    preShoppingStage: "contacted",
    shoppingStatus: "in_progress",
    shoppingDealId: "deal-1",
    beatsSuppressed: true,
    productKey: "medical",
    clientRequestedShop: true,
    cancellationRequired: false,
    cancelEffective: null,
    replacementPolicyId: null,
    ...partial,
  };
}

describe("renewal shopping branch", () => {
  it("snapshots renewal state and keeps the renewal open", () => {
    const snapshot = buildRenewalShoppingSnapshot({
      emailsSent: 2,
      clientResponse: "Call me",
      comparisonShown: true,
      language: "es",
      stage: "quoted",
      capturedAt: "2026-09-26T00:00:00.000Z",
    });
    const plan = planStartRenewalShopping({
      stage: "quoted",
      shoppingStatus: null,
      shoppingDealId: null,
      snapshot,
      productKey: "medical",
    });
    expect(plan.alreadyOpen).toBe(false);
    expect(plan.stage).toBe("quoted");
    expect(plan.clientRequestedShop).toBe(true);
    expect(plan.beatsSuppressed).toBe(true);
    expect(plan.snapshot.comparisonShown).toBe(true);
    expect(plan.snapshot.language).toBe("es");
    expect(shoppingBadgeVisible(plan.shoppingStatus)).toBe(true);
    expect(SHOPPING_IN_PROGRESS_BADGE).toBe("shopping in progress");
  });

  it("blocks renewal-shop create from the general deals list", () => {
    expect(renewalShopBlockedFromDealsList({ renewalShop: "1" })).toBe(true);
    expect(renewalShopBlockedFromDealsList({ origin: "renewal_shop" })).toBe(true);
    expect(renewalShopBlockedFromDealsList({ origin: "manual" })).toBe(false);
    expect(dealVisibleOnGeneralDealsList({ renewalShop: true })).toBe(false);
    expect(dealVisibleOnGeneralDealsList({ renewalShop: false })).toBe(true);
  });

  it("accepts the shopped product, suppresses beats, and leaves siblings alone", () => {
    const dental = {
      queueId: "q-den",
      policyId: "pol-den",
      productKey: "dental",
      stage: "upcoming",
      shoppingStatus: null,
      beatsSuppressed: false,
    };
    const plan = planShoppingResolution({
      resolution: "accept",
      shop: shop({ productKey: "medical" }),
      siblings: [dental],
      newPolicyId: "pol-new",
      at: "2026-09-26T12:00:00.000Z",
      actorId: "agent-1",
    });
    expect(plan.error).toBeNull();
    expect(plan.shop.stage).toBe("bound");
    expect(plan.shop.shoppingStatus).toBe("accepted");
    expect(plan.shop.beatsSuppressed).toBe(true);
    expect(plan.incumbentStatus).toBe("non_renewed");
    expect(plan.createPolicy).toBe(false);
    expect(plan.audit).toMatchObject({
      resolution: "accept",
      source: "shopping",
      clientRequestedShop: true,
      oldPolicyId: "pol-med",
      newPolicyId: "pol-new",
      actorId: "agent-1",
    });
    expect(plan.siblings).toEqual([dental]);
  });

  it("replace flags cancellation at the new policy start and keeps the audit source", () => {
    const plan = planShoppingResolution({
      resolution: "replace",
      shop: shop(),
      newPolicyId: "pol-new",
      cancelEffective: "2026-11-01",
      at: "2026-09-26T12:00:00.000Z",
    });
    expect(plan.error).toBeNull();
    expect(plan.shop.shoppingStatus).toBe("replaced");
    expect(plan.shop.cancellationRequired).toBe(true);
    expect(plan.shop.cancelEffective).toBe("2026-11-01");
    expect(plan.audit?.resolution).toBe("replace");
    expect(plan.audit?.source).toBe("shopping");
    expect(plan.audit?.cancelEffective).toBe("2026-11-01");
  });

  it("drop closes the branch without a policy and resumes beats", () => {
    const plan = planShoppingResolution({
      resolution: "drop",
      shop: shop({ stage: "quoted", preShoppingStage: "contacted" }),
      at: "2026-09-26T12:00:00.000Z",
    });
    expect(plan.error).toBeNull();
    expect(plan.createPolicy).toBe(false);
    expect(plan.incumbentStatus).toBeNull();
    expect(plan.shop.stage).toBe("contacted");
    expect(plan.shop.shoppingStatus).toBe("dropped");
    expect(plan.shop.shoppingDealId).toBeNull();
    expect(plan.shop.beatsSuppressed).toBe(false);
    expect(plan.archiveDeal).toBe(true);
    expect(plan.audit?.resolution).toBe("drop");
    expect(plan.audit?.newPolicyId).toBeNull();
    expect(shoppingBadgeVisible(plan.shop.shoppingStatus)).toBe(false);
  });

  it("keeps the client T-45 actions free of a shop button", () => {
    expect([...CLIENT_T45_ACTIONS]).toEqual(["Renew", "Call agent", "I have questions"]);
    expect(clientRenewalEmailHasShopCta(CLIENT_T45_ACTIONS)).toBe(false);
  });

  it("wires the renewal button, badge, and confirm screens", () => {
    const card = readFileSync("src/components/renewals/renewal-card.tsx", "utf8");
    const shop = readFileSync("src/components/renewals/shop-for-quotes.tsx", "utf8");
    const resolve = readFileSync("src/components/renewals/shopping-resolution.tsx", "utf8");
    const deals = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(card).toMatch(/ShopForQuotes/);
    expect(shop).toMatch(/data-ff-shop-for-quotes/);
    expect(shop).toMatch(/data-ff-shopping-badge/);
    expect(shop).toMatch(/SHOPPING_IN_PROGRESS_BADGE/);
    expect(resolve).toMatch(/data-ff-shop-accept-confirm/);
    expect(resolve).toMatch(/data-ff-shop-replace-confirm/);
    expect(resolve).toMatch(/data-ff-shop-drop-confirm/);
    expect(deals).toMatch(/renewalShopBlockedFromDealsList/);
  });
});
