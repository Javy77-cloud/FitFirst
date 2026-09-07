export const TAG_MODULES = ["leads", "contacts", "deals", "policies"] as const;
export type TagModule = (typeof TAG_MODULES)[number];

export const SUGGESTED_MODULE_TAGS: Record<TagModule, readonly string[]> = {
  leads: ["hot", "referral", "inbound", "web", "renewal"],
  contacts: ["client", "referral", "vip", "review-due", "do-not-solicit"],
  deals: ["shopping", "urgent", "multi-line", "referral"],
  policies: ["renewal", "review-due", "claim", "endorsement"],
};

const LEAD_ONLY = new Set(["hot", "inbound", "web"]);

export function isTagModule(value: string): value is TagModule {
  return (TAG_MODULES as readonly string[]).includes(value);
}

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

export function normalizeTags(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const tag = normalizeTag(String(item ?? ""));
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function parseTagsFromForm(form: FormData, key = "tags"): string[] {
  const many = form.getAll(key).flatMap((value) => String(value).split(","));
  return normalizeTags(many);
}

export function suggestedTagsFor(module: TagModule, extra: string[] = []): string[] {
  return normalizeTags([...SUGGESTED_MODULE_TAGS[module], ...extra]);
}

/** Carry referral / custom tags; drop lead-only heat/source chips. */
export function carryLeadTagsToContact(leadTags: unknown): string[] {
  return normalizeTags(leadTags).filter((tag) => !LEAD_ONLY.has(tag));
}

export function mergeTags(...groups: unknown[]): string[] {
  return normalizeTags(groups.flatMap((group) => (Array.isArray(group) ? group : [])));
}

export function formatTagLabel(tag: string): string {
  return tag
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Stable list-cell sort/display string — same on SSR and CSR. Do not walk TagChips. */
export function tagSortText(tags: string[] | null | undefined): string {
  return normalizeTags(tags).map(formatTagLabel).join(" ");
}
