/** Serializable attention row for work-queue grouping (RSC → client). */
export type AttentionGroupInput = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
};

/** Titles like "Collect ID cards · HP-FL-88421" or "Servicing · AOR packet · HO3-…". */
const COLLECT_RE = /^(Collect .+?) · (.+)$/;
const SERVICING_RE = /^(Servicing · .+?) · (.+)$/;

export type GroupedAttentionRow =
  | { kind: "single"; item: AttentionGroupInput }
  | {
      kind: "checklist_group";
      id: string;
      itemType: string;
      count: number;
      items: AttentionGroupInput[];
      samplePolicies: string[];
    };

export function checklistItemType(item: AttentionGroupInput): string | null {
  const title = item.title?.trim() ?? "";
  const collect = COLLECT_RE.exec(title);
  if (collect) return collect[1];
  const servicing = SERVICING_RE.exec(title);
  if (servicing) return servicing[1];
  if (item.kind === "task" && (title.startsWith("Collect ") || title.startsWith("Servicing ·"))) {
    return title.includes(" · ") ? title.slice(0, title.lastIndexOf(" · ")) : title;
  }
  if (item.kind === "task" && /servicing/i.test(item.detail ?? "")) {
    if (title.includes(" · ") && (title.startsWith("Collect ") || title.startsWith("Servicing ·"))) {
      return title.slice(0, title.lastIndexOf(" · "));
    }
  }
  return null;
}

export function policySampleFromTitle(title: string): string {
  if (!title.includes(" · ")) return title;
  return title.slice(title.lastIndexOf(" · ") + 3).trim();
}

/**
 * Collapse identical Collect / Servicing checklist walls into one expandable
 * row per item type (count + sample policies). Non-checklist rows stay single.
 * Soft-refresh safe: pure transform over the current attention list.
 */
export function groupChecklistAttention(items: AttentionGroupInput[]): GroupedAttentionRow[] {
  const groups = new Map<string, AttentionGroupInput[]>();

  for (const item of items) {
    const type = checklistItemType(item);
    if (!type) continue;
    const bucket = groups.get(type) ?? [];
    bucket.push(item);
    groups.set(type, bucket);
  }

  const out: GroupedAttentionRow[] = [];
  const emittedGroups = new Set<string>();

  for (const item of items) {
    const type = checklistItemType(item);
    if (!type) {
      out.push({ kind: "single", item });
      continue;
    }
    const bucket = groups.get(type);
    if (!bucket) continue;
    if (bucket.length < 2) {
      out.push({ kind: "single", item });
      continue;
    }
    if (emittedGroups.has(type)) continue;
    emittedGroups.add(type);
    const samplePolicies = [
      ...new Set(bucket.map((row) => policySampleFromTitle(row.title)).filter(Boolean)),
    ].slice(0, 3);
    out.push({
      kind: "checklist_group",
      id: `checklist:${type}`,
      itemType: type,
      count: bucket.length,
      items: bucket,
      samplePolicies,
    });
  }

  return out;
}
