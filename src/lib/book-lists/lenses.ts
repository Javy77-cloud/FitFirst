import type { BookFamily, BookGlanceCard, BookHeat, BookLayout, BookLensId, BookSurface } from "./types";

const LENS_IDS = new Set<BookLensId>([
  "clients",
  "at_risk",
  "open_shops",
  "stale",
  "prospects",
  "book",
  "rateable",
  "skip",
  "unused",
  "written",
  "renewal",
  "silent",
  "needs",
  "in_force",
  "lapse",
]);

const HEATS = new Set<BookHeat>(["hot", "cooling", "cold"]);

export function parseBookHeat(value: string | null | undefined): BookHeat | null {
  if (!value) return null;
  return HEATS.has(value as BookHeat) ? (value as BookHeat) : null;
}

const LOBS = new Set<BookFamily>(["pc", "life", "health"]);

export function parseBookLob(value: string | null | undefined): BookFamily | null {
  if (!value) return null;
  return LOBS.has(value as BookFamily) ? (value as BookFamily) : null;
}

/** Policies land on the band board. Stack is the wide card list. */
export function parseBookLayout(value: string | null | undefined): BookLayout {
  return value === "stack" ? "stack" : "bands";
}

export function parseBookLens(value: string | null | undefined): BookLensId | null {
  if (!value) return null;
  return LENS_IDS.has(value as BookLensId) ? (value as BookLensId) : null;
}

export function bookListHref(input: {
  path: string;
  heat?: string | null;
  lens?: string | null;
  q?: string | null;
  extra?: Record<string, string | undefined>;
}): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.heat) params.set("heat", input.heat);
  if (input.lens) params.set("lens", input.lens);
  for (const [key, value] of Object.entries(input.extra ?? {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${input.path}?${query}` : input.path;
}

export function matchesBookLens(
  card: BookGlanceCard,
  input: { heat?: BookHeat | null; lens?: BookLensId | null; q?: string | null },
): boolean {
  if (input.heat && card.heat !== input.heat) return false;
  if (input.q) {
    if (!card.hay.includes(input.q.toLowerCase())) return false;
  }
  if (!input.lens) return true;
  switch (input.lens) {
    case "clients":
      return Boolean(card.flags.client);
    case "at_risk":
      return card.heat === "hot" || card.riskBand === "high" || card.healthHint?.level === "red";
    case "open_shops":
      return (card.flags.openShops ?? 0) > 0;
    case "stale":
      return card.lastTouchDays == null || card.lastTouchDays >= 21;
    case "prospects":
      return (card.flags.inForce ?? 0) === 0 && (card.flags.openShops ?? 0) === 0;
    case "book":
      return Boolean(card.flags.writtenBook || (card.flags.inForce ?? 0) > 0);
    case "rateable":
      return card.column === "rateable";
    case "skip":
      return card.column === "skip";
    case "unused":
      return card.lastTouchDays == null;
    case "written":
      return Boolean(card.flags.writtenBook);
    case "renewal":
      return Boolean(card.flags.renewalSoon);
    case "silent":
      return Boolean(card.flags.silent);
    case "needs":
      return Boolean(card.flags.needsCare);
    case "in_force":
      return Boolean(card.flags.writtenBook) && !card.flags.lapsed;
    case "lapse":
      return Boolean(card.flags.lapsed);
    default:
      return true;
  }
}

export function lensesFor(surface: BookSurface) {
  if (surface === "contacts") {
    return [
      { id: "clients" as const, label: "Clients" },
      { id: "at_risk" as const, label: "At risk" },
      { id: "open_shops" as const, label: "Open shops" },
      { id: "stale" as const, label: "Stale" },
      { id: "prospects" as const, label: "Prospects" },
    ];
  }
  if (surface === "accounts") {
    return [
      { id: "clients" as const, label: "Clients" },
      { id: "book" as const, label: "Has book" },
      { id: "open_shops" as const, label: "Open shops" },
      { id: "stale" as const, label: "Stale" },
    ];
  }
  if (surface === "policies") {
    return [
      { id: "needs" as const, label: "Needs care" },
      { id: "renewal" as const, label: "Renewal soon" },
      { id: "silent" as const, label: "Silent" },
      { id: "in_force" as const, label: "In-force" },
      { id: "lapse" as const, label: "Lapse" },
    ];
  }
  return [
    { id: "rateable" as const, label: "Quote-ready" },
    { id: "skip" as const, label: "Skip" },
    { id: "unused" as const, label: "Stale" },
    { id: "written" as const, label: "Written book" },
  ];
}
