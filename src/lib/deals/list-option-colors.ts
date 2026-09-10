import { loadGlobalLists } from "@/lib/db/global-lists";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { resolveColorKey, type StatusColorKey } from "@/lib/desk/status-colors";

/** Normalize labels/slugs so "First Connect", "first-connect", "first_connect" match. */
export function normalizeListColorKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export type DealListColorMaps = {
  /** Selling Agency — Global lists (label + slug → named color). */
  sellingAgency: Record<string, string>;
  /** Pipeline picklist (Health / Life / P&C). */
  pipeline: Record<string, string>;
};

/** Build a lookup keyed by both raw label and normalized slug. */
export function buildColorLookup(
  rows: readonly { label?: string | null; slug?: string | null; value?: string | null; color?: string | null }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    const color = (row.color ?? "").trim().toLowerCase();
    if (!color) continue;
    const resolved = resolveColorKey(color);
    // Only keep named palette keys (skip unknown → slate noise).
    if (resolved === "slate" && color !== "slate" && color !== "grey" && color !== "gray") continue;
    const keys = [row.label, row.slug, row.value].filter(Boolean) as string[];
    for (const key of keys) {
      const trimmed = key.trim();
      if (!trimmed) continue;
      map[trimmed] = resolved;
      map[normalizeListColorKey(trimmed)] = resolved;
    }
  }
  return map;
}

/** Case-insensitive / slug-aware color lookup across one or more maps. */
export function lookupListColor(
  raw: string | null | undefined,
  ...maps: Array<Record<string, string | null | undefined> | undefined | null>
): StatusColorKey | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const norm = normalizeListColorKey(value);
  for (const map of maps) {
    if (!map) continue;
    const direct = map[value] ?? map[norm];
    if (direct) return resolveColorKey(direct);
    const lower = value.toLowerCase();
    for (const [key, color] of Object.entries(map)) {
      if (!color) continue;
      if (key.toLowerCase() === lower || normalizeListColorKey(key) === norm) {
        return resolveColorKey(color);
      }
    }
  }
  return null;
}

/** Load Selling Agency + Pipeline color maps once for the deals list. */
export async function loadDealListColorMaps(): Promise<DealListColorMaps> {
  const [agencies, picklists] = await Promise.all([
    loadGlobalLists("selling_agency").catch(() => []),
    listFieldPicklists().catch(() => []),
  ]);
  const pipelineList =
    picklists.find((list) => list.name.trim().toLowerCase() === "pipeline") ?? null;
  return {
    sellingAgency: buildColorLookup(
      agencies.map((row) => ({ label: row.label, slug: row.slug, color: row.color })),
    ),
    pipeline: buildColorLookup(
      (pipelineList?.options ?? []).map((option) => ({
        value: option.value,
        label: option.value,
        color: option.color,
      })),
    ),
  };
}

function isPipelineField(field: CustomFieldDef | undefined): boolean {
  return Boolean(field && /^pipeline$/i.test(field.label.trim()));
}

function isSellingAgencyField(field: CustomFieldDef | undefined): boolean {
  return Boolean(field && /^selling agency$/i.test(field.label.trim()));
}

/**
 * Color for a deals-list picklist cell: field.optionColors (fuzzy), then
 * Pipeline / Selling Agency dedicated maps from Global lists / desk picklists.
 */
export function resolveDealListCellColor(
  raw: string | null | undefined,
  field: CustomFieldDef | undefined,
  maps?: DealListColorMaps | null,
): StatusColorKey | null {
  if (!raw?.trim()) return null;
  const fromField = lookupListColor(raw, field?.optionColors);
  if (fromField) return fromField;
  if (!maps) return null;
  if (isSellingAgencyField(field)) return lookupListColor(raw, maps.sellingAgency);
  if (isPipelineField(field)) return lookupListColor(raw, maps.pipeline);
  // Fallback: try both maps when label matching failed but values look familiar.
  return lookupListColor(raw, maps.sellingAgency, maps.pipeline);
}
