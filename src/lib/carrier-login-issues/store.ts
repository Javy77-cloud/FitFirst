import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { classifyCarrierLoginFailure } from "@/lib/carrier-login-issues/classify";
import {
  CARRIER_LOGIN_BLOCK_FLAG,
  CARRIER_LOGIN_ISSUES_RELATIVE_PATH,
  isLoginErrorCategory,
  RECURRING_WINDOW_MS,
  type CarrierLoginEvent,
  type CarrierLoginRollup,
  type LoginErrorCategory,
} from "@/lib/carrier-login-issues/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function carrierLoginIssuesFile(cwd = process.cwd()): string {
  const override = process.env.CARRIER_LOGIN_ISSUES_FILE?.trim();
  if (override) return override;
  return path.join(cwd, CARRIER_LOGIN_ISSUES_RELATIVE_PATH);
}

export function carrierLoginBlockEnabled(env?: Record<string, string | undefined>): boolean {
  const source = env ?? (process.env as Record<string, string | undefined>);
  return source[CARRIER_LOGIN_BLOCK_FLAG] === "1";
}

function asUuid(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return UUID_RE.test(trimmed) ? trimmed : null;
}

export function carrierLoginGroupKey(input: {
  carrier_id?: string | null;
  carrier_name: string;
  error_category: string;
}): string {
  const id = asUuid(input.carrier_id);
  const carrier = id ? `id:${id.toLowerCase()}` : `name:${input.carrier_name.trim().toLowerCase().replace(/\s+/g, " ")}`;
  return `${carrier}::${input.error_category}`;
}

export type NewCarrierLoginIssue = {
  carrierName: string;
  carrierId?: string | null;
  errorMessage: string;
  errorCategory?: string | null;
  /** Quote result / portal status hint (login_failed, login_fail). */
  result?: string | null;
  occurredAt?: string | Date | null;
  lob?: string | null;
  source?: string | null;
  dealId?: string | null;
  id?: string | null;
};

export function buildCarrierLoginEvent(input: NewCarrierLoginIssue): CarrierLoginEvent | null {
  const errorMessage = input.errorMessage.trim();
  if (!errorMessage) return null;
  const carrierName = input.carrierName.trim();
  if (!carrierName) return null;
  const classified = classifyCarrierLoginFailure(errorMessage, input.result);
  const explicit = input.errorCategory?.trim() || null;
  // Bots may pass a known category when the vendor copy is new. Otherwise the
  // message itself has to classify as a login failure (UW / missing-question
  // text returns null and is not stored).
  const category: LoginErrorCategory | null =
    explicit && isLoginErrorCategory(explicit) ? explicit : classified;
  if (!category) return null;

  const occurred = input.occurredAt instanceof Date ? input.occurredAt.toISOString() : input.occurredAt?.trim();
  const occurredAt = occurred && !Number.isNaN(Date.parse(occurred)) ? new Date(occurred).toISOString() : new Date().toISOString();

  return {
    id: asUuid(input.id) ?? randomUUID(),
    carrier_name: carrierName,
    carrier_id: asUuid(input.carrierId),
    lob: input.lob?.trim() || null,
    error_message: errorMessage,
    error_category: category,
    occurred_at: occurredAt,
    source: input.source?.trim() || null,
    deal_id: asUuid(input.dealId),
  };
}

export function readCarrierLoginEvents(file = carrierLoginIssuesFile()): CarrierLoginEvent[] {
  let raw = "";
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const events: CarrierLoginEvent[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    try {
      const parsed = JSON.parse(trimmed) as CarrierLoginEvent;
      if (!parsed?.id || !parsed.carrier_name || !parsed.error_message || !parsed.occurred_at) continue;
      if (!isLoginErrorCategory(parsed.error_category)) continue;
      events.push(parsed);
    } catch {
      // Skip a torn line rather than hiding the rest of the list.
    }
  }
  return events;
}

export function appendCarrierLoginEvent(event: CarrierLoginEvent, file = carrierLoginIssuesFile()): void {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(event)}\n`, "utf8");
}

function groupIsRecurring(times: number[]): boolean {
  // Lifetime repeat (count > 1) or any pair of the same carrier + error class
  // inside RECURRING_WINDOW_MS. A single event is not recurring.
  const sorted = [...times].filter((time) => !Number.isNaN(time)).sort((a, b) => a - b);
  let withinWindow = false;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]! - sorted[i - 1]! <= RECURRING_WINDOW_MS) withinWindow = true;
  }
  return sorted.length > 1 || withinWindow;
}

export function rollupCarrierLoginIssues(events: readonly CarrierLoginEvent[]): CarrierLoginRollup[] {
  const groups = new Map<string, CarrierLoginEvent[]>();
  for (const event of events) {
    const key = carrierLoginGroupKey(event);
    const list = groups.get(key);
    if (list) list.push(event);
    else groups.set(key, [event]);
  }
  const rows: CarrierLoginRollup[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort(
      (a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at),
    );
    const latest = ordered[ordered.length - 1]!;
    const first = ordered[0]!;
    rows.push({
      carrier_name: latest.carrier_name,
      carrier_id: latest.carrier_id,
      error_category: latest.error_category,
      error_message: latest.error_message,
      count: ordered.length,
      first_seen: first.occurred_at,
      last_seen: latest.occurred_at,
      recurring: groupIsRecurring(ordered.map((event) => Date.parse(event.occurred_at))),
      lob: latest.lob,
    });
  }
  rows.sort((a, b) => {
    if (a.recurring !== b.recurring) return a.recurring ? -1 : 1;
    return Date.parse(b.last_seen) - Date.parse(a.last_seen);
  });
  return rows;
}

/**
 * Soft skip helper. Default OFF.
 * TODO: do not turn FF_BLOCK_CARRIER_LOGIN_ISSUES on in production markets
 * until someone explicitly wants routing to leave these carriers.
 * When the flag is on, only a recurring login issue (count > 1, or a repeat
 * inside the window) blocks. A one-off failure does not.
 */
export function isCarrierLoginBlocked(
  carrier: { id?: string | null; name?: string | null },
  issues: readonly CarrierLoginRollup[] = [],
  env?: Record<string, string | undefined>,
): boolean {
  if (!carrierLoginBlockEnabled(env)) return false;
  const name = carrier.name?.trim() || "";
  const id = asUuid(carrier.id);
  if (!id && !name) return false;
  return issues.some((row) => {
    if (!row.recurring) return false;
    if (id && row.carrier_id && row.carrier_id.toLowerCase() === id.toLowerCase()) return true;
    if (!id && name && row.carrier_name.trim().toLowerCase() === name.toLowerCase()) return true;
    if (id && !row.carrier_id && name && row.carrier_name.trim().toLowerCase() === name.toLowerCase()) {
      return true;
    }
    return false;
  });
}
