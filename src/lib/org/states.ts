export const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export type UsStateCode = (typeof US_STATE_CODES)[number];

export const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (America/New_York)" },
  { value: "America/Chicago", label: "Central (America/Chicago)" },
  { value: "America/Denver", label: "Mountain (America/Denver)" },
  { value: "America/Phoenix", label: "Arizona (America/Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (America/Los_Angeles)" },
  { value: "America/Anchorage", label: "Alaska (America/Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Pacific/Honolulu)" },
] as const;

const STATE_SET = new Set<string>(US_STATE_CODES);

export function normalizeStateCodes(values: string[]): string[] {
  const next = new Set<string>();
  for (const raw of values) {
    const code = raw.trim().toUpperCase();
    if (STATE_SET.has(code)) next.add(code);
  }
  return [...next].sort();
}

export function parseStateList(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return normalizeStateCodes(raw);
  if (!raw) return [];
  return normalizeStateCodes(raw.split(/[\s,]+/));
}

export function parseCountyList(raw: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(raw)
    ? raw
    : (raw ?? "")
        .split(/[,;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(part);
  }
  return next;
}

export function formatStateList(states: string[] | null | undefined): string {
  return states?.length ? states.join(", ") : "—";
}
