/** 1–8 float above the silence sort. 9–10 sink (vacation, later). */
export const PRIORITY_PIN_MIN = 1;
export const PRIORITY_PIN_MAX = 10;
export const PRIORITY_DEMOTE_FROM = 9;

export type PriorityPinMap = Record<string, number>;

export function readPriorityRank(value: unknown): number | null {
  const rank = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(rank)) return null;
  if (rank < PRIORITY_PIN_MIN || rank > PRIORITY_PIN_MAX) return null;
  return rank;
}

export function sanitizePriorityPins(raw: unknown): PriorityPinMap {
  if (!raw || typeof raw !== "object") return {};
  const pins: PriorityPinMap = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const rank = readPriorityRank(value);
    if (!id.trim() || rank == null) continue;
    pins[id] = rank;
  }
  return pins;
}

type Ranked<T> = { card: T; rank: number; index: number };

function byRank(a: Ranked<unknown>, b: Ranked<unknown>): number {
  return a.rank - b.rank || a.index - b.index;
}

/**
 * Numbered pins 1–8 float to the top in that order.
 * Pins 9–10 drop under the natural hot/cold order.
 * Missing or cleared pins keep the incoming system order.
 */
export function applyManualPriority<T extends { id: string }>(
  cards: readonly T[],
  pins: PriorityPinMap | null | undefined,
): T[] {
  const clean = sanitizePriorityPins(pins ?? {});
  const promoted: Ranked<T>[] = [];
  const natural: T[] = [];
  const demoted: Ranked<T>[] = [];
  cards.forEach((card, index) => {
    const rank = clean[card.id];
    if (rank == null) {
      natural.push(card);
      return;
    }
    const row = { card, rank, index };
    if (rank >= PRIORITY_DEMOTE_FROM) demoted.push(row);
    else promoted.push(row);
  });
  promoted.sort(byRank);
  demoted.sort(byRank);
  return [...promoted.map((row) => row.card), ...natural, ...demoted.map((row) => row.card)];
}
