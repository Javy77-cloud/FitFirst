/**
 * One alert per episode: mark-as-read (or any prior row) suppresses re-insert
 * while the condition still holds; ending the episode clears rows so a later
 * trigger can legitimately notify again (same idea as deal_cold_chase #342).
 *
 * Also collapses duplicate rows for the same live key (concurrent writers /
 * dual panel+desk paths) so mark-as-read of one copy cannot leave siblings.
 */

export type EpisodeAlertRow = {
  id: string;
  /** Stable episode key (dealId + kind + product/stage/line, etc.). */
  key: string;
};

export type EpisodeSyncPlan = {
  /** Live keys with no prior alert this episode. */
  insertKeys: string[];
  /** Alert ids whose live condition cleared — drop so a later episode can fire.
   *  Also includes duplicate extras for still-live keys (keep one row). */
  endEpisodeAlertIds: string[];
};

export function planEpisodeSync(
  liveKeys: readonly string[],
  existing: readonly EpisodeAlertRow[],
): EpisodeSyncPlan {
  const byKey = new Map<string, EpisodeAlertRow[]>();
  for (const row of existing) {
    if (!row.key) continue;
    const list = byKey.get(row.key) ?? [];
    list.push(row);
    byKey.set(row.key, list);
  }

  const live = new Set(liveKeys);
  const insertKeys: string[] = [];
  const endEpisodeAlertIds: string[] = [];

  for (const key of liveKeys) {
    const rows = byKey.get(key);
    if (!rows?.length) {
      insertKeys.push(key);
      continue;
    }
    // Concurrent writers can leave N rows for one episode — keep the first,
    // drop the rest so mark-as-read of one copy cannot leave siblings unread.
    for (const extra of rows.slice(1)) endEpisodeAlertIds.push(extra.id);
  }

  for (const [key, rows] of byKey) {
    if (live.has(key)) continue;
    for (const row of rows) endEpisodeAlertIds.push(row.id);
  }

  return { insertKeys, endEpisodeAlertIds };
}

export function episodeMarker(key: string): string {
  return `<!--ff-episode:${key}-->`;
}

export function parseEpisodeKey(body: string | null | undefined): string | null {
  if (!body) return null;
  return body.match(/<!--ff-episode:([^>]+)-->/)?.[1] ?? null;
}

export function withEpisodeKey(plainBody: string, key: string): string {
  return `${episodeMarker(key)}\n\n${plainBody.trim()}`;
}

/** Risk Profile → Markets+Quotes re-run: one ping per deal(+line) while still stale. */
export function sheetInvalidatedEpisodeKey(dealId: string, line?: string | null): string {
  const id = dealId.trim();
  const scoped = (line ?? "").trim() || "*";
  return `sheet_invalidated:${id}:${scoped}`;
}

export function shouldInsertEpisode(
  liveKey: string,
  existing: readonly EpisodeAlertRow[],
): boolean {
  return planEpisodeSync([liveKey], existing).insertKeys.includes(liveKey);
}
