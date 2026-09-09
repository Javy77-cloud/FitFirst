import type { AppetiteColor } from "./types";
import { resolveActualColor, SHADOW_SKIP_ACTUALS } from "./types";

export type ShadowPredictionScoreRow = {
  id: string;
  predicted: string;
  actualDisposition: string | null;
  scored: boolean;
};

export type ScorePartitionResult = {
  considered: number;
  matched: number;
  skipped: number;
  accuracyPct: number | null;
  scoredShops: number;
  graduated: boolean;
  status: "shadow" | "live" | "held";
};

export type ScorePartitionOptions = {
  /** Prior cumulative scored shops (partition.scored_shops). */
  priorScoredShops?: number;
  /** Prior correct predictions (accuracy_pct * priorScoredShops). */
  priorMatched?: number;
  minSample?: number;
  accuracyThreshold?: number;
  /** Current partition status. */
  status?: "shadow" | "live" | "held";
};

function colorsEqual(predicted: string, actualColor: AppetiteColor): boolean {
  return predicted.trim().toLowerCase() === actualColor;
}

/**
 * Pure graduation / accuracy logic for scorePartition.
 * Skips Incomplete / portal_closed / login_fail (and other SHADOW_SKIP_ACTUALS).
 * floor_only actuals count as yellow via resolveActualColor.
 */
export function computePartitionScore(
  rows: ShadowPredictionScoreRow[],
  opts: ScorePartitionOptions = {},
): ScorePartitionResult {
  const minSample = opts.minSample ?? 30;
  const accuracyThreshold = opts.accuracyThreshold ?? 0.9;
  const status = opts.status ?? "shadow";
  const priorScored = opts.priorScoredShops ?? 0;
  const priorMatched = opts.priorMatched ?? 0;

  let considered = 0;
  let matched = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.scored) continue;
    const actual = row.actualDisposition?.trim().toLowerCase() ?? "";
    if (!actual) {
      skipped += 1;
      continue;
    }
    if (SHADOW_SKIP_ACTUALS.has(actual)) {
      skipped += 1;
      continue;
    }
    const actualColor = resolveActualColor(actual);
    if (!actualColor) {
      skipped += 1;
      continue;
    }
    considered += 1;
    if (colorsEqual(row.predicted, actualColor)) matched += 1;
  }

  const totalMatched = priorMatched + matched;
  const scoredShops = priorScored + considered;
  const accuracyPct = scoredShops > 0 ? totalMatched / scoredShops : null;

  const graduated =
    status === "shadow" &&
    scoredShops >= minSample &&
    accuracyPct != null &&
    accuracyPct >= accuracyThreshold;

  return {
    considered,
    matched,
    skipped,
    accuracyPct,
    scoredShops,
    graduated,
    status: graduated ? "live" : status,
  };
}

/** Helper for tests: score a batch as if prior is empty. */
export function scoreBatchForGraduation(
  predictions: Array<{ predicted: AppetiteColor; actual: string }>,
  opts: { minSample?: number; accuracyThreshold?: number } = {},
): ScorePartitionResult {
  const rows: ShadowPredictionScoreRow[] = predictions.map((p, i) => ({
    id: `row-${i}`,
    predicted: p.predicted,
    actualDisposition: p.actual,
    scored: false,
  }));
  return computePartitionScore(rows, {
    minSample: opts.minSample ?? 30,
    accuracyThreshold: opts.accuracyThreshold ?? 0.9,
    status: "shadow",
    priorScoredShops: 0,
    priorMatched: 0,
  });
}
