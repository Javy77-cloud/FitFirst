import type { AppetiteSheetSnapshot } from "./types";

export type LookalikeHit = {
  attemptId: string;
  carrierId: string;
  similarity: number;
  result: string;
};

/**
 * Lookalike stub — compare snap fields within a partition to prior attempts.
 * TODO(sep7dl+): score year_built / roof / county / miles_to_coast / construction
 * similarity and return nearest scored shops for candidate rule mining.
 */
export function findLookalikeAttempts(_input: {
  partitionId: string;
  sheetSnapshot: AppetiteSheetSnapshot;
  carrierId?: string | null;
  limit?: number;
}): LookalikeHit[] {
  // Stub: no DB scan yet. Signature reserved for nightly / Developer Hub.
  return [];
}
