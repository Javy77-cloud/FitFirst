"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { SESSION_COOKIE_OPTS, SESSION_COOKIES, pendingMfaUser } from "@/lib/auth/session";
import { DESK_ROLE_COOKIE } from "@/lib/brand/desk-role";
import { DESK_AGENT_COOKIE } from "@/lib/crm/desk-agent";
import { normalizeRole } from "@/lib/home/scope";
import { needsMfaEnroll, normalizeMfaMethod, type MfaMethod } from "@/lib/auth/mfa";
import { generateTotpSecret, newStubCode, verifyTotp } from "@/lib/auth/totp";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { mfaChallenges, users, type User } from "@/lib/db/schema";
import { isDeskLoginAllowed } from "@/lib/people/status";

async function establishSession(user: User) {
  const role = normalizeRole(user.role);
  const jar = await cookies();
  jar.set(SESSION_COOKIES.role, role, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.actor, role, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.actorId, user.id, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.name, user.name, SESSION_COOKIE_OPTS);
  jar.set(DESK_ROLE_COOKIE, role === "agent" ? "agent" : "admin", SESSION_COOKIE_OPTS);
  jar.set(DESK_AGENT_COOKIE, user.id, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.modules, user.canAccessModules === false ? "0" : "1", SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.mfa, "1", SESSION_COOKIE_OPTS);
  jar.delete(SESSION_COOKIES.mfaPending);
}

export async function startMfaPending(user: User) {
  const jar = await cookies();
  jar.set(SESSION_COOKIES.mfaPending, user.id, SESSION_COOKIE_OPTS);
  jar.delete(SESSION_COOKIES.mfa);
  jar.delete(SESSION_COOKIES.actorId);
}

function gate(user: User | null): User {
  if (!user) redirect("/login?error=mfa");
  if (!isDeskLoginAllowed(user.accessStatus)) {
    redirect(user.accessStatus === "removed" ? "/login?error=removed" : "/login?error=frozen");
  }
  return user;
}

async function latestOpenChallenge(userId: string, channel: MfaMethod) {
  const [row] = await db
    .select()
    .from(mfaChallenges)
    .where(
      and(
        eq(mfaChallenges.tenantId, DEFAULT_TENANT_ID),
        eq(mfaChallenges.userId, userId),
        eq(mfaChallenges.channel, channel),
        isNull(mfaChallenges.consumedAt),
      ),
    )
    .orderBy(desc(mfaChallenges.createdAt))
    .limit(1);
  return row ?? null;
}

export async function issueStubMfaCode(user: User, method: "email" | "sms") {
  const destination = method === "sms" ? user.mfaPhone || "321-555-0100" : user.email;
  const code = newStubCode();
  await db.insert(mfaChallenges).values({
    tenantId: DEFAULT_TENANT_ID,
    userId: user.id,
    channel: method,
    destination,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return { destination, code };
}

export async function sendMfaStub(formData: FormData) {
  const user = gate(await pendingMfaUser());
  const method = normalizeMfaMethod(String(formData.get("method") ?? "")) ?? "email";
  if (method === "totp") redirect("/login/mfa?error=method");
  await issueStubMfaCode(user, method);
  redirect(`/login/mfa?sent=${method}${needsMfaEnroll(user) ? "&enroll=1" : ""}`);
}

export async function beginTotpEnroll() {
  const user = gate(await pendingMfaUser());
  const secret = user.totpSecret && needsMfaEnroll(user) && user.mfaMethod === "totp" ? user.totpSecret : generateTotpSecret();
  await db
    .update(users)
    .set({ totpSecret: secret, mfaMethod: "totp", updatedAt: new Date() })
    .where(eq(users.id, user.id));
  redirect("/login/mfa?enroll=1&method=totp");
}

export async function confirmMfa(formData: FormData) {
  const user = gate(await pendingMfaUser());
  const method = normalizeMfaMethod(String(formData.get("method") ?? user.mfaMethod ?? "")) ?? "email";
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const enroll = String(formData.get("enroll") ?? "") === "1" || needsMfaEnroll(user);
  const phone = String(formData.get("mfaPhone") ?? "").trim();

  if (method === "totp") {
    const secret = user.totpSecret;
    if (!secret || !verifyTotp(secret, code)) {
      redirect(`/login/mfa?error=code${enroll ? "&enroll=1&method=totp" : ""}`);
    }
  } else {
    const challenge = await latestOpenChallenge(user.id, method);
    if (!challenge || challenge.code !== code || challenge.expiresAt.getTime() < Date.now()) {
      redirect(`/login/mfa?error=code${enroll ? "&enroll=1" : ""}&method=${method}`);
    }
    await db.update(mfaChallenges).set({ consumedAt: new Date() }).where(eq(mfaChallenges.id, challenge.id));
  }

  const [updated] = await db
    .update(users)
    .set({
      mfaEnrolled: true,
      mustEnrollMfa: false,
      mfaMethod: method,
      mfaPhone: method === "sms" ? phone || user.mfaPhone : user.mfaPhone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  await establishSession(updated ?? user);
  redirect("/");
}
