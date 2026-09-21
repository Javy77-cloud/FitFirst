import { SETTINGS_NAV, type SettingsNavId } from "@/lib/settings/nav";

export type SettingsSearchHit = {
  id: string;
  href: string;
  label: string;
  groupLabel: string;
  hint: string;
  kind: "group" | "child";
  navId: SettingsNavId;
  haystack: string;
  aliases: string[];
};

function hay(parts: Array<string | undefined>): string {
  return parts
    .flatMap((part) => (part ? [part] : []))
    .join(" ")
    .toLowerCase();
}

export function buildSettingsSearchIndex(): SettingsSearchHit[] {
  const hits: SettingsSearchHit[] = [];
  for (const group of SETTINGS_NAV) {
    const groupAliases = group.aliases ?? [];
    hits.push({
      id: `group:${group.id}`,
      href: group.href,
      label: group.label,
      groupLabel: group.label,
      hint: group.hint,
      kind: "group",
      navId: group.id,
      aliases: groupAliases,
      haystack: hay([group.label, group.hint, group.blurb, ...groupAliases]),
    });
    for (const child of group.children) {
      const childAliases = child.aliases ?? [];
      hits.push({
        id: `${group.id}:${child.id}:${child.href}`,
        href: child.href,
        label: child.label,
        groupLabel: group.label,
        hint: child.hint,
        kind: "child",
        navId: child.id,
        aliases: childAliases,
        haystack: hay([child.label, child.hint, group.label, ...childAliases]),
      });
    }
  }
  return hits;
}

const INDEX = buildSettingsSearchIndex();

function scoreHit(hit: SettingsSearchHit, query: string, tokens: string[]): number {
  const label = hit.label.toLowerCase();
  const hint = hit.hint.toLowerCase();
  const aliases = hit.aliases.map((alias) => alias.toLowerCase());
  if (label === query) return 400;
  if (aliases.some((alias) => alias === query)) return 360;
  if (label.startsWith(query)) return 300;
  if (aliases.some((alias) => alias.startsWith(query) || alias.includes(query))) return 260;
  if (label.includes(query)) return 200;
  if (hint.includes(query)) return 120;
  if (tokens.every((token) => hit.haystack.includes(token))) {
    return 80 + (hit.kind === "child" ? 10 : 0);
  }
  return 0;
}

/** Typeahead over group labels, child labels, hints, and aliases (e.g. Google → Gmail + Social/GBP). */
export function searchSettings(query: string, limit = 8): SettingsSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const ranked = INDEX.map((hit) => ({ hit, score: scoreHit(hit, q, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.label.localeCompare(b.hit.label));
  const seen = new Set<string>();
  const out: SettingsSearchHit[] = [];
  for (const row of ranked) {
    const key = `${row.hit.href}::${row.hit.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row.hit);
    if (out.length >= limit) break;
  }
  return out;
}
