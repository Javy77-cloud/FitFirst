export const RECENT_STORAGE_KEY = "fitfirst.recently-accessed";
export const RECENT_LIMIT = 8;

export type RecentKind = "contact" | "deal" | "policy";

export type RecentRecord = {
  kind: RecentKind;
  id: string;
  title: string;
  href: string;
  at: number;
};

const KIND_FROM_SEGMENT: Record<string, RecentKind> = {
  contacts: "contact",
  deals: "deal",
  policies: "policy",
};

export function recentHref(kind: RecentKind, id: string): string {
  if (kind === "contact") return `/contacts/${id}`;
  if (kind === "deal") return `/deals/${id}`;
  return `/policies/${id}`;
}

export function parseRecordPath(pathname: string): { kind: RecentKind; id: string; href: string } | null {
  const match = pathname.match(/^\/(contacts|deals|policies)\/([^/?#]+)/);
  if (!match) return null;
  const kind = KIND_FROM_SEGMENT[match[1] ?? ""];
  const id = match[2];
  if (!kind || !id) return null;
  return { kind, id, href: recentHref(kind, id) };
}

export function isRecentRecord(value: unknown): value is RecentRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as RecentRecord;
  return (
    (row.kind === "contact" || row.kind === "deal" || row.kind === "policy") &&
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.href === "string" &&
    typeof row.at === "number"
  );
}

export function readLocalRecent(raw: string | null): RecentRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentRecord).slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export function pushLocalRecent(existing: RecentRecord[], next: Omit<RecentRecord, "at">, at = Date.now()): RecentRecord[] {
  const row: RecentRecord = { ...next, at };
  const rest = existing.filter((item) => !(item.kind === row.kind && item.id === row.id));
  return [row, ...rest].slice(0, RECENT_LIMIT);
}

export function mergeRecent(local: RecentRecord[], stub: RecentRecord[]): RecentRecord[] {
  const seen = new Set<string>();
  const out: RecentRecord[] = [];
  for (const item of [...local, ...stub]) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= RECENT_LIMIT) break;
  }
  return out;
}

export function recentKindLabel(kind: RecentKind): string {
  if (kind === "contact") return "Contact";
  if (kind === "deal") return "Deal";
  return "Policy";
}
