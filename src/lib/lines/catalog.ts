import { QUOTING_FORMS, type QuotingFormId, type ShopLine } from "@/lib/domain";

export type LineBook = "personal" | "commercial";

export type DeskLine = {
  /** Quoting form id (HO3, DP1, PA, …). */
  code: string;
  label: string;
  book: LineBook;
  lob: string;
  shopLine: ShopLine;
};

const COMMERCIAL_LOBS = new Set(["GL", "WC", "BOP", "CA"]);
const COMMERCIAL_FORM_IDS = new Set(["CA"]);

function bookForForm(form: { id: string; lob: string }): LineBook {
  if (COMMERCIAL_FORM_IDS.has(form.id) || COMMERCIAL_LOBS.has(form.lob)) return "commercial";
  return "personal";
}

/** Policy subtypes for the deal create typeahead — same catalog as QUOTING_FORMS. */
export const DESK_LINES: DeskLine[] = QUOTING_FORMS.map((form) => ({
  code: form.id,
  label: form.label,
  book: bookForForm(form),
  lob: form.lob,
  shopLine: form.shopLine,
}));

const BY_CODE = new Map(DESK_LINES.map((line) => [line.code.toUpperCase(), line]));

export function lineBook(code: string): LineBook {
  const u = code.trim().toUpperCase();
  const hit = BY_CODE.get(u);
  if (hit) return hit.book;
  if (COMMERCIAL_LOBS.has(u) || u === "COMMERCIAL" || u === "CGL" || u === "CPP") {
    return "commercial";
  }
  return "personal";
}

export function linesForBook(book: LineBook): DeskLine[] {
  return DESK_LINES.filter((line) => line.book === book);
}

export function filterLines(book: LineBook, query: string): DeskLine[] {
  const q = query.trim().toLowerCase();
  const pool = linesForBook(book);
  if (!q) return pool;
  return pool.filter(
    (line) =>
      line.code.toLowerCase().includes(q) ||
      line.label.toLowerCase().includes(q) ||
      line.lob.toLowerCase().includes(q),
  );
}

export function lineLabel(code: string): string {
  const u = code.trim().toUpperCase();
  return BY_CODE.get(u)?.label ?? code;
}

export function isDeskLineCode(code: string): code is QuotingFormId {
  return BY_CODE.has(code.trim().toUpperCase());
}
