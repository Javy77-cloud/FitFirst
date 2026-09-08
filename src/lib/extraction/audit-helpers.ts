import { DEAL_ID } from "@/lib/fixtures/ids";

export function isCoverageALocked(
  dealId: string | null | undefined,
  fieldKey: string,
  existingSource?: string | null,
): boolean {
  if (fieldKey !== "coverage_a") return false;
  if (dealId === DEAL_ID) return true;
  if (existingSource === "javy") return true;
  return false;
}

/** Pure helper for tests — bump times_seen on duplicate proposed_synonym+field_key. */
export function nextCandidateTimesSeen(
  rows: { fieldKey: string; proposedSynonym: string; timesSeen: number }[],
  fieldKey: string,
  proposedSynonym: string,
): number {
  const hit = rows.find(
    (row) => row.fieldKey === fieldKey && row.proposedSynonym === proposedSynonym,
  );
  return (hit?.timesSeen ?? 0) + 1;
}
