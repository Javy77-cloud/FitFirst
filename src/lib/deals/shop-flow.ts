import { createHash } from "node:crypto";
import { LOB_TO_SHOP_LINE, SHOP_LINE_TO_LOB, isShopLine, type ShopLine } from "@/lib/domain";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import type { DealFlowStepId } from "@/lib/deals/product-ui";

/** Persisted on deals.shop_flow — last shopped risk snapshot + per-line quote runs. */
export type DealShopFlowState = {
  marketsFingerprint?: string | null;
  quotesFingerprint?: string | null;
  /** Active quote-run id per shop line. */
  quoteRuns?: Partial<Record<string, string>>;
};

/** Empty string means “was complete, now stale — re-run Markets/Quotes”. */
export const STALE_SHOP_FINGERPRINT = "";

export type SheetFingerprintInput = {
  line: string;
  values?: Record<string, { value?: string | null } | null> | null;
};

export type DocFingerprintInput = {
  id: string;
  filename?: string | null;
  createdAt?: Date | string | null;
  slot?: string | null;
  docType?: string | null;
  tags?: string[] | null;
};

export function parseShopFlow(raw: unknown): DealShopFlowState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const row = raw as DealShopFlowState;
  const quoteRuns: Partial<Record<string, string>> = {};
  if (row.quoteRuns && typeof row.quoteRuns === "object") {
    for (const [line, id] of Object.entries(row.quoteRuns)) {
      if (typeof id === "string" && id.trim()) quoteRuns[line] = id.trim();
    }
  }
  return {
    marketsFingerprint:
      typeof row.marketsFingerprint === "string" ? row.marketsFingerprint : null,
    quotesFingerprint: typeof row.quotesFingerprint === "string" ? row.quotesFingerprint : null,
    quoteRuns,
  };
}

export function sheetValuesFingerprint(
  values?: Record<string, { value?: string | null } | null> | null,
): string {
  if (!values) return "";
  const pairs: string[] = [];
  for (const key of Object.keys(values).sort()) {
    const value = String(values[key]?.value ?? "").trim();
    if (!value) continue;
    pairs.push(`${key}=${value}`);
  }
  return pairs.join("\n");
}

