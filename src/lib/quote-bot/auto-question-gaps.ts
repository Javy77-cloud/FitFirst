import fs from "node:fs";
import path from "node:path";
import {
  matchAutoRiskProfileQuestion,
  questionContent,
  similarAutoQuestions,
} from "@/lib/quote-bot/auto-profile-match";

/** In-repo list quote bots append to. Readable as JSON; grouped by similar question. */
export const AUTO_QUESTION_GAPS_RELATIVE_PATH = "data/quote-bot/auto-question-gaps.json";

export const AUTO_QUESTION_GAPS_DOC_PATH = "/developer/auto-question-gaps";

export const FREE_TEXT_OPTIONS_NOTE = "Free text — carrier offered no answer choices.";

export const MIXED_OPTIONS_NOTE =
  "Some pulls were free text. Choices listed are the union of answers the carrier offered.";

/** Fixed clock for comment-seeded rows so the committed file stays stable. */
export const SEEDED_AT = "2026-09-11T16:00:00.000Z";

const SIGHTING_CAP = 8;

const LIST_DESCRIPTION =
  "Auto carrier questions that are not on the Auto risk profile (AUTO_FIELDS and repeatable vehicle, driver, and household blocks). Grouped by similar question. Counts bump and answer choices are a union. This file does not add risk-profile fields.";

