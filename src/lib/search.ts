export type SearchHitType = "contact" | "account" | "shop" | "policy";

export type SearchHit = {
  type: SearchHitType;
  id: string;
  href: string;
  title: string;
  subtitle: string;
};

export type GroupedSearch = {
  contacts: SearchHit[];
  accounts: SearchHit[];
  shops: SearchHit[];
  policies: SearchHit[];
};

export function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

export function escapeIlike(q: string): string {
  return normalizeQuery(q).replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export function ilikePattern(q: string): string {
  return `%${escapeIlike(q)}%`;
}

export function emptyGroupedSearch(): GroupedSearch {
  return { contacts: [], accounts: [], shops: [], policies: [] };
}

export function totalHits(grouped: GroupedSearch): number {
  return (
    grouped.contacts.length +
    grouped.accounts.length +
    grouped.shops.length +
    grouped.policies.length
  );
}
