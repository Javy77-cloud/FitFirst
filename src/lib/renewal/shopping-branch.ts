/**
 * Shopping is a branch off one renewal. The renewal stays open.
 * The deal is not started from the general deals list.
 * Client T-45 mail stays Renew / Call agent / I have questions.
 */

export const SHOPPING_IN_PROGRESS_BADGE = "shopping in progress" as const;

export const SHOPPING_RESOLUTIONS = ["accept", "replace", "drop"] as const;
export type ShoppingResolution = (typeof SHOPPING_RESOLUTIONS)[number];

export const CLIENT_T45_ACTIONS = ["Renew", "Call agent", "I have questions"] as const;

export type RenewalShoppingSnapshot = {
  emailsSent: number;
  clientResponse: string | null;
  comparisonShown: boolean;
  language: string | null;
  stage: string;
  capturedAt: string;
};

export type RenewalShopState = {
  queueId: string;
  policyId: string;
  stage: string;
  preShoppingStage: string | null;
  shoppingStatus: "in_progress" | "accepted" | "replaced" | "dropped" | null;
  shoppingDealId: string | null;
  beatsSuppressed: boolean;
  productKey: string;
  clientRequestedShop: boolean;
  cancellationRequired: boolean;
  cancelEffective: string | null;
  replacementPolicyId: string | null;
};

export type SiblingRenewal = {
  queueId: string;
  policyId: string;
  productKey: string;
  stage: string;
  shoppingStatus: string | null;
  beatsSuppressed: boolean;
};

export type ShoppingResolutionAudit = {
  resolution: ShoppingResolution;
  source: "shopping";
  clientRequestedShop: boolean;
  oldPolicyId: string;
  newPolicyId: string | null;
  cancelEffective: string | null;
  productKey: string;
  actorId: string | null;
  at: string;
};

export type ShoppingResolutionPlan = {
  error: string | null;
  shop: RenewalShopState;
  /** Other products on the contact stay on their own renewal path. */
  siblings: SiblingRenewal[];
  incumbentStatus: "non_renewed" | null;
  createPolicy: boolean;
  archiveDeal: boolean;
  audit: ShoppingResolutionAudit | null;
};

export function isShoppingResolution(value: string | null | undefined): value is ShoppingResolution {
  return (SHOPPING_RESOLUTIONS as readonly string[]).includes(value ?? "");
}

export function shoppingBadgeVisible(status: string | null | undefined): boolean {
  return status === "in_progress";
}

/** Renewal-shop deals are opened from the renewal badge, not the deals list. */
export function renewalShopBlockedFromDealsList(input: {
  renewalShop?: string | boolean | null;
  origin?: string | null;
}): boolean {
  if (input.renewalShop === true || input.renewalShop === "1" || input.renewalShop === "true") return true;
  return input.origin === "renewal_shop";
}

export function dealVisibleOnGeneralDealsList(deal: { renewalShop?: boolean | null }): boolean {
  return deal.renewalShop !== true;
}

export function clientRenewalEmailHasShopCta(actions: readonly string[]): boolean {
  return actions.some((action) => /\bshop\b/i.test(action));
}

export function buildRenewalShoppingSnapshot(input: {
  emailsSent?: number | null;
  clientResponse?: string | null;
  comparisonShown?: boolean | null;
  language?: string | null;
  stage: string;
  capturedAt: string;
}): RenewalShoppingSnapshot {
  const emails = Number(input.emailsSent ?? 0);
  return {
    emailsSent: Number.isFinite(emails) && emails > 0 ? Math.floor(emails) : 0,
    clientResponse: input.clientResponse?.trim() || null,
    comparisonShown: Boolean(input.comparisonShown),
    language: input.language?.trim() || null,
    stage: input.stage,
    capturedAt: input.capturedAt,
  };
}