export type AutoQuestionGapCarrier = {
  carrierId: string | null;
  carrierName: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AutoQuestionGapPhrasing = {
  text: string;
  count: number;
};

export type AutoQuestionGapSighting = {
  at: string;
  carrierId: string | null;
  carrierName: string;
  question: string;
  dealId: string | null;
  url: string | null;
  selector: string | null;
};

export type AutoQuestionGap = {
  id: string;
  shopLine: "auto";
  /** Content words of the first phrasing. Later similar asks stay on this row. */
  normalizedQuestion: string;
  /** Most common exact wording so far. */
  canonicalQuestion: string;
  count: number;
  phrasings: AutoQuestionGapPhrasing[];
  options: string[];
  optionsNote: string | null;
  carriers: AutoQuestionGapCarrier[];
  sources: string[];
  recentSightings: AutoQuestionGapSighting[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AutoQuestionGapList = {
  version: 1;
  shopLine: "auto";
  description: string;
  updatedAt: string;
  entries: AutoQuestionGap[];
};

export type AutoQuoteGapInput = {
  question: string;
  options?: readonly string[] | null;
  carrierId?: string | null;
  carrierName: string;
  dealId?: string | null;
  url?: string | null;
  selector?: string | null;
  shopLine?: string | null;
  lineOfBusiness?: string | null;
  source?: string | null;
  at?: string | null;
};

export type AutoQuoteGapSkipReason = "empty" | "not_auto" | "on_profile" | "operational" | "store_unwritable";

export type AutoQuoteGapResult =
  | { captured: false; reason: AutoQuoteGapSkipReason; fieldKey?: string; label?: string }
  | { captured: true; created: boolean; id: string; count: number };

export type GapStore = {
  read: () => AutoQuestionGapList;
  write: (list: AutoQuestionGapList) => void;
};

export function emptyAutoQuestionGapList(updatedAt = SEEDED_AT): AutoQuestionGapList {
  return {
    version: 1,
    shopLine: "auto",
    description: LIST_DESCRIPTION,
    updatedAt,
    entries: [],
  };
}

export function autoQuestionGapsPath(root = process.cwd()): string {
  return path.join(root, AUTO_QUESTION_GAPS_RELATIVE_PATH);
}

export function isAutoShopContext(input: {
  shopLine?: string | null;
  lineOfBusiness?: string | null;
}): boolean {
  const line = String(input.shopLine ?? "").trim().toLowerCase();
  const lob = String(input.lineOfBusiness ?? "").trim().toUpperCase();
  if (line === "auto") return true;
  if (!line && (lob === "AUTO" || lob === "PA")) return true;
  return false;
}

function clean(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function sameCarrier(row: AutoQuestionGapCarrier, carrierId: string | null, carrierName: string): boolean {
  const name = carrierName.trim().toLowerCase();
  if (row.carrierName.trim().toLowerCase() !== name) return false;
  if (row.carrierId && carrierId && row.carrierId !== carrierId) return false;
  return true;
}

function sortPhrasings(rows: AutoQuestionGapPhrasing[]): AutoQuestionGapPhrasing[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => b.row.count - a.row.count || a.index - b.index)
    .map((item) => item.row);
}

function unionOption(options: string[], next: string): string[] {
  const trimmed = next.trim();
  if (!trimmed) return options;
  if (options.some((option) => option.toLowerCase() === trimmed.toLowerCase())) return options;
  return [...options, trimmed];
}

function optionsNoteFor(options: string[], sawFreeText: boolean): string | null {
  if (options.length === 0) return FREE_TEXT_OPTIONS_NOTE;
  if (sawFreeText) return MIXED_OPTIONS_NOTE;
  return null;
}

function slugFromContent(content: string): string {
  const slug = content.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80);
  return slug || "question";
}

function isReadonlyFs(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

export function memoryGapStore(initial?: AutoQuestionGapList): GapStore {
  let list = initial ?? emptyAutoQuestionGapList();
  return {
    read: () => list,
    write: (next) => {
      list = next;
    },
  };
}

export function fileGapStore(filePath = autoQuestionGapsPath()): GapStore {
  return {
    read: () => {
      if (!fs.existsSync(filePath)) return emptyAutoQuestionGapList();
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as AutoQuestionGapList;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return emptyAutoQuestionGapList();
      return parsed;
    },
    write: (list) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(list, null, 2)}\n`);
      fs.renameSync(tmp, filePath);
    },
  };
}

let defaultStore: GapStore | null = null;

function storeOrDefault(store?: GapStore): GapStore {
  if (store) return store;
  if (!defaultStore) defaultStore = fileGapStore();
  return defaultStore;
}

export function readAutoQuestionGapList(store?: GapStore): AutoQuestionGapList {
  return storeOrDefault(store).read();
}

function operationalClause(raw: string): boolean {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (text.length > 80) return true;
  if (/^(no premium|not inventing|next disabled|mvr|mvr n)$/i.test(text)) return true;
  return /ineligible|\bdeclined\b|consumer report|system error|password expired|quoting maintenance|convert to new business|timed out|timeout|portal error|couldn.?t finish/i.test(
    text,
  );
}

function cleanAsk(part: string): string {
  return part
    .replace(/\([^)]*\)/g, " ")
    .replace(/,?\s*not inventing\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull short carrier asks out of a quote-attempt why. Ignores UW paragraphs. */
export function questionsFromAttemptWhy(why: string | null | undefined): string[] {
  const text = String(why ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const patterns = [
    /portal why:\s*([^.]*)/gi,
    /leftover:\s*([^.]*)/gi,
    /holding\s*[—–-]\s*([^.]*)/gi,
    /waiting\s+([^.]*)/gi,
  ];
  const chunks: string[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const chunk = (match[1] ?? "").trim();
      if (!chunk || operationalClause(chunk)) continue;
      chunks.push(chunk);
    }
  }
  const questions: string[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const parts = chunk.split(/\s*(?:\+|;|\band\b)\s*/i);
    for (const part of parts) {
      const cleaned = cleanAsk(part);
      if (!cleaned || operationalClause(cleaned)) continue;
      const key = questionContent(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      questions.push(cleaned);
    }
  }
  return questions;
}

/**
 * Append one carrier question. Same carrier + similar wording bumps the count
 * and unions answer choices. Questions already on the Auto risk profile are skipped.
 */
export function recordAutoQuoteGap(input: AutoQuoteGapInput, store?: GapStore): AutoQuoteGapResult {
  const question = String(input.question ?? "").trim();
  if (!question) return { captured: false, reason: "empty" };
  const shopLine = input.shopLine ?? (input.lineOfBusiness ? null : "auto");
  if (!isAutoShopContext({ shopLine, lineOfBusiness: input.lineOfBusiness })) {
    return { captured: false, reason: "not_auto" };
  }
  if (operationalClause(question)) return { captured: false, reason: "operational" };
  const matched = matchAutoRiskProfileQuestion(question);
  if (matched.onProfile) {
    return { captured: false, reason: "on_profile", fieldKey: matched.fieldKey, label: matched.label };
  }

  const content = questionContent(question);
  if (!content) return { captured: false, reason: "empty" };

  const at = clean(input.at) ?? new Date().toISOString();
  const carrierName = input.carrierName.trim() || "Carrier";
  const carrierId = clean(input.carrierId);
  const dealId = clean(input.dealId);
  const url = clean(input.url);
  const selector = clean(input.selector);
  const source = clean(input.source);
  const offered = (input.options ?? []).map((option) => String(option).trim()).filter(Boolean);
  const freeText = offered.length === 0;

  const gapStore = storeOrDefault(store);
  const list = gapStore.read();
  let entry = list.entries.find((row) => similarAutoQuestions(row.normalizedQuestion, content));
  let created = false;

  if (!entry) {
    created = true;
    const idBase = slugFromContent(content);
    const taken = new Set(list.entries.map((row) => row.id));
    let id = idBase;
    let n = 2;
    while (taken.has(id)) {
      id = `${idBase}-${n}`;
      n += 1;
    }
    entry = {
      id,
      shopLine: "auto",
      normalizedQuestion: content,
      canonicalQuestion: question,
      count: 0,
      phrasings: [],
      options: [],
      optionsNote: null,
      carriers: [],
      sources: [],
      recentSightings: [],
      firstSeenAt: at,
      lastSeenAt: at,
    };
    list.entries.push(entry);
  }

  entry.count += 1;
  entry.lastSeenAt = at;
  if (at < entry.firstSeenAt) entry.firstSeenAt = at;

  const phrasing = entry.phrasings.find((row) => row.text.toLowerCase() === question.toLowerCase());
  if (phrasing) phrasing.count += 1;
  else entry.phrasings.push({ text: question, count: 1 });
  entry.phrasings = sortPhrasings(entry.phrasings);
  entry.canonicalQuestion = entry.phrasings[0]?.text ?? question;

  let sawFreeText = entry.optionsNote === FREE_TEXT_OPTIONS_NOTE || entry.optionsNote === MIXED_OPTIONS_NOTE;
  if (freeText) sawFreeText = true;
  for (const option of offered) entry.options = unionOption(entry.options, option);
  entry.optionsNote = optionsNoteFor(entry.options, sawFreeText);

  let carrier = entry.carriers.find((row) => sameCarrier(row, carrierId, carrierName));
  if (!carrier) {
    carrier = {
      carrierId,
      carrierName,
      count: 0,
      firstSeenAt: at,
      lastSeenAt: at,
    };
    entry.carriers.push(carrier);
  } else if (!carrier.carrierId && carrierId) {
    carrier.carrierId = carrierId;
  }
  carrier.count += 1;
  carrier.lastSeenAt = at;
  if (at < carrier.firstSeenAt) carrier.firstSeenAt = at;
  entry.carriers.sort((a, b) => b.count - a.count || a.carrierName.localeCompare(b.carrierName));

  if (source && !entry.sources.includes(source)) {
    entry.sources.push(source);
    entry.sources.sort();
  }

  const duplicateSighting = entry.recentSightings.find(
    (row) =>
      row.question.toLowerCase() === question.toLowerCase() &&
      (row.carrierId ?? "") === (carrierId ?? "") &&
      row.carrierName.toLowerCase() === carrierName.toLowerCase() &&
      (row.dealId ?? "") === (dealId ?? "") &&
      (row.url ?? "") === (url ?? "") &&
      (row.selector ?? "") === (selector ?? ""),
  );
  if (duplicateSighting) {
    duplicateSighting.at = at;
  } else {
    entry.recentSightings.unshift({
      at,
      carrierId,
      carrierName,
      question,
      dealId,
      url,
      selector,
    });
    entry.recentSightings = entry.recentSightings.slice(0, SIGHTING_CAP);
  }

  list.entries.sort((a, b) => b.count - a.count || a.canonicalQuestion.localeCompare(b.canonicalQuestion));
  list.updatedAt = list.entries.reduce((max, row) => (row.lastSeenAt > max ? row.lastSeenAt : max), list.updatedAt);

  try {
    gapStore.write(list);
  } catch (error) {
    if (isReadonlyFs(error)) return { captured: false, reason: "store_unwritable" };
    throw error;
  }

  return { captured: true, created, id: entry.id, count: entry.count };
}

export function captureAutoGapsFromAttemptWhy(
  input: {
    why: string | null | undefined;
    shopLine?: string | null;
    lineOfBusiness?: string | null;
    carrierId?: string | null;
    carrierName: string;
    dealId?: string | null;
    url?: string | null;
    selector?: string | null;
    source?: string | null;
    at?: string | null;
  },
  store?: GapStore,
): AutoQuoteGapResult[] {
  if (!isAutoShopContext(input)) return [];
  return questionsFromAttemptWhy(input.why).map((question) =>
    recordAutoQuoteGap(
      {
        question,
        carrierId: input.carrierId,
        carrierName: input.carrierName,
        dealId: input.dealId,
        url: input.url,
        selector: input.selector,
        shopLine: input.shopLine ?? "auto",
        lineOfBusiness: input.lineOfBusiness,
        source: input.source,
        at: input.at,
      },
      store,
    ),
  );
}

export function recordPortalObservedQuestions(
  input: {
    shopLine?: string | null;
    lineOfBusiness?: string | null;
    carrierId?: string | null;
    carrierName: string;
    dealId?: string | null;
    questions: readonly {
      question: string;
      options?: readonly string[] | null;
      url?: string | null;
      selector?: string | null;
    }[];
    source?: string | null;
    at?: string | null;
  },
  store?: GapStore,
): AutoQuoteGapResult[] {
  if (!isAutoShopContext({ shopLine: input.shopLine, lineOfBusiness: input.lineOfBusiness })) return [];
  return input.questions.map((question) =>
    recordAutoQuoteGap(
      {
        question: question.question,
        options: question.options,
        carrierId: input.carrierId,
        carrierName: input.carrierName,
        dealId: input.dealId,
        url: question.url,
        selector: question.selector,
        shopLine: input.shopLine ?? "auto",
        lineOfBusiness: input.lineOfBusiness,
        source: input.source,
        at: input.at,
      },
      store,
    ),
  );
}

const PROGRESSIVE_EMPLOYMENT_WHY =
  "Auto Progressive — Conditional/blocked no rate: quote #550013376416. Portal Why: Employment required. MVR N. Form PA. quoting.foragentsonly.com. Waiting employment category.";

const DAIRYLAND_LEFTOVER_WHY =
  "Auto Dairyland — Quoted #371664290. Premium $4,349.58 12-month 11-pay. Bindable No — leftover: DL number + lienholder report details required; insurance score not found. MVR N. Form PA. Portal agent.thegeneral.com.";

const GEICO_EDUCATION_WHY =
  "Auto Geico — Conditional/blocked no rate. Portal Why: Education Level blank; Next disabled. MVR N. Form PA.";

const NATIONWIDE_GENDER_WHY =
  "Auto Nationwide — Holding/no market: MFA cleared; gender required and blank (not invented).";

const GEICO_OWNERSHIP_WHY =
  "holding — ownership_length + commute_days_week blank, not inventing; no premium.";

/**
 * Known Auto stalls from quote-bot scripts whose ask is not an Auto risk-profile field.
 * Education, gender, DL number, ownership length, and commute days are on the profile and stay out.
 */
export function buildSeededAutoQuestionGapList(): AutoQuestionGapList {
  const store = memoryGapStore(emptyAutoQuestionGapList(SEEDED_AT));
  captureAutoGapsFromAttemptWhy(
    {
      why: PROGRESSIVE_EMPLOYMENT_WHY,
      shopLine: "auto",
      carrierId: "1d29f707-67e5-4e64-8528-2a0f58ad92a4",
      carrierName: "Progressive",
      dealId: "12aa92aa-3b8d-4211-acf3-fda09d77a194",
      url: "https://quoting.foragentsonly.com",
      source: "scripts/ff-progressive-employment-hold.ts",
      at: SEEDED_AT,
    },
    store,
  );
  captureAutoGapsFromAttemptWhy(
    {
      why: DAIRYLAND_LEFTOVER_WHY,
      shopLine: "auto",
      carrierName: "Dairyland",
      dealId: "12aa92aa-3b8d-4211-acf3-fda09d77a194",
      url: "https://agent.thegeneral.com",
      source: "scripts/ff-dairyland-and-general.ts",
      at: SEEDED_AT,
    },
    store,
  );
  captureAutoGapsFromAttemptWhy(
    {
      why: GEICO_EDUCATION_WHY,
      shopLine: "auto",
      carrierId: "eaf069fd-d37e-41ed-8965-3d4ddc61ddf0",
      carrierName: "Geico",
      at: SEEDED_AT,
      source: "scripts/ff-geico-education-hold.ts",
    },
    store,
  );
  captureAutoGapsFromAttemptWhy(
    {
      why: NATIONWIDE_GENDER_WHY,
      shopLine: "auto",
      carrierId: "59ce34a0-1bca-477a-879a-95d2127bff9e",
      carrierName: "Nationwide",
      at: SEEDED_AT,
      source: "scripts/ff-nationwide-gender-hold.ts",
    },
    store,
  );
  captureAutoGapsFromAttemptWhy(
    {
      why: GEICO_OWNERSHIP_WHY,
      shopLine: "auto",
      carrierId: "eaf069fd-d37e-41ed-8965-3d4ddc61ddf0",
      carrierName: "Geico",
      at: SEEDED_AT,
      source: "scripts/ff-geico-nomarket.ts",
    },
    store,
  );
  return store.read();
}
