/**
 * Carrier portal LOGIN failures for quote-pulling bots.
 * Not missing Risk Profile questions, not UW declines, not a successful login
 * that later died on a rating page.
 *
 * Canonical event log: data/carrier-login-issues.ndjson
 * See data/carrier-login-issues.md.
 */

export const LOGIN_ERROR_CATEGORIES = [
  "cannot_authenticate",
  "captcha",
  "mfa_2fa",
  "mfa_loop",
  "account_locked",
  "session_expired",
  "password_expired",
  "credentials_rejected",
  "autofill_failed",
  "missing_credentials",
] as const;

export type LoginErrorCategory = (typeof LOGIN_ERROR_CATEGORIES)[number];

/** Repeat of the same carrier + error category inside this window is recurring. */
export const RECURRING_WINDOW_DAYS = 14;
export const RECURRING_WINDOW_MS = RECURRING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * TODO: production markets must not skip carriers for login issues.
 * Set FF_BLOCK_CARRIER_LOGIN_ISSUES=1 only when routing should consult the list.
 * Default is off — unset, empty, or any other value.
 */
export const CARRIER_LOGIN_BLOCK_FLAG = "FF_BLOCK_CARRIER_LOGIN_ISSUES";

export const CARRIER_LOGIN_ISSUES_RELATIVE_PATH = "data/carrier-login-issues.ndjson";
export const CARRIER_LOGIN_ISSUES_DOC_PATH = "data/carrier-login-issues.md";

export type CarrierLoginEvent = {
  id: string;
  carrier_name: string;
  /** Stable carriers.id when the desk has one. Null when the note never named an id. */
  carrier_id: string | null;
  lob: string | null;
  /** Exact login error text from the bot or portal. */
  error_message: string;
  error_category: LoginErrorCategory;
  /** ISO-8601 timestamp. */
  occurred_at: string;
  source: string | null;
  deal_id: string | null;
};

export type CarrierLoginRollup = {
  carrier_name: string;
  carrier_id: string | null;
  error_category: LoginErrorCategory;
  /** Exact message from the latest event in the group. */
  error_message: string;
  count: number;
  first_seen: string;
  last_seen: string;
  /** True when count > 1, or two events of this carrier + category fall inside the window. */
  recurring: boolean;
  lob: string | null;
};

export function isLoginErrorCategory(value: string | null | undefined): value is LoginErrorCategory {
  return LOGIN_ERROR_CATEGORIES.includes(value as LoginErrorCategory);
}
