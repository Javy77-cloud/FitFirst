import { isSuspenseDocKey, type SuspenseDocKey } from "@/lib/domain-ams";

export type SuspenseBoardRow = {
  taskId: string;
  policyId: string;
  policyNumber: string;
  partyName: string;
  docKey: SuspenseDocKey;
  title: string;
  dueDate: Date | null;
  status: string;
};

export function filterSuspenseBoard(
  rows: SuspenseBoardRow[],
  docKey?: string | null,
): SuspenseBoardRow[] {
  if (!docKey || !isSuspenseDocKey(docKey)) return rows;
  return rows.filter((row) => row.docKey === docKey);
}

export function sortSuspenseBoard(rows: SuspenseBoardRow[]): SuspenseBoardRow[] {
  return [...rows].sort((a, b) => {
    const aDue = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.policyNumber.localeCompare(b.policyNumber);
  });
}

export function openSuspenseCount(rows: SuspenseBoardRow[]): number {
  return rows.filter((row) => row.status === "open").length;
}
