import { normalizeTag, normalizeTags, TAG_MODULE_PATHS, type TagModule } from "./module-tags";

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
  const paths = TAG_MODULE_PATHS[module];
  return {
    list: paths.list,
    detail: paths.detail,
    manage: `/settings/tags?module=${module}`,
  };
}

/** Assignment never invents catalog names — only pick from the module set. */
export function assignFromCatalog(selected: string[], catalog: readonly string[]): string[] {
  const allowed = new Set(catalog.map((name) => normalizeTag(name)).filter(Boolean));
  return normalizeTags(selected).filter((tag) => allowed.has(tag));
}
