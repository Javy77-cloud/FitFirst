import { formatMoney } from "@/lib/domain";
import { parsePremium } from "./tracking";

export type QuoteExplainInput = {
  id: string;
  carrierName: string;
  premium: number | string | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  coverageA?: number | null;
  bindable: boolean;
  coverageGaps?: string[];
  stub?: boolean;
};

export type QuoteExplainRow = {
  id: string;
  rank: number | null;
  headline: string;
  why: string;
  vsCheapest: string | null;
  bindableEnglish: string;
  gapsEnglish: string;
};

export type QuoteCompareExplain = {
  summary: string;
  rows: QuoteExplainRow[];
};

function gapToEnglish(gap: string): string {
  const raw = gap.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("opening protection")) {
    return "No opening-protection credit is on this quote, so wind premium stays full price.";
  }
  if (lower.includes("flood")) {
    return "Flood is not on this quote. An HO3 still does not pay for flood.";
  }
  if (lower.includes("umbrella")) {
    return "No umbrella sits on this quote. Liability stops at the primary limits.";
  }
  if (lower.includes("wind")) {
    return "Wind or hurricane terms on this quote are thinner than the rest of the shop.";
  }
  const cleaned = raw.replace(/[.]+$/, "");
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
}

export function englishCoverageGaps(gaps: string[] | null | undefined): string {
  const notes = (gaps ?? []).map(gapToEnglish).filter(Boolean);
  if (notes.length === 0) return "No coverage gaps noted on this quote.";
  return notes.join(" ");
}

export function bindableEnglish(bindable: boolean, isAna = false): string {
  if (isAna) {
    return "Not bindable. Ana stays shopping at Coverage A $321,000. Do not bind Ana.";
  }
  if (bindable) {
    return "Bindable. Closed Won is the only click that writes a Contact or Business plus one Policy.";
  }
  return "Not bindable. This is a shop result, not coverage, and it cannot write a policy.";
}

function deductiblePhrase(label: string, value: string | null | undefined): string | null {
  if (!value || value === "—") return null;
  return `${label} ${value}`;
}

export function explainQuoteCompare(
  quotes: QuoteExplainInput[],
  options: { isAna?: boolean } = {},
): QuoteCompareExplain {
  if (quotes.length === 0) {
    return {
      summary: options.isAna
        ? "No quotes to compare on Ana's shop. Coverage A stays $321,000. Do not bind Ana."
        : "No quotes to compare yet. Filter markets first, then log stub quotes. A quote never creates a policy.",
      rows: [],
    };
  }

  const priced = quotes
    .map((quote) => ({ quote, premium: parsePremium(quote.premium) }))
    .filter((row) => row.premium != null)
    .sort((a, b) => {
      if (a.premium !== b.premium) return (a.premium ?? 0) - (b.premium ?? 0);
      return a.quote.carrierName.localeCompare(b.quote.carrierName);
    });
  const cheapest = priced[0] ?? null;
  const cheapestPremium = cheapest?.premium ?? null;

  const rows: QuoteExplainRow[] = quotes.map((quote) => {
    const premium = parsePremium(quote.premium);
    const rank =
      premium != null && cheapest
        ? priced.findIndex((row) => row.quote.id === quote.id) + 1
        : null;
    const bindable = bindableEnglish(quote.bindable, options.isAna);
    const gapsEnglish = englishCoverageGaps(quote.coverageGaps);
    const deductibles = [
      deductiblePhrase("AOP deductible", quote.aopDeductible),
      deductiblePhrase("hurricane deductible", quote.hurricaneDeductible),
    ].filter(Boolean);
    const parts: string[] = [];

    if (rank === 1 && premium != null) {
      parts.push(`${quote.carrierName} is the cheapest quoted premium at ${formatMoney(premium)}.`);
    } else if (premium != null && cheapestPremium != null) {
      const delta = premium - cheapestPremium;
      parts.push(
        `${quote.carrierName} is ${formatMoney(delta)} more than ${cheapest!.quote.carrierName} (${formatMoney(cheapestPremium)}).`,
      );
    } else if (premium != null) {
      parts.push(`${quote.carrierName} quoted ${formatMoney(premium)}.`);
    } else {
      parts.push(`${quote.carrierName} has no premium on the stub yet.`);
    }

    if (quote.coverageA != null) {
      parts.push(`Coverage A is ${formatMoney(quote.coverageA)}.`);
    }
    if (deductibles.length) {
      parts.push(`This option uses ${deductibles.join(" and ")}.`);
    }
    if (cheapest && quote.id !== cheapest.quote.id) {
      const cheapAop = cheapest.quote.aopDeductible;
      if (quote.aopDeductible && cheapAop && quote.aopDeductible !== cheapAop) {
        parts.push(
          `AOP deductible is ${quote.aopDeductible} here versus ${cheapAop} on the cheapest quote — that is often why the price moved.`,
        );
      }
      const cheapHur = cheapest.quote.hurricaneDeductible;
      if (quote.hurricaneDeductible && cheapHur && quote.hurricaneDeductible !== cheapHur) {
        parts.push(
          `Hurricane deductible is ${quote.hurricaneDeductible} here versus ${cheapHur} on the cheapest quote.`,
        );
      }
      if (
        quote.coverageA != null &&
        cheapest.quote.coverageA != null &&
        quote.coverageA !== cheapest.quote.coverageA
      ) {
        parts.push(
          `Coverage A differs from the cheapest quote (${formatMoney(cheapest.quote.coverageA)}). Compare the dwelling limit, not just the price.`,
        );
      }
    }
    if (quote.stub) parts.push("Stub quote — no live portal.");
    parts.push(bindable);
    parts.push(gapsEnglish);

    const vsCheapest =
      cheapest && quote.id !== cheapest.quote.id && premium != null && cheapestPremium != null
        ? `${formatMoney(premium - cheapestPremium)} above ${cheapest.quote.carrierName}`
        : cheapest && quote.id === cheapest.quote.id
          ? "Cheapest quoted premium"
          : null;

    return {
      id: quote.id,
      rank,
      headline:
        rank === 1
          ? "Cheapest quoted option"
          : rank
            ? `Quoted option #${rank}`
            : "Quoted option",
      why: parts.join(" "),
      vsCheapest,
      bindableEnglish: bindable,
      gapsEnglish,
    };
  });

  const cheapestName = cheapest
    ? `${cheapest.quote.carrierName} at ${formatMoney(cheapest.premium)}`
    : "no priced quote";
  const summary = options.isAna
    ? `Ana's shop ranks ${quotes.length} quote${quotes.length === 1 ? "" : "s"}. Cheapest is ${cheapestName}. None are bindable. Coverage A stays $321,000. Do not bind Ana.`
    : `${quotes.length} quote${quotes.length === 1 ? "" : "s"} on this deal. Cheapest priced option is ${cheapestName}. Quotes never become policies — Closed Won bind writes the Contact or Business plus one Policy.`;

  return { summary, rows };
}
