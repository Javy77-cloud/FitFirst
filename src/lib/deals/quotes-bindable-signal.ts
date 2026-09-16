import { formatMoney } from "@/lib/domain";
import { normalizeRiskOutcome } from "@/lib/quotes/outcomes";

export type QuotesBindableTone = "empty" | "green" | "amber" | "red";

export type QuotesBindableSignal = {
  tone: QuotesBindableTone;
  bindableCount: number;
  quoteCount: number;
  bestPremium: number | null;
  label: string;
};

function premiumNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isBindableQuote(quote: {
  bindable?: boolean | null;
  riskOutcome?: string | null;
  nextStep?: string | null;
  stub?: boolean | null;
}): boolean {
  if (quote.stub === true) return false;
  if (quote.nextStep === "can_bind") return true;
  if (normalizeRiskOutcome(quote.riskOutcome) === "bindable") return true;
  return quote.bindable === true;
}

export function quotesBindableSignal(
  quotes: readonly {
    bindable?: boolean | null;
    riskOutcome?: string | null;
    nextStep?: string | null;
    premium?: string | number | null;
    stub?: boolean | null;
  }[],
): QuotesBindableSignal {
  const live = quotes.filter((row) => row.stub !== true);
  const bindable = live.filter(isBindableQuote);
  const premiums = bindable
    .map((row) => premiumNumber(row.premium))
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const bestPremium = premiums[0] ?? null;
  const bindableCount = bindable.length;
  const quoteCount = live.length;

  if (quoteCount === 0) {
    return {
      tone: "empty",
      bindableCount: 0,
      quoteCount: 0,
      bestPremium: null,
      label: "No quotes yet",
    };
  }
  if (bindableCount > 0) {
    const countLabel = `${bindableCount} bindable`;
    const premiumLabel = bestPremium != null ? ` · best ${formatMoney(String(bestPremium))}` : "";
    return {
      tone: "green",
      bindableCount,
      quoteCount,
      bestPremium,
      label: `${countLabel}${premiumLabel}`,
    };
  }
  const anyConditional = live.some((row) => normalizeRiskOutcome(row.riskOutcome) === "conditional");
  return {
    tone: anyConditional ? "amber" : "red",
    bindableCount: 0,
    quoteCount,
    bestPremium: null,
    label: anyConditional
      ? `${quoteCount} quote${quoteCount === 1 ? "" : "s"} · none bindable`
      : `${quoteCount} quote${quoteCount === 1 ? "" : "s"} · none bindable`,
  };
}
