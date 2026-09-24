function titleWord(word: string): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  return lower.slice(0, 1).toUpperCase() + lower.slice(1);
}

function titleName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(titleWord)
    .join(" ");
}

function lettersAreCaps(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

/**
 * Named insured is First Last.
 * DEC prints `IORI DOMENIC` and `IORI, DOMENIC` become `Domenic Iori`.
 * Mixed-case names are title-cased and not reordered. Three-or-more ALL CAPS
 * tokens are title-cased in place (a business or a middle name — not guessed).
 */
export function normalizeNamedInsured(raw: string | null | undefined): string | null {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.includes(",")) {
    const [last, rest] = text.split(",", 2);
    const given = (rest ?? "").trim();
    const surname = (last ?? "").trim();
    if (!given || !surname) return titleName(text.replace(/,/g, " "));
    return titleName(`${given} ${surname}`);
  }
  const parts = text.split(" ").filter(Boolean);
  if (lettersAreCaps(text) && parts.length === 2) {
    return titleName(`${parts[1]} ${parts[0]}`);
  }
  return titleName(text);
}

/** Same person once both sides are First Last. */
export function namedInsuredsMatch(left?: string | null, right?: string | null): boolean {
  const a = normalizeNamedInsured(left);
  const b = normalizeNamedInsured(right);
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
