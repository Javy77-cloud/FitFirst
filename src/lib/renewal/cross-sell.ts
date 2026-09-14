import { HOME_LINE_LABEL, homeLineKey, type HomeLineKey } from "@/lib/home/lines";

/** Personal lines we suggest at renewal when the household is missing them. */
export const RENEWAL_CROSS_SELL_LINES: HomeLineKey[] = ["HO", "AUTO", "FLOOD"];

export type CrossSellSuggestion = {
  line: HomeLineKey;
  label: string;
  copy: string;
};

export function missingRenewalCrossSellLines(
  heldLines: Array<string | null | undefined>,
): CrossSellSuggestion[] {
  const held = new Set<HomeLineKey>();
  for (const raw of heldLines) {
    if (!raw) continue;
    const key = homeLineKey(raw);
    if (key && RENEWAL_CROSS_SELL_LINES.includes(key)) held.add(key);
  }
  // Only suggest when the household already has at least one personal line.
  if (held.size === 0) return [];
  return RENEWAL_CROSS_SELL_LINES.filter((line) => !held.has(line)).map((line) => ({
    line,
    label: HOME_LINE_LABEL[line],
    copy: `This client has no ${HOME_LINE_LABEL[line].toLowerCase()} policy. Suggested: ${HOME_LINE_LABEL[line].toLowerCase()} quote.`,
  }));
}
