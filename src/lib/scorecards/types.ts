import type { AccessStatus } from "@/lib/people/status";

export const SCORECARD_SORTS = ["conversion", "retention", "premium", "binds"] as const;
export type ScorecardSort = (typeof SCORECARD_SORTS)[number];

export const SCORECARD_SORT_LABEL: Record<ScorecardSort, string> = {
  conversion: "Conversion",
  retention: "Retention",
  premium: "Premium",
  binds: "Binds",
};

export type ScorecardProducer = {
  id: string;
  name: string;
  role: string;
  status: AccessStatus;
};

export type ScorecardDeal = {
  id: string;
  ownerId: string | null;
  pipelineStage: string;
  boundAt: Date | null;
  archivedAt?: Date | null;
};

export type ScorecardPolicy = {
  id: string;
  ownerId: string | null;
  status: string;
  premium: number;
  dealId?: string | null;
};

export type ProducerScorecard = {
  userId: string;
  name: string;
  role: string;
  status: AccessStatus;
  shops: number;
  lost: number;
  binds: number;
  conversion: number;
  inForce: number;
  lapsed: number;
  retention: number;
  premium: number;
  rank: number;
};

export function parseScorecardSort(value: string | null | undefined): ScorecardSort {
  return (SCORECARD_SORTS as readonly string[]).includes(value ?? "")
    ? (value as ScorecardSort)
    : "premium";
}