export function riskFingerprint(input: {
  sheets?: readonly SheetFingerprintInput[] | null;
  docs?: readonly DocFingerprintInput[] | null;
}): string {
  const sheetLines = [...(input.sheets ?? [])]
    .map((sheet) => `${sheet.line}\n${sheetValuesFingerprint(sheet.values)}`)
    .sort();
  const docs = [...(input.docs ?? [])]
    .filter((doc) => isDocumentsSourceDoc(doc))
    .map((doc) => {
      const when =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : doc.createdAt
            ? String(doc.createdAt)
            : "";
      return `${doc.id}\t${doc.filename ?? ""}\t${when}`;
    })
    .sort();
  const payload = `sheets:${sheetLines.join("||")}\ndocs:${docs.join("||")}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function fingerprintsMatch(
  saved: string | null | undefined,
  current: string,
): boolean {
  if (saved == null) return true;
  if (saved === STALE_SHOP_FINGERPRINT) return false;
  return saved === current;
}

export function inferShopLineFromQuoteNotes(notes: string | null | undefined): ShopLine | null {
  const blob = (notes ?? "").toLowerCase();
  if (!blob.trim()) return null;
  // Line tokens first — never treat multi-line carrier names (Progressive, Geico) as Auto.
  if (/\bflood\b|\bnfip\b|excess flood/.test(blob)) return "flood";
  if (/\bworkers(?:\s+|-)?comp|\bwc\b/.test(blob)) return "workers_comp";
  if (/\bgeneral liability|\bgl\b/.test(blob) && !/\bflood\b/.test(blob)) return "general_liability";
  if (/\bbop\b|businessowners/.test(blob)) return "bop";
  if (/\bumbrella\b/.test(blob)) return "umbrella";
  if (/\b(rec(?:reational)?(?:\s+|\/)?rv|watercraft|\bboat\b)\b/.test(blob)) return "rec_rv";
  if (/\b(marketplace|medicare|medigap|health plan)\b/.test(blob)) return "health";
  if (/\b(term life|whole life|iul|final expense|\blife\b)\b/.test(blob) && !/\bauto\b/.test(blob)) {
    return "life";
  }
  if (
    /\b(auto|vin|nationwide auto|personal auto|\bpa\b|motorcycle|form\s+pa)\b/.test(blob)
  ) {
    return "auto";
  }
  if (/\bho[34658]\b|\bhomeowners\b|\bdp[13]\b|\bdwelling\b|\bmho\b|\bmdp\b/.test(blob)) {
    return "home";
  }
  return null;
}

export function shopLineFromLob(lob: string | null | undefined): ShopLine | null {
  const raw = (lob ?? "").trim().toUpperCase();
  if (!raw) return null;
  return LOB_TO_SHOP_LINE[raw] ?? null;
}

export function resolveQuoteShopLine(input: {
  shopLine?: string | null;
  quoteAttemptLogId?: string | null;
  notes?: string | null;
  logs?: readonly { id: string; lineOfBusiness?: string | null }[] | null;
}): ShopLine | null {
  const fromShop = isShopLine(input.shopLine) ? input.shopLine : null;
  const log = input.quoteAttemptLogId
    ? (input.logs ?? []).find((row) => row.id === input.quoteAttemptLogId)
    : null;
  const fromLog = shopLineFromLob(log?.lineOfBusiness);
  const fromNotes = inferShopLineFromQuoteNotes(input.notes);
  // Merged multi-line books often stamp shop_line=home. Prefer log / notes when they disagree.
  if (fromShop && fromLog && fromShop !== fromLog && fromShop === "home") return fromLog;
  if (fromShop && fromNotes && fromShop !== fromNotes && fromShop === "home") return fromNotes;
  if (fromShop) return fromShop;
  if (fromLog) return fromLog;
  return fromNotes;
}

/** Persist the line chip tag so historical rows stop spilling across Home / Auto / Flood. */
export function shopLineToPersist(input: {
  shopLine?: string | null;
  quoteAttemptLogId?: string | null;
  notes?: string | null;
  logs?: readonly { id: string; lineOfBusiness?: string | null }[] | null;
}): ShopLine | null {
  return resolveQuoteShopLine(input);
}

export function quoteMatchesShopLine(
  input: {
    shopLine?: string | null;
    quoteAttemptLogId?: string | null;
    notes?: string | null;
    logs?: readonly { id: string; lineOfBusiness?: string | null }[] | null;
  },
  wanted: ShopLine,
  opts?: { multiLine?: boolean; isPrimaryLine?: boolean },
): boolean {
  const resolved = resolveQuoteShopLine(input);
  if (resolved) return resolved === wanted;
  if (opts?.multiLine) return false;
  return Boolean(opts?.isPrimaryLine);
}

export type ShopFlowCompletion = {
  completed: DealFlowStepId[];
  isComplete: (step: DealFlowStepId) => boolean;
};

export function resolveShopFlowCompletion(input: {
  detailsComplete: boolean;
  documentsComplete: boolean;
  hasMarkets: boolean;
  hasQuotes: boolean;
  currentFingerprint: string;
  saved?: DealShopFlowState | null;
}): ShopFlowCompletion {
  const saved = parseShopFlow(input.saved);
  const marketsLive =
    input.hasMarkets && fingerprintsMatch(saved.marketsFingerprint, input.currentFingerprint);
  const quotesLive =
    input.hasQuotes && fingerprintsMatch(saved.quotesFingerprint, input.currentFingerprint);
  const completed: DealFlowStepId[] = ["create"];
  if (input.detailsComplete) completed.push("details");
  if (input.documentsComplete) completed.push("documents");
  if (marketsLive) completed.push("markets");
  if (quotesLive) completed.push("quotes");
  const set = new Set(completed);
  return {
    completed,
    isComplete: (step) => set.has(step),
  };
}

export type QuoteRunGroup<T> = {
  runId: string;
  current: boolean;
  quotedAt: Date;
  label: string;
  rows: T[];
};

function asDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

function formatRunWhen(date: Date): string {
  if (!date.getTime()) return "earlier run";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const RUN_BATCH_MS = 15 * 60 * 1000;

export function groupQuotesByRun<T>(
  rows: readonly T[],
  get: (row: T) => { runId?: string | null; createdAt?: Date | string | null },
  currentRunId?: string | null,
): { current: T[]; previous: QuoteRunGroup<T>[] } {
  if (!rows.length) return { current: [], previous: [] };

  const withMeta = rows.map((row, index) => {
    const meta = get(row);
    return { row, index, runId: meta.runId?.trim() || "", createdAt: asDate(meta.createdAt) };
  });

  const currentId = currentRunId?.trim() || "";
  if (!currentId && withMeta.every((item) => !item.runId)) {
    return { current: rows.slice(), previous: [] };
  }

  const current: T[] = [];
  const previousBuckets = new Map<string, { rows: T[]; quotedAt: Date }>();

  for (const item of withMeta) {
    const isCurrent = currentId ? item.runId === currentId : !item.runId;
    if (isCurrent) {
      current.push(item.row);
      continue;
    }
    const bucketKey =
      item.runId ||
      `ts:${Math.floor(item.createdAt.getTime() / RUN_BATCH_MS)}`;
    const existing = previousBuckets.get(bucketKey);
    if (existing) {
      existing.rows.push(item.row);
      if (item.createdAt > existing.quotedAt) existing.quotedAt = item.createdAt;
    } else {
      previousBuckets.set(bucketKey, { rows: [item.row], quotedAt: item.createdAt });
    }
  }

  const previous = [...previousBuckets.entries()]
    .map(([runId, bucket]) => ({
      runId,
      current: false,
      quotedAt: bucket.quotedAt,
      label: `Previous quotes · ${formatRunWhen(bucket.quotedAt)}`,
      rows: bucket.rows,
    }))
    .sort((a, b) => b.quotedAt.getTime() - a.quotedAt.getTime());

  return { current, previous };
}

export function nextShopFlowAfterQuoteRun(input: {
  saved?: DealShopFlowState | null;
  line: ShopLine;
  fingerprint: string;
  newRunId: string;
}): DealShopFlowState {
  const saved = parseShopFlow(input.saved);
  return {
    marketsFingerprint: input.fingerprint,
    quotesFingerprint: input.fingerprint,
    quoteRuns: { ...saved.quoteRuns, [input.line]: input.newRunId },
  };
}

export function nextShopFlowAfterMarkets(input: {
  saved?: DealShopFlowState | null;
  fingerprint: string;
}): DealShopFlowState {
  const saved = parseShopFlow(input.saved);
  return {
    ...saved,
    marketsFingerprint: input.fingerprint,
  };
}

export function staleShopFlow(saved?: DealShopFlowState | null): DealShopFlowState {
  const current = parseShopFlow(saved);
  return {
    ...current,
    marketsFingerprint: STALE_SHOP_FINGERPRINT,
    quotesFingerprint: STALE_SHOP_FINGERPRINT,
  };
}

export function shopLineLabel(line: ShopLine): string {
  return (
    {
      home: "Home",
      auto: "Auto",
      flood: "Flood",
      rec_rv: "Rec / RV",
      umbrella: "Umbrella",
      life: "Life",
      health: "Health",
      workers_comp: "Workers Comp",
      general_liability: "General Liability",
      bop: "BOP",
    } satisfies Record<ShopLine, string>
  )[line];
}

export function lobForShopLine(line: ShopLine): string {
  return SHOP_LINE_TO_LOB[line];
}
