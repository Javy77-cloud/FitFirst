import {
  AGENT_DEAL_TAB_LABELS,
  AGENT_DEAL_TABS,
  isAgentDealTab,
  parseAgentDealTab,
  type AgentDealTab,
} from "@/lib/deals/tabs";

export type { AgentDealTab };

/**
 * Per-agent deal resume.
 *
 * Layer 1 is the deal screen (Details, Documents, Markets, Quotes).
 * Layer 2 is the product / insurance form on that deal (instance key).
 *
 * Stored on `agent_ui_prefs.deal_resume` for the signed-in user
 * (`actor_key = user:<id>`), so a refresh or leaving the deal still
 * restores this agent’s place. It is not the shared deal `ff_work_tab`.
 */
export const DEAL_RESUME_VERSION = 1;
export const DEAL_RESUME_DEAL_LIMIT = 40;

/** Gloria Martinez DP3 deal — reference multi-product property file. */
export const GLORIA_MARTINEZ_DEAL_ID = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";

export type DealResumePlace = {
  productKey: string;
  tab: AgentDealTab;
  at: number;
};

export type DealResumeMemory = {
  version: typeof DEAL_RESUME_VERSION;
  lastDealId: string | null;
  deals: Record<string, DealResumePlace>;
};

export type DealStepCompletion = Record<AgentDealTab, boolean>;

export type ResumeProductFallback = {
  missingProductKey: string;
  openedKey: string;
};

