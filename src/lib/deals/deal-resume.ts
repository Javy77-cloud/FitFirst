import { isAgentDealTab, parseAgentDealTab, type AgentDealTab } from "@/lib/deals/tabs";

export type { AgentDealTab };

/**
 * Per-agent deal resume. Last action wins.
 *
 * Layer 1 is the deal screen (Details, Documents, Markets, Quotes).
 * Layer 2 is the product / insurance form on that deal (instance key).
 * Form progress never overrides that pair. A form that is ready to bind
 * does not win over the form the agent opened last, even if the last form
 * is only on Documents.
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

export type ResumeScreenChoice = {
  tab: AgentDealTab;
  source: "explicit" | "remembered" | "default";
};

/**
 * Screen restore. Last screen wins.
 *
 * No memory, or a stored value that is not a deal screen → `default`
 * (today’s entry tab, including `ff_work_tab`). A remembered deal screen
 * is restored even when that step is already complete and even when
 * another form on the deal is closer to bind.
 */
export function selectResumeTab(input: {
  explicitTab?: string | null;
  rememberedTab?: string | null;
  defaultTab: AgentDealTab;
}): ResumeScreenChoice {
  if (hasText(input.explicitTab)) {
    return { tab: parseAgentDealTab(input.explicitTab), source: "explicit" };
  }
  const remembered = String(input.rememberedTab ?? "").trim();
  if (!remembered || !isAgentDealTab(remembered)) {
    return { tab: input.defaultTab, source: "default" };
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
 * Product restore. Last form wins.
 *
 * Explicit `product` or `line` wins over memory. Otherwise the remembered
 * instance key is opened. Progress, stage, and “nearest to bind” are not
 * inputs. A remembered key that is no longer on the deal opens the first
 * remaining form and sets `fallback` so the workspace can say so.
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
