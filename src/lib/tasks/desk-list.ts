/** Unified Tasks list rows. Same columns as /tasks — no second board. */

export type DeskTaskRow = {
  id: string;
  title: string;
  due: Date;
  status: string;
  kind: string;
  source: "review" | "activity";
};

export function mergeDeskTaskRows(input: {
  review: { id: string; title: string; dueDate: Date; status: string; kind: string }[];
  activities: {
    id: string;
    title: string;
    dueAt: Date | null;
    startAt: Date | null;
    status: string;
    kind: string;
  }[];
}): DeskTaskRow[] {
  const rows: DeskTaskRow[] = [
    ...input.review.map((row) => ({
      id: row.id,
      title: row.title,
      due: row.dueDate,
      status: row.status,
      kind: row.kind,
      source: "review" as const,
    })),
    ...input.activities.map((row) => ({
      id: row.id,
      title: row.title,
      due: row.dueAt ?? row.startAt ?? new Date(0),
      status: row.status,
      kind: row.kind,
      source: "activity" as const,
    })),
  ];
  return rows.sort((a, b) => a.due.getTime() - b.due.getTime());
}

export function filterDeskTaskRows(
  rows: DeskTaskRow[],
  filter: { status?: string; kind?: string },
): DeskTaskRow[] {
  return rows.filter((row) => {
    if (filter.status && row.status !== filter.status) return false;
    if (filter.kind && row.kind !== filter.kind) return false;
    return true;
  });
}
