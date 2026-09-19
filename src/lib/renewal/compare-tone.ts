import { parseMoney, type CoverageCompareRow } from "@/lib/renewal/compare";

export type CompareTone = "green" | "amber" | "red";

export type TonedCompareRow = CoverageCompareRow & {
  tone: CompareTone;
};

export function compareLineTone(input: {
  currentValue: string;
  proposedValue: string;
  kind?: "premium" | "coverage" | "deductible" | "term";
}): CompareTone {
  const current = (input.currentValue || "—").trim() || "—";
  const proposed = (input.proposedValue || "—").trim() || "—";
  if (current === proposed) return "green";
  if (current === "—" || proposed === "—") return "red";
  if (input.kind === "premium") {
    const cur = parseMoney(current);
    const next = parseMoney(proposed);
    if (cur != null && next != null && cur > 0 && next >= cur * 1.08) return "red";
  }
  return "amber";
}

export function toneCoverageRows(rows: CoverageCompareRow[]): TonedCompareRow[] {
  return rows.map((row) => ({
    ...row,
    tone: compareLineTone({
      currentValue: row.currentValue,
      proposedValue: row.proposedValue,
      kind: "coverage",
    }),
  }));
}

export function fallbackDiffSummary(input: {
  bothSides: boolean;
  premiumTone?: CompareTone | null;
  premiumText?: string | null;
  changedCount: number;
  missingCount: number;
}): string {
  if (!input.bothSides) {
    return "Snapshot only — add the other term to unlock a side-by-side and a Gemini loss-risk note.";
  }
  const bits: string[] = [];
  if (input.premiumText) bits.push(input.premiumText);
  if (input.changedCount > 0) {
    bits.push(
      input.changedCount === 1 ? "1 coverage line moved." : `${input.changedCount} coverage lines moved.`,
    );
  }
  if (input.missingCount > 0) {
    bits.push(
      input.missingCount === 1
        ? "1 line is missing on one side."
        : `${input.missingCount} lines are missing on one side.`,
    );
  }
  if (input.premiumTone === "red") bits.push("Price shock is the retention risk.");
  if (bits.length === 0) return "Both terms match on the lines we have. Confirm with the client before binding.";
  return bits.join(" ");
}
