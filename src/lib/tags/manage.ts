import { normalizeTag, type TagModule } from "./module-tags";

export function renameTagInList(tags: string[], from: string, to: string): string[] {
  const source = normalizeTag(from);
  const target = normalizeTag(to);
  if (!source || !target) return tags;
  const next: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const value = tag === source ? target : tag;
    if (!value || seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  return next;
}

export function mergeTagInList(tags: string[], from: string, into: string): string[] {
  return renameTagInList(tags, from, into);
}

export function deleteTagFromList(tags: string[], name: string): string[] {
  const drop = normalizeTag(name);
  return tags.filter((tag) => tag !== drop);
}

export function tagManagePaths(module: TagModule) {
  return {
    list: `/${module}`,
    detail: (id: string) => `/${module}/${id}`,
    manage: `/settings/tags?module=${module}`,
  };
}
