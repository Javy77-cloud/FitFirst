export const MFA_METHODS = ["totp", "email", "sms"] as const;

export type MfaMethod = (typeof MFA_METHODS)[number];

export const MFA_METHOD_LABEL: Record<MfaMethod, string> = {
  totp: "Authenticator app",
  email: "Email code",
  sms: "SMS code",
};

export function normalizeMfaMethod(raw: string | null | undefined): MfaMethod | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "totp" || value === "authenticator" || value === "app") return "totp";
  if (value === "email") return "email";
  if (value === "sms") return "sms";
  return null;
}

export function mfaStatusLabel(input: { mfaEnrolled?: boolean | null; mustEnrollMfa?: boolean | null }): string {
  if (input.mfaEnrolled && !input.mustEnrollMfa) return "Enrolled";
  return "Pending";
}

export function needsMfaEnroll(input: { mfaEnrolled?: boolean | null; mustEnrollMfa?: boolean | null }): boolean {
  return !input.mfaEnrolled || Boolean(input.mustEnrollMfa);
}
