import { formatMoney } from "@/lib/domain";

/** Rule-based quote compare. Plain English from numbers — not an LLM. */

export type CompareQuote = {
  id: string;
  carrierName: string;
  premium: number | null;
  aopDeductible: string | null;
  hurricaneDeductible: string | null;
  coverageA: number | null;
  bindable: boolean;
  coverageGaps: string[];
  notes: string | null;
  includesFlood: boolean;
  result?: string | null;
};

export type CompareNeed = {
  coverageA?: number | null;
  state?: string | null;
  line?: string | null;
  wantsFlood?: boolean;
};

export type GapNote = {
  code: string;
  text: string;
  severity: "gap" | "watch" | "better";
};

export type ComparedQuote = CompareQuote & {
  notesPlain: GapNote[];
  cheapest: boolean;
};

export type DeductibleParse = {
  kind: "percent" | "dollars" | "unknown";
  value: number | null;
  raw: string;
};

const FLOOD_YES = /\bincludes?\s+flood\b|\bflood\s+endors/i;
const FLOOD_NO = /\bno\s+flood\b|\bwithout\s+flood\b|\bflood\s+not\s+included\b|\bexcludes?\s+flood\b/i;

export function parseDeductible(raw: string | null | undefined): DeductibleParse {
  if (!raw) return { kind: "unknown", value: null, raw: "" };
  const text = raw.trim();
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { kind: "percent", value: Number(pct[1]), raw: text };
  const cleaned = text.replace(/[$,]/g, "");
  const dollars = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (dollars) return { kind: "dollars", value: Number(dollars[1]), raw: text };
  return { kind: "unknown", value: null, raw: text };
}

export function inferIncludesFlood(input: {
  coverageGaps?: string[] | null;
  notes?: string | null;
}): boolean {
  const blob = `${(input.coverageGaps ?? []).join(" ")} ${input.notes ?? ""}`;
  if (FLOOD_YES.test(blob) && !FLOOD_NO.test(blob)) return true;
  return false;
}

function isHomeLine(line?: string | null): boolean {
  const v = (line ?? "").toUpperCase();
  return v === "HO" || v === "HO3" || v === "HOME" || v.startsWith("HO");
}

function deductibleHigher(a: DeductibleParse, b: DeductibleParse): boolean {
  if (a.value == null || b.value == null) return false;
  if (a.kind !== b.kind) return false;
  return a.value > b.value + 0.001;
}

function cheapestQuoted(quotes: CompareQuote[]): CompareQuote | null {
  const rankable = quotes
    .filter((q) => q.premium != null && (q.result == null || q.result === "quoted"))
    .sort((a, b) => (a.premium ?? 0) - (b.premium ?? 0));
  return rankable[0] ?? null;
}

function lowestAop(quotes: CompareQuote[]): DeductibleParse | null {
  const parsed = quotes
    .map((q) => parseDeductible(q.aopDeductible))
    .filter((d) => d.value != null);
  if (parsed.length === 0) return null;
  return parsed.reduce((min, d) => (d.value! < min.value! ? d : min));
}

function lowestHurricane(quotes: CompareQuote[]): DeductibleParse | null {
  const parsed = quotes
    .map((q) => parseDeductible(q.hurricaneDeductible))
    .filter((d) => d.value != null);
  if (parsed.length === 0) return null;
  return parsed.reduce((min, d) => (d.value! < min.value! ? d : min));
}

