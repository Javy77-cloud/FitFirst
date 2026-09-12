const DESK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDeskUuid(value: string | null | undefined): value is string {
  return Boolean(value && DESK_UUID_RE.test(value));
}

const RESERVED_RECORD_SEGMENTS = new Set(["new", "compare", "calculator", "agents", "diary", "holders", "queue", "logs"]);

const RECORD_ID_PATTERNS = [
  /^\/(?:leads|deals|contacts|policies|tasks|claims|accounts|businesses|merge|meetings|carriers|campaigns|files|scorecards)\/([^/]+)/,
  /^\/automations\/(?:functions|webhooks|connections|macros|buttons|client-scripts)\/([^/]+)/,
  /^\/settings\/developer\/(?:functions|webhooks|connections)\/([^/]+)/,
  /^\/settings\/developer-hub\/(?:macros|widgets|custom-buttons|client-scripts)\/([^/]+)/,
  /^\/settings\/email-templates\/([^/]+)/,
  /^\/settings\/agents\/([^/]+)/,
  /^\/commissions\/agents\/([^/]+)/,
];

/** True when a record URL has a non-UUID id that would 500 Postgres (22P02). */
export function isInvalidDeskRecordPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  for (const pattern of RECORD_ID_PATTERNS) {
    const match = path.match(pattern);
    if (!match) continue;
    const id = match[1];
    if (!id || RESERVED_RECORD_SEGMENTS.has(id)) continue;
    if (!isDeskUuid(id)) return true;
  }
  return false;
}
