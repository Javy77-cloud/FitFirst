export function parsePage(searchParams: URLSearchParams): { limit: number; offset: number } {
  const rawLimit = Number(searchParams.get("limit") ?? 100);
  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, Math.trunc(rawLimit))) : 100;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
  return { limit, offset };
}

export function slicePage<T>(rows: T[], limit: number, offset: number) {
  return {
    items: rows.slice(offset, offset + limit),
    count: rows.length,
    limit,
    offset,
  };
}
