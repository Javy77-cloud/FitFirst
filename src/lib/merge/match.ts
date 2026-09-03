import type { MatchReason, MergeEntityType } from "@/lib/domain";
import { isAnaLockedId, isAnaName } from "./lock";
import { isRetired, matchReasons, pairKey, type PersonLike } from "./normalize";

export type DetectedPair = {
  entityType: MergeEntityType;
  leftId: string;
  rightId: string;
  matchReasons: MatchReason[];
};

export function skipFromScan(person: PersonLike): boolean {
  if (isRetired(person)) return true;
  if (isAnaLockedId(person.id)) return true;
  if (isAnaName(person.firstName, person.lastName)) return true;
  return false;
}

export function findDuplicatePairs(
  entityType: MergeEntityType,
  people: PersonLike[],
): DetectedPair[] {
  const active = people.filter((p) => !skipFromScan(p));
  const pairs: DetectedPair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const reasons = matchReasons(a, b);
      if (reasons.length === 0) continue;
      const [leftId, rightId] = pairKey(a.id, b.id);
      const key = `${entityType}:${leftId}:${rightId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ entityType, leftId, rightId, matchReasons: reasons });
    }
  }

  return pairs;
}
