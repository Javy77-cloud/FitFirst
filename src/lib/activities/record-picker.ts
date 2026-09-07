export type ActivityRecordKind = "lead" | "deal" | "contact";

export type ActivityRecordHit = {
  kind: ActivityRecordKind;
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  leadId: string | null;
  dealId: string | null;
  contactId: string | null;
  accountId: string | null;
};

export function activityRecordHaystack(row: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  title?: string | null;
}): string {
  return [row.name, row.title, row.phone, row.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesActivityRecordQuery(
  query: string,
  row: { name?: string | null; phone?: string | null; email?: string | null; title?: string | null },
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (activityRecordHaystack(row).includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3) {
    const phone = (row.phone ?? "").replace(/\D/g, "");
    if (phone.includes(digits)) return true;
  }
  return false;
}

export function rankActivityRecordHits(hits: ActivityRecordHit[], query: string): ActivityRecordHit[] {
  const q = query.trim().toLowerCase();
  return [...hits].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aExact = aName === q ? 0 : aName.startsWith(q) ? 1 : aName.includes(q) ? 2 : 3;
    const bExact = bName === q ? 0 : bName.startsWith(q) ? 1 : bName.includes(q) ? 2 : 3;
    if (aExact !== bExact) return aExact - bExact;
    const order = { contact: 0, lead: 1, deal: 2 } as const;
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    return a.name.localeCompare(b.name);
  });
}
