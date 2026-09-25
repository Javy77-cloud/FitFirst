/**
 * FitFirst UI label casing (Javy 2026-09-11 / reinforced 2026-09-13):
 * Title Case every meaningful word on buttons, links, and action chips.
 * Keep short connectors lowercase mid-phrase (a, an, and, as, at, but, by, for,
 * from, in, into, of, on, or, over, the, to, with) — still capitalize when first or last.
 * Keep & / - punctuation; preserve ALLCAPS acronyms (SMS, MVR, PDF).
 */

const KEEP_AS_IS = new Set(["&", "/", "-", "–", "—"]);

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "over",
  "the",
  "to",
  "with",
]);

function capitalizeWord(word: string): string {
  if (!word) return word;
  if (/^[A-Z0-9]{2,}$/.test(word)) return word;
  if (/^[A-Z0-9]+(?:\/[A-Z0-9]+)+$/.test(word)) return word;
  return word
    .split(/(-)/)
    .map((piece) => {
      if (piece === "-") return piece;
      if (!piece) return piece;
      if (/^[A-Z0-9]{2,}$/.test(piece)) return piece;
      return piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase();
    })
    .join("");
}

export function titleCaseLabel(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;
  const parts = raw.split(/(\s+)/);
  const wordIndexes: number[] = [];
  parts.forEach((part, index) => {
    if (!/^\s+$/.test(part) && !KEEP_AS_IS.has(part)) wordIndexes.push(index);
  });
  const firstWord = wordIndexes[0];
  const lastWord = wordIndexes[wordIndexes.length - 1];

  return parts
    .map((part, index) => {
      if (/^\s+$/.test(part)) return part;
      if (/^e&o$/i.test(part)) return "E&O";
      if (KEEP_AS_IS.has(part)) return part;
      if (/^[A-Z0-9]{2,}$/.test(part)) return part;
      if (/^[A-Z0-9]+(?:\/[A-Z0-9]+)+$/.test(part)) return part;
      const lower = part.toLowerCase();
      const isEdge = index === firstWord || index === lastWord;
      if (!isEdge && SMALL_WORDS.has(lower)) return lower;
      return capitalizeWord(part);
    })
    .join("");
}