export function emptyDealResumeMemory(): DealResumeMemory {
  return { version: DEAL_RESUME_VERSION, lastDealId: null, deals: {} };
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

export function emptyStepCompletion(): DealStepCompletion {
  return { details: false, documents: false, markets: false, quotes: false };
}

export function parseDealResumeMemory(raw: unknown): DealResumeMemory {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyDealResumeMemory();
  const row = raw as Partial<DealResumeMemory>;
  const deals: Record<string, DealResumePlace> = {};
  if (row.deals && typeof row.deals === "object" && !Array.isArray(row.deals)) {
    for (const [dealId, place] of Object.entries(row.deals)) {
      const parsed = parseDealResumePlace(dealId, place);
      if (parsed) deals[parsed.dealId] = parsed.place;
    }
  }
  const lastDealId = typeof row.lastDealId === "string" && deals[row.lastDealId] ? row.lastDealId : null;
  return {
    version: DEAL_RESUME_VERSION,
    lastDealId,
    deals: trimResumeDeals(deals),
  };
}

function parseDealResumePlace(
  dealId: string,
  raw: unknown,
): { dealId: string; place: DealResumePlace } | null {
  const id = dealId.trim();
  if (!id || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Partial<DealResumePlace>;
  const productKey = String(row.productKey ?? "").trim();
  const tab = String(row.tab ?? "").trim();
  const at = typeof row.at === "number" && Number.isFinite(row.at) ? row.at : 0;
  if (!productKey || productKey.length > 80 || !isAgentDealTab(tab)) return null;
  return { dealId: id, place: { productKey, tab, at } };
}

function trimResumeDeals(deals: Record<string, DealResumePlace>): Record<string, DealResumePlace> {
  const ranked = Object.entries(deals).sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(ranked.slice(0, DEAL_RESUME_DEAL_LIMIT));
}

export function rememberDealPlace(
  memory: DealResumeMemory | null | undefined,
  input: { dealId: string; productKey: string; tab: AgentDealTab; at?: number },
): DealResumeMemory {
  const base = memory?.version === DEAL_RESUME_VERSION ? memory : parseDealResumeMemory(memory);
  const dealId = String(input.dealId ?? "").trim();
  const productKey = String(input.productKey ?? "").trim();
  if (!dealId || !productKey || !isAgentDealTab(input.tab)) return base;
  const at = typeof input.at === "number" && Number.isFinite(input.at) ? input.at : Date.now();
  const deals = trimResumeDeals({
    ...base.deals,
    [dealId]: { productKey, tab: input.tab, at },
  });
  return {
    version: DEAL_RESUME_VERSION,
    lastDealId: dealId,
    deals,
  };
}

export function dealResumePlaceUnchanged(
  memory: DealResumeMemory | null | undefined,
  input: { dealId: string; productKey: string; tab: AgentDealTab },
): boolean {
  const current = memory?.deals?.[input.dealId];
  if (!current) return false;
  return current.productKey === input.productKey && current.tab === input.tab;
}

/** First incomplete screen. When every screen is done, Quotes stays open. */
export function furthestUnfinishedDealTab(completion: DealStepCompletion): AgentDealTab {
  for (const tab of AGENT_DEAL_TABS) {
    if (!completion[tab]) return tab;
  }
  return "quotes";
}

export type ResumeScreenChoice = {
  tab: AgentDealTab;
  source: "explicit" | "remembered" | "furthest-unfinished" | "default";
};

/**
 * Screen restore for one product.
 *
 * No memory → `default` (the deal’s existing entry tab, including `ff_work_tab`).
 * An in-progress remembered screen wins, even when it is later than the
 * inferred next step (Details and Risk Profile done, sitting on Markets).
 * A remembered screen that is already complete yields to the furthest
 * unfinished later screen so a teammate’s stage advance is not replayed.
 * Anything that is not a deal tab becomes that furthest unfinished screen.
 */
export function selectResumeTab(input: {
  explicitTab?: string | null;
  rememberedTab?: string | null;
  completion: DealStepCompletion;
  defaultTab: AgentDealTab;
}): ResumeScreenChoice {
  if (hasText(input.explicitTab)) {
    return { tab: parseAgentDealTab(input.explicitTab), source: "explicit" };
  }
  const remembered = String(input.rememberedTab ?? "").trim();
  if (!remembered) return { tab: input.defaultTab, source: "default" };
  if (!isAgentDealTab(remembered)) {
    return { tab: furthestUnfinishedDealTab(input.completion), source: "furthest-unfinished" };
  }
  if (!input.completion[remembered]) {
    return { tab: remembered, source: "remembered" };
  }
  const furthest = furthestUnfinishedDealTab(input.completion);
  if (AGENT_DEAL_TABS.indexOf(furthest) > AGENT_DEAL_TABS.indexOf(remembered)) {
    return { tab: furthest, source: "furthest-unfinished" };
  }
  return { tab: remembered, source: "remembered" };
}

export type ResumeProductChoice = {
  /** `undefined` keeps the URL product. A string forces that instance key. */
  productParam: string | undefined;
  /** Drop the URL line so it cannot open a different form than the memory. */
  ignoreLine: boolean;
  fallback: ResumeProductFallback | null;
};

/**
 * Product restore. Explicit `product` or `line` wins.
 * A remembered key that is no longer on the deal opens the first remaining
 * form and sets `fallback` so the workspace can say so.
 */
export function selectResumeProduct(input: {
  explicitProduct?: string | null;
  explicitLine?: string | null;
  rememberedProductKey?: string | null;
  instanceKeys: readonly string[];
}): ResumeProductChoice {
  const keys = input.instanceKeys.map((key) => String(key ?? "").trim()).filter(Boolean);
  const explicitProduct = String(input.explicitProduct ?? "").trim();
  const explicitLine = String(input.explicitLine ?? "").trim();
  if (!keys.length) {
    return { productParam: undefined, ignoreLine: false, fallback: null };
  }
  if (explicitProduct || explicitLine) {
    if (explicitProduct && !keys.includes(explicitProduct)) {
      const openedKey = keys[0]!;
      return {
        productParam: openedKey,
        ignoreLine: true,
        fallback: { missingProductKey: explicitProduct, openedKey },
      };
    }
    return { productParam: undefined, ignoreLine: false, fallback: null };
  }
  const remembered = String(input.rememberedProductKey ?? "").trim();
  if (!remembered) {
    return { productParam: undefined, ignoreLine: false, fallback: null };
  }
  if (keys.includes(remembered)) {
    return { productParam: remembered, ignoreLine: true, fallback: null };
  }
  const openedKey = keys[0]!;
  return {
    productParam: openedKey,
    ignoreLine: true,
    fallback: { missingProductKey: remembered, openedKey },
  };
}

export function shouldPersistDealResume(input: {
  tab?: string | null;
  product?: string | null;
  line?: string | null;
}): boolean {
  return hasText(input.tab) || hasText(input.product) || hasText(input.line);
}

export function deletedProductNotice(missingProductKey: string, openedLabel: string): string {
  const missing = missingProductKey.trim() || "That product";
  const opened = openedLabel.trim() || "the first product still on this deal";
  return `${missing} is no longer on this deal. Opened ${opened} so this is not the form you last worked.`;
}

export function advancedStepNotice(tab: AgentDealTab): string {
  return `That step is already finished. Opened ${AGENT_DEAL_TAB_LABELS[tab]}.`;
}
