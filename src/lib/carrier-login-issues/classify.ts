import {
  isLoginErrorCategory,
  type LoginErrorCategory,
} from "@/lib/carrier-login-issues/types";

function norm(value: string): string {
  return value.replace(/[’‘]/g, "'").toLowerCase();
}

/**
 * Login/auth only. Returns null for UW declines, missing sheet questions,
 * portal-closed product gaps, and the empty portal adapter ("no login wired").
 */
export function classifyCarrierLoginFailure(
  message: string | null | undefined,
  result?: string | null,
): LoginErrorCategory | null {
  const text = norm(`${message ?? ""}`);
  const fromText = classifyLoginText(text);
  if (fromText) return fromText;
  const hint = norm(result ?? "").trim();
  if (hint === "login_failed" || hint === "login_fail" || hint === "login_error") {
    return "cannot_authenticate";
  }
  if (isLoginErrorCategory(hint)) return hint;
  return null;
}

function classifyLoginText(text: string): LoginErrorCategory | null {
  if (!text.trim()) return null;
  // Auth that already succeeded is not this list (CloudFront after login, MFA cleared, etc.).
  if (/login succeeded|mfa cleared|mfa used|password already matched/.test(text)) return null;

  if (/captcha|recaptcha|hcaptcha|verify you are human|i am not a robot/.test(text)) {
    return "captcha";
  }
  if (/mfa loop|2fa loop|totp loop|authentication loop/.test(text)) return "mfa_loop";
  if (/password expired|password must be changed|requires new password/.test(text)) {
    return "password_expired";
  }
  if (
    /account locked|locked out|agent lock|working with a geico agent|username (is )?locked/.test(
      text,
    )
  ) {
    return "account_locked";
  }
  if (
    /session expired|session failed|logged-out|logged out|login expired|sign-in again|reverted to .* login/.test(
      text,
    )
  ) {
    return "session_expired";
  }
  if (/credentials rejected|invalid credentials|invalid password|bad password|login returns blank/.test(text)) {
    // "no credentials typed" is an autofill miss, not a rejected password.
    if (!/no credentials typed/.test(text)) return "credentials_rejected";
  }
  if (
    /no items to autofill|autofill no items|no autofill item|did not (fill|populate)|autofill failed|autofill did not|no credentials typed|login failed after\b.*autofill|after one nordpass autofill/.test(
      text,
    )
  ) {
    return "autofill_failed";
  }
  if (
    /no nordpass|password still not|missing credentials|no portal username|no portal password|account not in \w+ tenant|no [\w/-]+ credentials/.test(
      text,
    )
  ) {
    return "missing_credentials";
  }
  if (
    /\b2fa\b|\btotp\b|two-factor|multi-factor|\bmfa\b/.test(text) &&
    /required|fail|prompt|wait|blocked|did not match|denied|loop/.test(text)
  ) {
    return "mfa_2fa";
  }
  if (
    /cannot authenticate|can't authenticate|could not (log|sign) in|login failed|error login|authentication failed|auth failed/.test(
      text,
    )
  ) {
    return "cannot_authenticate";
  }
  return null;
}
