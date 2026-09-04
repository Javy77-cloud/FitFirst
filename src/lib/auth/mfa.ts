import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { User } from "@/lib/db/schema";

export const MFA_METHODS = ["sms", "email", "totp"] as const;
export type MfaMethod = (typeof MFA_METHODS)[number];

export type MfaStatus = "ok" | "pending" | "challenge";

export const MFA_METHOD_LABEL: Record<MfaMethod, string> = {
  sms: "SMS stub",
  email: "Email stub",
  totp: "Authenticator (TOTP)",
};

export function isMfaMethod(value: string | null | undefined): value is MfaMethod {
  return MFA_METHODS.includes(value as MfaMethod);
}

/** Default on for Mac desk-test. Set FF_MFA_DEMO_BYPASS=0 to force the 2FA prompt. */
export function mfaDemoBypassEnabled(): boolean {
  const flag = process.env.FF_MFA_DEMO_BYPASS;
  if (flag === "0" || flag === "false") return false;
  return true;
}

export function userSkipsMfaChallenge(user: Pick<User, "mfaEnrolled" | "mfaDemoBypass">): boolean {
  return Boolean(user.mfaEnrolled && user.mfaDemoBypass && mfaDemoBypassEnabled());
}

export function resolveMfaStatus(
  user: Pick<User, "mfaEnrolled" | "mfaDemoBypass">,
  cookie: string | undefined,
): MfaStatus {
  if (userSkipsMfaChallenge(user)) return "ok";
  if (!user.mfaEnrolled) return "pending";
  if (cookie === "challenge") return "challenge";
  return "ok";
}

export function newStubCode(): string {
  return String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
}

export function hashOpaque(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function opaqueMatches(value: string, storedHash: string): boolean {
  const actual = Buffer.from(hashOpaque(value));
  const expected = Buffer.from(storedHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function newRecoveryToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("hex");
  return { token, hash: hashOpaque(token) };
}

export function isMfaSetupPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return (
    path === "/enroll-mfa" ||
    path.startsWith("/enroll-mfa/") ||
    path === "/settings/security" ||
    path.startsWith("/settings/security/") ||
    path === "/settings/profile" ||
    path.startsWith("/settings/profile/")
  );
}

export function isMfaChallengePath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return path === "/login/mfa" || path.startsWith("/login/mfa/");
}
