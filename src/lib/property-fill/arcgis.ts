export type ArcgisAttrs = Record<string, unknown>;

type FetchLike = typeof fetch;

export async function queryArcgis(
  url: string,
  params: Record<string, string>,
  fetchImpl: FetchLike = fetch,
): Promise<{ attributes: ArcgisAttrs }[]> {
  return queryArcgisOnce(url, params, fetchImpl, true);
}

async function queryArcgisOnce(
  url: string,
  params: Record<string, string>,
  fetchImpl: FetchLike,
  allowStarRetry: boolean,
): Promise<{ attributes: ArcgisAttrs }[]> {
  const body = new URLSearchParams(params);
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "FitFirst/property-fill",
    },
    body,
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    if (allowStarRetry && params.outFields && params.outFields !== "*") {
      console.warn("[property-fill/arcgis] HTTP", res.status, "— retrying with outFields=*");
      return queryArcgisOnce(url, { ...params, outFields: "*" }, fetchImpl, false);
    }
    return [];
  }
  const payload = (await res.json()) as {
    features?: Array<{ attributes?: ArcgisAttrs }>;
    error?: { code?: number; message?: string } | unknown;
  };
  if (payload.error || !Array.isArray(payload.features)) {
    if (allowStarRetry && params.outFields && params.outFields !== "*") {
      const err =
        payload.error && typeof payload.error === "object"
          ? (payload.error as { code?: number; message?: string })
          : undefined;
      console.warn(
        "[property-fill/arcgis] payload.error",
        err?.code ?? "",
        err?.message ?? "unknown",
        "— retrying with outFields=*",
      );
      return queryArcgisOnce(url, { ...params, outFields: "*" }, fetchImpl, false);
    }
    return [];
  }
  return payload.features
    .map((f) => ({ attributes: f.attributes ?? {} }))
    .filter((f) => Object.keys(f.attributes).length > 0);
}

export function attrString(attrs: ArcgisAttrs, keys: string[]): string {
  for (const key of keys) {
    const raw = attrs[key];
    if (raw == null) continue;
    const value = typeof raw === "number" && Number.isFinite(raw) ? String(raw) : String(raw).trim();
    if (value && value.toLowerCase() !== "null" && value !== "undefined") return value;
  }
  return "";
}

export function ynFlag(raw: string): string {
  const v = raw.trim().toUpperCase();
  if (!v) return "";
  if (["Y", "YES", "TRUE", "1", "T"].includes(v)) return "yes";
  if (["N", "NO", "FALSE", "0", "F"].includes(v)) return "no";
  return raw.trim();
}

export function epochToIsoDate(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1e11) {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return raw;
  }
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
