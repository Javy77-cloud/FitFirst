import {
  VELOCITY_PHASES,
  VELOCITY_PHASE_LABELS,
  type HeatState,
  type VelocityPhase,
} from "@/lib/deals/velocity";

export const RADAR_SILENCE_BANDS = [
  { id: "talking", label: "0–2d", hint: "In touch", min: 0, max: 2 },
  { id: "week", label: "3–7d", hint: "This week", min: 3, max: 7 },
  { id: "quiet", label: "8–14d", hint: "Going quiet", min: 8, max: 14 },
  { id: "silent", label: "15d+", hint: "Silent", min: 15, max: Number.POSITIVE_INFINITY },
] as const;

export type RadarDeskCard = {
  heat: HeatState;
  silenceDays: number;
  spark?: number[];
  phase?: VelocityPhase | string | null;
  quoteSent?: boolean;
};

export type RadarSilenceBand = {
  id: (typeof RADAR_SILENCE_BANDS)[number]["id"];
  label: string;
  hint: string;
  count: number;
};

export type RadarPhaseShare = {
  phase: VelocityPhase;
  label: string;
  count: number;
};

/** Daily touch chart. Longer than the banner, still one quiet window — no range chrome. */
export const RADAR_TREND_DAYS = 30;
/** Banner copy stays "touches · 14 days". Count only this tail of a daily trend. */
export const RADAR_TOUCH_KPI_DAYS = 14;

export type RadarDesk = {
  total: number;
  counts: Record<HeatState, number>;
  silence: RadarSilenceBand[];
  medianSilence: number | null;
  trend: number[];
  touches: number;
  phases: RadarPhaseShare[];
  quoteSent: number;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return Math.round(value);
}

/** Full Radar glance: heat counts, silence distribution, and a 30-day touch trend. */
export function radarDesk(cards: RadarDeskCard[]): RadarDesk {
  const counts: Record<HeatState, number> = { hot: 0, cooling: 0, near_cold: 0, cold: 0 };
  for (const card of cards) {
    if (counts[card.heat] != null) counts[card.heat] += 1;
  }
  const silences = cards.map((card) => card.silenceDays).filter((days) => Number.isFinite(days));
  const silence: RadarSilenceBand[] = RADAR_SILENCE_BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    hint: band.hint,
    count: silences.filter((days) => days >= band.min && days <= band.max).length,
  }));
  const width = cards.reduce((max, card) => Math.max(max, card.spark?.length ?? 0), 0);
  const trend = Array.from({ length: width }, (_, index) =>
    cards.reduce((total, card) => total + (card.spark?.[index] ?? 0), 0),
  );
  const phaseCounts = new Map<VelocityPhase, number>();
  for (const card of cards) {
    const phase = card.phase;
    if (!phase || !(VELOCITY_PHASES as readonly string[]).includes(phase)) continue;
    const key = phase as VelocityPhase;
    phaseCounts.set(key, (phaseCounts.get(key) ?? 0) + 1);
  }
  const phases = VELOCITY_PHASES.filter((phase) => (phaseCounts.get(phase) ?? 0) > 0).map((phase) => ({
    phase,
    label: VELOCITY_PHASE_LABELS[phase],
    count: phaseCounts.get(phase) ?? 0,
  }));
  const touchDays = Math.min(RADAR_TOUCH_KPI_DAYS, trend.length);
  return {
    total: cards.length,
    counts,
    silence,
    medianSilence: median(silences),
    trend,
    touches: trend.slice(trend.length - touchDays).reduce((total, value) => total + value, 0),
    phases,
    quoteSent: cards.filter((card) => card.quoteSent).length,
  };
}
