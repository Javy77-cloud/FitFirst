import { formatMoney } from "@/lib/domain";
import type { Carrier, Quote, QuoteAttemptLog } from "@/lib/db/schema";

export type CompareQuote = {
  id: string;
  source: "quote" | "attempt";
  carrierName: string;
  quoteNumber: string | null;
  premium: number | null;
  hurricaneDeductible: string | null;
  aopDeductible: string | null;
  coverageA: number | null;
  bindable: boolean;
  coverageGaps: string[];
  result: string | null;
  notes: string | null;
  why: string | null;
};

export type FieldDiff = {
  key: string;
  label: string;
  values: Record<string, string>;
  same: boolean;
};

export function parsePremium(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function isSelectableShopRow(row: Pick<CompareQuote, "premium" | "result" | "source">): boolean {
  if (row.source === "quote") return true;
  if (row.result === "quoted") return true;
  return row.premium != null;
}

export function collectCompareQuotes(args: {
  quotes: { quote: Quote; carrier: Carrier }[];
  logs?: { log: QuoteAttemptLog; carrier: Carrier }[];
}): CompareQuote[] {
  const usedLogIds = new Set<string>();
  const usedCarriers = new Set<string>();
  const rows: CompareQuote[] = [];

  for (const { quote, carrier } of args.quotes) {
    if (quote.quoteAttemptLogId) usedLogIds.add(quote.quoteAttemptLogId);
    usedCarriers.add(quote.carrierId);
    rows.push({
      id: quote.id,
      source: "quote",
      carrierName: carrier.name,
      quoteNumber: quote.quoteNumber,
      premium: parsePremium(quote.premium),
      hurricaneDeductible: quote.hurricaneDeductible,
      aopDeductible: quote.aopDeductible,
      coverageA: quote.coverageA,
      bindable: quote.bindable,
      coverageGaps: quote.coverageGaps ?? [],
      result: "quoted",
      notes: quote.notes,
      why: quote.notes,
    });
  }

  for (const { log, carrier } of args.logs ?? []) {
    if (usedLogIds.has(log.id) || usedCarriers.has(log.carrierId)) continue;
    const row: CompareQuote = {
      id: log.id,
      source: "attempt",
      carrierName: carrier.name,
      quoteNumber: log.quoteNumber,
      premium: parsePremium(log.premium),
      hurricaneDeductible: null,
      aopDeductible: null,
      coverageA: log.covAForced ?? log.covATried,
      bindable: log.bindable,
      coverageGaps: [],
      result: log.result,
      notes: log.why,
      why: log.why,
    };
    if (!isSelectableShopRow(row)) continue;
    usedCarriers.add(log.carrierId);
    rows.push(row);
  }

  return rows.sort((a, b) => {
    if (a.premium == null && b.premium == null) return a.carrierName.localeCompare(b.carrierName);
    if (a.premium == null) return 1;
    if (b.premium == null) return -1;
    if (a.premium !== b.premium) return a.premium - b.premium;
    return a.carrierName.localeCompare(b.carrierName);
  });
}

export function defaultSelectedIds(quotes: CompareQuote[]): string[] {
  const withPremium = quotes.filter((row) => row.premium != null);
  if (withPremium.length === 0) return quotes.slice(0, 2).map((row) => row.id);
  const quoted = withPremium.filter(
    (row) => row.result === "quoted" || row.source === "quote",
  );
  const pickFirst = quoted[0] ?? withPremium[0];
  const pickSecond =
    withPremium.find((row) => row.id !== pickFirst.id) ??
    quotes.find((row) => row.id !== pickFirst.id);
  return [pickFirst, pickSecond].filter(Boolean).map((row) => row!.id);
}

export function parseSelectedIds(raw: string | null | undefined, available: string[]): string[] {
  const allowed = new Set(available);
  const ids = (raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => allowed.has(id));
  return [...new Set(ids)];
}

function display(value: string | number | null | undefined, money = false): string {
  if (value == null || value === "") return "—";
  if (money && typeof value === "number") return formatMoney(value);
  return String(value);
}

export function diffQuotes(selected: CompareQuote[]): FieldDiff[] {
  if (selected.length === 0) return [];

  const fields: { key: string; label: string; read: (row: CompareQuote) => string }[] = [
    { key: "premium", label: "Premium", read: (row) => display(row.premium, true) },
    { key: "coverageA", label: "Coverage A", read: (row) => display(row.coverageA, true) },
    { key: "aop", label: "AOP deductible", read: (row) => display(row.aopDeductible) },
    { key: "hurricane", label: "Hurricane deductible", read: (row) => display(row.hurricaneDeductible) },
    { key: "bindable", label: "Bindable", read: (row) => (row.bindable ? "Yes" : "No") },
    {
      key: "gaps",
      label: "Coverage gaps",
      read: (row) => (row.coverageGaps.length ? row.coverageGaps.join("; ") : "None noted"),
    },
    { key: "result", label: "Shop result", read: (row) => display(row.result?.replaceAll("_", " ")) },
    { key: "quoteNumber", label: "Quote #", read: (row) => display(row.quoteNumber) },
  ];

  return fields.map((field) => {
    const values: Record<string, string> = {};
    for (const row of selected) {
      values[row.id] = field.read(row);
    }
    const unique = new Set(Object.values(values));
    return {
      key: field.key,
      label: field.label,
      values,
      same: unique.size <= 1,
    };
  });
}

function moneyPhrase(amount: number | null): string {
  return amount == null ? "no premium on file" : formatMoney(amount);
}

export function plainEnglishLines(selected: CompareQuote[]): string[] {
  if (selected.length === 0) {
    return ["Pick two or more quotes to see the differences in plain English."];
  }
  if (selected.length === 1) {
    const row = selected[0];
    const bind = row.bindable
      ? "It is marked bindable."
      : "It is not bindable — this is still a quote, not coverage.";
    const extra =
      row.result === "floor_only"
        ? ` That number is a carrier floor at ${moneyPhrase(row.coverageA)}, not a win at the worksheet amount.`
        : "";
    return [
      `${row.carrierName} shows ${moneyPhrase(row.premium)} at Cov A ${moneyPhrase(row.coverageA)}. ${bind}${extra}`,
      "Select a second quote to line up premium, deductibles, and Coverage A.",
    ];
  }

  const lines: string[] = [];
  const priced = selected.filter((row) => row.premium != null);
  if (priced.length >= 2) {
    const cheapest = [...priced].sort((a, b) => (a.premium ?? 0) - (b.premium ?? 0))[0];
    const others = priced.filter((row) => row.id !== cheapest.id);
    const spreads = others
      .map((row) => {
        const delta = (row.premium ?? 0) - (cheapest.premium ?? 0);
        return `${row.carrierName} is ${formatMoney(delta)} more (${formatMoney(row.premium)})`;
      })
      .join("; ");
    lines.push(
      `${cheapest.carrierName} is the cheapest at ${formatMoney(cheapest.premium)}. ${spreads}.`,
    );
  } else if (priced.length === 1) {
    lines.push(`${priced[0].carrierName} is the only selected option with a premium (${formatMoney(priced[0].premium)}).`);
  }

  const covAs = new Set(selected.map((row) => row.coverageA ?? "missing"));
  if (covAs.size === 1 && selected[0].coverageA != null) {
    lines.push(`Every selected quote uses Coverage A ${formatMoney(selected[0].coverageA)}.`);
  } else {
    const bits = selected.map((row) => `${row.carrierName} ${moneyPhrase(row.coverageA)}`);
    lines.push(`Coverage A is not the same across these quotes: ${bits.join("; ")}.`);
  }

  const aops = new Set(selected.map((row) => (row.aopDeductible ?? "").trim().toLowerCase() || "—"));
  const canes = new Set(
    selected.map((row) => (row.hurricaneDeductible ?? "").trim().toLowerCase() || "—"),
  );
  if (aops.size === 1 && canes.size === 1 && selected[0].aopDeductible) {
    lines.push(
      `Deductibles match: AOP ${selected[0].aopDeductible}, hurricane ${selected[0].hurricaneDeductible ?? "—"}.`,
    );
  } else if (aops.size > 1 || canes.size > 1) {
    lines.push(
      selected
        .map(
          (row) =>
            `${row.carrierName} AOP ${row.aopDeductible ?? "—"} / hurricane ${row.hurricaneDeductible ?? "—"}.`,
        )
        .join(" "),
    );
  }

  const bindable = selected.filter((row) => row.bindable);
  const notBindable = selected.filter((row) => !row.bindable);
  if (bindable.length === selected.length) {
    lines.push("All selected quotes are marked bindable. A quote still does not create a policy.");
  } else if (bindable.length === 0) {
    lines.push(
      "None of the selected quotes are bindable. Floors and UW holds stay on the deal — do not treat them as coverage.",
    );
  } else {
    lines.push(
      `${bindable.map((row) => row.carrierName).join(" and ")} ${bindable.length === 1 ? "is" : "are"} bindable. ${notBindable.map((row) => row.carrierName).join(" and ")} ${notBindable.length === 1 ? "is" : "are"} not.`,
    );
  }

  const floors = selected.filter((row) => row.result === "floor_only");
  if (floors.length) {
    lines.push(
      `${floors.map((row) => row.carrierName).join(" and ")} ${floors.length === 1 ? "is a floor" : "are floors"} — the carrier raised Coverage A. That is not a win at the worksheet amount.`,
    );
  }

  const gapped = selected.filter((row) => row.coverageGaps.length > 0);
  if (gapped.length) {
    lines.push(
      gapped
        .map((row) => `${row.carrierName} notes: ${row.coverageGaps.join("; ")}.`)
        .join(" "),
    );
  }

  lines.push("Quotes are not coverage. Bind is the only path that writes a policy.");
  return lines;
}

export function proposalFilename(dealTitle: string): string {
  const slug = dealTitle.replace(/[^\w.-]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "deal";
  return `proposal-${slug}.pdf`;
}
