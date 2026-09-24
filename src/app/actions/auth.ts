"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findUserByLogin,
  passwordMatchesUser,
  SESSION_COOKIES,
} from "@/lib/auth/session";
import { sessionCookieOptions } from "@/lib/auth/cookies";
import { sessionExpiryEpoch, sessionSecretFromEnv, signSessionToken } from "@/lib/auth/signed-session";
import { isMfaMethod, userSkipsMfaChallenge, type MfaStatus } from "@/lib/auth/mfa";
import { isDeskLoginAllowed } from "@/lib/people/status";
import { DESK_ROLE_COOKIE } from "@/lib/brand/desk-role";
import { DESK_AGENT_COOKIE } from "@/lib/crm/desk-agent";
import { normalizeRole } from "@/lib/home/scope";
import { issueStubChallenge } from "@/lib/auth/store";
import type { User } from "@/lib/db/schema";

function seal(user: User, mfaStatus: MfaStatus, impersonatorId = "") {
  const secret = sessionSecretFromEnv();
  if (!secret) return null;
  const role = normalizeRole(user.role);
  return signSessionToken(
    {
      sub: user.id,
      role,
      mfa: mfaStatus,
      mod: user.canAccessModules === false ? "0" : "1",
      name: user.name,
      imp: impersonatorId,
      exp: sessionExpiryEpoch(),
    },
    secret,
  );
}

export async function establishSession(user: User, mfaStatus: MfaStatus) {
  const token = seal(user, mfaStatus);
  if (!token) redirect("/login?error=session");
  const role = normalizeRole(user.role);
  const opts = sessionCookieOptions();
  const jar = await cookies();
  jar.set(SESSION_COOKIES.session, token, opts);
  jar.set(SESSION_COOKIES.role, role, opts);
  jar.set(SESSION_COOKIES.actor, role, opts);
  jar.set(SESSION_COOKIES.actorId, user.id, opts);
  jar.set(SESSION_COOKIES.name, user.name, opts);
  jar.set(SESSION_COOKIES.mfa, mfaStatus, opts);
  jar.set(SESSION_COOKIES.modules, user.canAccessModules === false ? "0" : "1", opts);
  jar.set(DESK_ROLE_COOKIE, role === "admin" || role === "owner" ? "admin" : "agent", opts);
  jar.set(DESK_AGENT_COOKIE, user.id, opts);
  jar.delete(SESSION_COOKIES.impersonatorId);
  if (mfaStatus === "ok") jar.delete(SESSION_COOKIES.mfaPending);
}

export async function setMfaCookie(status: MfaStatus) {
  const jar = await cookies();
  const { verifySessionToken } = await import("@/lib/auth/signed-session");
  const current = verifySessionToken(jar.get(SESSION_COOKIES.session)?.value);
  if (!current) redirect("/login?error=session");
  const secret = sessionSecretFromEnv();
  if (!secret) redirect("/login?error=session");
  const token = signSessionToken({ ...current, mfa: status }, secret);
  if (!token) redirect("/login?error=session");
  const opts = sessionCookieOptions();
  jar.set(SESSION_COOKIES.session, token, opts);
  jar.set(SESSION_COOKIES.mfa, status, opts);
}

async function signInUser(user: User) {
  if (!isDeskLoginAllowed(user.accessStatus)) {
    redirect(user.accessStatus === "removed" ? "/login?error=removed" : "/login?error=frozen");
  }
  if (user.mustSetPassword && !user.passwordHash) {
    redirect("/login?error=invite");
  }
  if (userSkipsMfaChallenge(user)) {
    await establishSession(user, "ok");
    redirect("/");
  }
  if (user.mfaEnrolled && !user.mustEnrollMfa) {
    await establishSession(user, "challenge");
    if (user.mfaMethod === "sms" || user.mfaMethod === "email") {
      const destination =
        user.mfaMethod === "sms" ? (user.mfaPhone ?? user.email) : (user.mfaEmail ?? user.email);
      await issueStubChallenge({
        userId: user.id,
        method: user.mfaMethod,
        destination,
        purpose: "verify",
      });
    }
    redirect("/login/mfa");
  }
  await establishSession(user, "pending");
  redirect("/enroll-mfa");
}

async function signInByLogin(login: string, password: string) {
  if (!password.trim()) redirect("/login?error=1");
  const user = await findUserByLogin(login);
  if (!user || !passwordMatchesUser(user, password)) {
    redirect("/login?error=1");
  }
  await signInUser(user);
}

export async function loginDesk(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const login = String(formData.get("email") ?? formData.get("username") ?? "").trim();
  await signInByLogin(login, password);
}

export async function logoutDesk() {
  const jar = await cookies();
  for (const key of Object.values(SESSION_COOKIES)) {
    jar.delete(key);
  }
  jar.delete(DESK_ROLE_COOKIE);
  jar.delete(DESK_AGENT_COOKIE);
  redirect("/login");
}

export async function verifyLoginMfa(formData: FormData) {
  const { consumeStubChallenge, loadUserById } = await import("@/lib/auth/store");
  const { verifyTotp } = await import("@/lib/auth/totp");
  const { currentDeskSession } = await import("@/lib/auth/session");
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId || !session.user) redirect("/login");
  const code = String(formData.get("code") ?? "").trim();
  const user = await loadUserById(session.userId);
  if (!user?.mfaEnrolled) redirect("/enroll-mfa");
  const method = isMfaMethod(user.mfaMethod) ? user.mfaMethod : null;
  const secret = user.mfaSecret ?? user.totpSecret;
  if (method === "totp") {
    if (!secret || !verifyTotp(secret, code)) {
      redirect("/login/mfa?error=1");
    }
  } else if (method === "sms" || method === "email") {
    const ok = await consumeStubChallenge(user.id, code, "verify");
    if (!ok) redirect("/login/mfa?error=1");
  } else {
    redirect("/login/mfa?error=1");
  }
  await setMfaCookie("ok");
  redirect("/");
}
