export type RadarGlanceCard = {
  heat: string;
  silenceDays: number;
  spark?: number[];
};

export type RadarGlance = {
  total: number;
  hot: number;
  medianSilence: number | null;
  spark: number[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return Math.round(value);
}

/** Thin Radar header: how many, how hot, how quiet, and a single touch spark. */
export function radarGlance(cards: RadarGlanceCard[]): RadarGlance {
  const silences = cards.map((card) => card.silenceDays).filter((days) => Number.isFinite(days));
  const width = cards.reduce((max, card) => Math.max(max, card.spark?.length ?? 0), 0);
  const spark = Array.from({ length: width }, (_, index) => {
    if (cards.length === 0) return 0;
    const sum = cards.reduce((total, card) => total + (card.spark?.[index] ?? 0), 0);
    return sum / cards.length;
  });
  return {
    total: cards.length,
    hot: cards.filter((card) => card.heat === "hot").length,
    medianSilence: median(silences),
    spark,
  };
}
