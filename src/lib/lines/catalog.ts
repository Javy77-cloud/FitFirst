export type LineBook = "personal" | "commercial";

export type DeskLine = {
  code: string;
  label: string;
  book: LineBook;
};

/** Most-used personal and commercial lines for the deal typeahead. */
export const DESK_LINES: DeskLine[] = [
  { code: "HO", label: "Homeowners", book: "personal" },
  { code: "AUTO", label: "Personal auto", book: "personal" },
  { code: "FLOOD", label: "Flood", book: "personal" },
  { code: "UMBRELLA", label: "Personal umbrella", book: "personal" },
  { code: "HO6", label: "Condo (HO-6)", book: "personal" },
  { code: "HO4", label: "Renters (HO-4)", book: "personal" },
  { code: "DWELLING", label: "Dwelling fire", book: "personal" },
  { code: "BOAT", label: "Boat", book: "personal" },
  { code: "MOTORCYCLE", label: "Motorcycle", book: "personal" },
  { code: "RV", label: "Rec / RV", book: "personal" },
  { code: "GL", label: "General liability", book: "commercial" },
  { code: "BOP", label: "Businessowners", book: "commercial" },
  { code: "WC", label: "Workers comp", book: "commercial" },
  { code: "COMM_AUTO", label: "Commercial auto", book: "commercial" },
  { code: "PROPERTY", label: "Commercial property", book: "commercial" },
  { code: "CUMBRELLA", label: "Commercial umbrella", book: "commercial" },
  { code: "CYBER", label: "Cyber", book: "commercial" },
  { code: "INLAND_MARINE", label: "Inland marine", book: "commercial" },
  { code: "PACKAGE", label: "Package / CPP", book: "commercial" },
  { code: "GARAGE", label: "Garage keepers", book: "commercial" },
];

const COMMERCIAL_CODES = new Set(
  DESK_LINES.filter((line) => line.book === "commercial").map((line) => line.code),
);

export function lineBook(code: string): LineBook {
  const u = code.trim().toUpperCase();
  if (COMMERCIAL_CODES.has(u)) return "commercial";
  if (u === "COMMERCIAL" || u === "CGL" || u === "CPP") return "commercial";
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
      line.code.toLowerCase().includes(q) || line.label.toLowerCase().includes(q),
  );
}

export function lineLabel(code: string): string {
  const u = code.trim().toUpperCase();
  return DESK_LINES.find((line) => line.code === u)?.label ?? code;
}
