import {
  isSuspenseAgeBucket,
  type SuspenseAgeBucket,
} from "@/lib/domain-ams";
import type { SuspenseBoardRow } from "./suspense-board";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysOpen(openedAt: Date | null | undefined, asOf: Date): number {
  if (!openedAt) return 0;
  return Math.max(0, Math.floor((asOf.getTime() - openedAt.getTime()) / MS_PER_DAY));
}

export function suspenseAgeBucket(days: number): SuspenseAgeBucket {
  if (days <= 7) return "current";
  if (days <= 14) return "watch";
  if (days <= 29) return "aging";
  return "stale";
}

export function ageSuspenseRow(
  row: SuspenseBoardRow,
  asOf: Date,
): SuspenseBoardRow & { daysOpen: number; age: SuspenseAgeBucket } {
  const openDays = daysOpen(row.openedAt, asOf);
  return {
    ...row,
    daysOpen: openDays,
    age: suspenseAgeBucket(openDays),
  };
}

export function filterSuspenseByAge(
  rows: Array<SuspenseBoardRow & { age?: SuspenseAgeBucket }>,
  age?: string | null,
): Array<SuspenseBoardRow & { age?: SuspenseAgeBucket }> {
  if (!age || !isSuspenseAgeBucket(age)) return rows;
  return rows.filter((row) => row.age === age);
}

export function countSuspenseByAge(
  rows: Array<{ age: SuspenseAgeBucket }>,
): Record<SuspenseAgeBucket, number> {
  const counts: Record<SuspenseAgeBucket, number> = {
    current: 0,
    watch: 0,
    aging: 0,
    stale: 0,
  };
  for (const row of rows) counts[row.age] += 1;
  return counts;
}