export function planStartRenewalShopping(input: {
  stage: string;
  shoppingStatus: string | null;
  shoppingDealId: string | null;
  snapshot: RenewalShoppingSnapshot;
  productKey: string;
}): {
  alreadyOpen: boolean;
  shoppingStatus: "in_progress";
  preShoppingStage: string;
  beatsSuppressed: true;
  clientRequestedShop: true;
  stage: string;
  snapshot: RenewalShoppingSnapshot;
  productKey: string;
} {
  return {
    alreadyOpen: input.shoppingStatus === "in_progress" && Boolean(input.shoppingDealId),
    shoppingStatus: "in_progress",
    preShoppingStage: input.stage,
    beatsSuppressed: true,
    clientRequestedShop: true,
    stage: input.stage,
    snapshot: input.snapshot,
    productKey: input.productKey,
  };
}

function untouchedSiblings(shop: RenewalShopState, siblings: readonly SiblingRenewal[]): SiblingRenewal[] {
  return siblings
    .filter((row) => row.queueId !== shop.queueId)
    .map((row) => ({ ...row }));
}

export function planShoppingResolution(input: {
  resolution: ShoppingResolution;
  shop: RenewalShopState;
  siblings?: readonly SiblingRenewal[];
  newPolicyId?: string | null;
  cancelEffective?: string | null;
  actorId?: string | null;
  at: string;
  hasNewPolicyFields?: boolean;
}): ShoppingResolutionPlan {
  const siblings = untouchedSiblings(input.shop, input.siblings ?? []);
  const baseAudit = {
    source: "shopping" as const,
    clientRequestedShop: input.shop.clientRequestedShop,
    oldPolicyId: input.shop.policyId,
    productKey: input.shop.productKey,
    actorId: input.actorId ?? null,
    at: input.at,
  };

  if (input.shop.shoppingStatus !== "in_progress") {
    return {
      error: "Shopping is not in progress on this renewal.",
      shop: input.shop,
      siblings,
      incumbentStatus: null,
      createPolicy: false,
      archiveDeal: false,
      audit: null,
    };
  }

  if (input.resolution === "drop") {
    return {
      error: null,
      shop: {
        ...input.shop,
        stage: input.shop.preShoppingStage || input.shop.stage,
        shoppingStatus: "dropped",
        shoppingDealId: null,
        beatsSuppressed: false,
        cancellationRequired: false,
        cancelEffective: null,
        replacementPolicyId: null,
      },
      siblings,
      incumbentStatus: null,
      createPolicy: false,
      archiveDeal: true,
      audit: {
        ...baseAudit,
        resolution: "drop",
        newPolicyId: null,
        cancelEffective: null,
      },
    };
  }

  if (!input.newPolicyId && !input.hasNewPolicyFields) {
    return {
      error: "Select the quoted policy before accepting.",
      shop: input.shop,
      siblings,
      incumbentStatus: null,
      createPolicy: false,
      archiveDeal: false,
      audit: null,
    };
  }

  if (input.resolution === "replace" && !input.cancelEffective?.trim()) {
    return {
      error: "Replace needs the new policy start as the cancel effective date.",
      shop: input.shop,
      siblings,
      incumbentStatus: null,
      createPolicy: false,
      archiveDeal: false,
      audit: null,
    };
  }

  const cancelEffective = input.resolution === "replace" ? input.cancelEffective!.trim() : null;
  return {
    error: null,
    shop: {
      ...input.shop,
      stage: "bound",
      shoppingStatus: input.resolution === "replace" ? "replaced" : "accepted",
      beatsSuppressed: true,
      cancellationRequired: input.resolution === "replace",
      cancelEffective,
      replacementPolicyId: input.newPolicyId ?? input.shop.replacementPolicyId,
    },
    siblings,
    incumbentStatus: "non_renewed",
    createPolicy: !input.newPolicyId,
    archiveDeal: true,
    audit: {
      ...baseAudit,
      resolution: input.resolution,
      newPolicyId: input.newPolicyId ?? null,
      cancelEffective,
    },
  };
}
