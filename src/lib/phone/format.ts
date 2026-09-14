/**
 * FitFirst standard phone display: `1-XXX-XXX-XXXX`.
 * Typing without the leading 1 still formats with `1-` filled in.
 * Matching/normalize still strips to 10 digits elsewhere.
 */

export function phoneDigits(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/** 10-digit US national number, or "" if incomplete. Leading country 1 is dropped. */
export function usNationalDigits(value: string | null | undefined): string {
  const digits = phoneDigits(value);
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  if (digits.length > 11 && digits.startsWith("1")) return digits.slice(1, 11);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Standard desk phone: `1-321-555-0144`.
 * Incomplete input returns digits with best-effort dashes (still prefixed `1-` when possible).
 */
export function formatPhoneStandard(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  let national = usNationalDigits(trimmed);
  if (!national) return trimmed;

  // Incomplete while typing — still lead with 1-
  if (national.length < 10) {
    const a = national.slice(0, 3);
    const b = national.slice(3, 6);
    const c = national.slice(6, 10);
    const body = [a, b, c].filter(Boolean).join("-");
    return body ? `1-${body}` : "1-";
  }

  national = national.slice(0, 10);
  return `1-${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
}

/** Display helper for lists — empty stays em dash. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return "—";
  return formatPhoneStandard(value) || "—";
}