function highestCovA(quotes: CompareQuote[]): number | null {
  const values = quotes.map((q) => q.coverageA).filter((n): n is number => n != null);
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function gapNotesForQuote(
  quote: CompareQuote,
  peers: CompareQuote[],
  need: CompareNeed = {},
): GapNote[] {
  const notes: GapNote[] = [];
  const cheapest = cheapestQuoted(peers);
  const minAop = lowestAop(peers);
  const minHur = lowestHurricane(peers);
  const topCovA = highestCovA(peers);
  const needCovA = need.coverageA ?? topCovA;
  const anyoneHasFlood = peers.some((q) => q.includesFlood);
  const wantsFlood = need.wantsFlood === true || anyoneHasFlood;
  const floridaHome = (need.state ?? "").toUpperCase() === "FL" && isHomeLine(need.line);

  if (quote.result === "declined") {
    notes.push({
      code: "declined",
      text: `${quote.carrierName} declined this shop.`,
      severity: "gap",
    });
  }

  if (!quote.bindable && (quote.result == null || quote.result === "quoted")) {
    notes.push({
      code: "not_bindable",
      text: "This quote is not bindable.",
      severity: "gap",
    });
  }

  if (
    cheapest &&
    quote.id !== cheapest.id &&
    quote.premium != null &&
    cheapest.premium != null &&
    quote.premium > cheapest.premium + 0.5
  ) {
    const diff = quote.premium - cheapest.premium;
    notes.push({
      code: "premium_higher",
      text: `Premium is ${formatMoney(diff)} higher than ${cheapest.carrierName} (${formatMoney(quote.premium)} vs ${formatMoney(cheapest.premium)}).`,
      severity: "watch",
    });
  }

  const aop = parseDeductible(quote.aopDeductible);
  if (minAop && deductibleHigher(aop, minAop)) {
    notes.push({
      code: "aop_higher",
      text: `AOP deductible is higher (${aop.raw} vs ${minAop.raw}).`,
      severity: "gap",
    });
  }

  const hur = parseDeductible(quote.hurricaneDeductible);
  if (minHur && deductibleHigher(hur, minHur)) {
    notes.push({
      code: "hurricane_higher",
      text: `Hurricane deductible is higher (${hur.raw} vs ${minHur.raw}).`,
      severity: "gap",
    });
  }

  if (needCovA != null && quote.coverageA != null && quote.coverageA < needCovA - 500) {
    notes.push({
      code: "cova_lower",
      text: `Coverage A is lower (${formatMoney(quote.coverageA)} vs ${formatMoney(needCovA)} needed).`,
      severity: "gap",
    });
  }

  if ((wantsFlood || floridaHome) && !quote.includesFlood) {
    if (anyoneHasFlood) {
      const who = peers.find((q) => q.includesFlood);
      notes.push({
        code: "no_flood",
        text: `No flood — ${who?.carrierName ?? "another option"} includes flood and this one does not.`,
        severity: "gap",
      });
    } else if (floridaHome) {
      notes.push({
        code: "no_flood",
        text: "No flood — Florida homeowners quotes do not include NFIP or private flood unless endorsed.",
        severity: "watch",
      });
    } else {
      notes.push({
        code: "no_flood",
        text: "No flood coverage on this quote.",
        severity: "gap",
      });
    }
  }

  for (const gap of quote.coverageGaps ?? []) {
    const trimmed = gap.trim();
    if (!trimmed) continue;
    if (FLOOD_NO.test(trimmed) && notes.some((n) => n.code === "no_flood")) continue;
    notes.push({
      code: "listed_gap",
      text: trimmed.endsWith(".") ? trimmed : `${trimmed}.`,
      severity: "watch",
    });
  }

  return notes;
}

export function compareQuotes(quotes: CompareQuote[], need: CompareNeed = {}): ComparedQuote[] {
  const cheapest = cheapestQuoted(quotes);
  return quotes.map((quote) => ({
    ...quote,
    cheapest: cheapest?.id === quote.id,
    notesPlain: gapNotesForQuote(quote, quotes, need),
  }));
}

export function quoteToCompareInput(input: {
  id: string;
  carrierName: string;
  premium: number | string | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  coverageA?: number | null;
  bindable: boolean;
  coverageGaps?: string[] | null;
  notes?: string | null;
  result?: string | null;
}): CompareQuote {
  const premium =
    input.premium == null || input.premium === ""
      ? null
      : typeof input.premium === "number"
        ? input.premium
        : Number(input.premium);
  return {
    id: input.id,
    carrierName: input.carrierName,
    premium: premium != null && Number.isFinite(premium) ? premium : null,
    aopDeductible: input.aopDeductible ?? null,
    hurricaneDeductible: input.hurricaneDeductible ?? null,
    coverageA: input.coverageA ?? null,
    bindable: input.bindable,
    coverageGaps: input.coverageGaps ?? [],
    notes: input.notes ?? null,
    includesFlood: inferIncludesFlood({
      coverageGaps: input.coverageGaps,
      notes: input.notes,
    }),
    result: input.result ?? null,
  };
}
