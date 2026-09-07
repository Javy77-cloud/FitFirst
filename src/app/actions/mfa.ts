"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { establishSession, setMfaCookie } from "@/app/actions/auth";
import { isMfaMethod, userSkipsMfaChallenge } from "@/lib/auth/mfa";
import { hashPassword } from "@/lib/auth/password";
import { generateTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { requireSignedInAllowMfaSetup } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { consumeStubChallenge, issueStubChallenge } from "@/lib/auth/store";
import { flashAction } from "@/lib/flash-action";

export async function startMfaPending(user: User) {
  if (userSkipsMfaChallenge(user)) {
    await establishSession(user, "ok");
    return;
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
    return;
  }
  await establishSession(user, "pending");
}

function backTo(formData: FormData, fallback: string, extra = "") {
  const raw = String(formData.get("next") ?? "").trim();
  const base = raw.startsWith("/enroll-mfa") || raw.startsWith("/settings/") ? raw.split("?")[0]! : fallback;
  return extra ? `${base}?${extra}` : base;
}

export async function startSmsEnroll(formData: FormData) {
  const session = await requireSignedInAllowMfaSetup();
  if (!session.userId) redirect("/login");
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) redirect(backTo(formData, "/enroll-mfa", "error=phone"));
  await db
    .update(users)
    .set({
      mfaMethod: "sms",
      mfaPhone: phone,
      mfaEnrolled: false,
      mustEnrollMfa: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.userId));
  await issueStubChallenge({
    userId: session.userId,
    method: "sms",
    destination: phone,
    purpose: "enroll",
  });
  redirect(backTo(formData, "/enroll-mfa", "method=sms"));
}

export async function startEmailEnroll(formData: FormData) {
  const session = await requireSignedInAllowMfaSetup();
  if (!session.userId) redirect("/login");
  const email = String(formData.get("mfaEmail") ?? session.email ?? "").trim().toLowerCase();
  if (!email) redirect(backTo(formData, "/enroll-mfa", "error=email"));
  await db
    .update(users)
    .set({
      mfaMethod: "email",
      mfaEmail: email,
      mfaEnrolled: false,
      mustEnrollMfa: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.userId));
  await issueStubChallenge({
    userId: session.userId,
    method: "email",
    destination: email,
    purpose: "enroll",
  });
  redirect(backTo(formData, "/enroll-mfa", "method=email"));
}

export async function startTotpEnroll(formData: FormData) {
  const session = await requireSignedInAllowMfaSetup();
  if (!session.userId) redirect("/login");
  const secret = generateTotpSecret();
  await db
    .update(users)
    .set({
      mfaMethod: "totp",
      mfaSecret: secret,
      totpSecret: secret,
      mfaEnrolled: false,
      mustEnrollMfa: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.userId));
  redirect(backTo(formData, "/enroll-mfa", "method=totp"));
}

export async function confirmMfaEnroll(formData: FormData) {
  const session = await requireSignedInAllowMfaSetup();
  if (!session.userId || !session.user) redirect("/login");
  const code = String(formData.get("code") ?? "").trim();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) redirect("/login");
  const method = isMfaMethod(user.mfaMethod) ? user.mfaMethod : null;
  const secret = user.mfaSecret ?? user.totpSecret;
  if (method === "totp") {
    if (!secret || !verifyTotp(secret, code)) {
      redirect(backTo(formData, "/enroll-mfa", "method=totp&error=code"));
    }
  } else if (method === "sms" || method === "email") {
    const ok = await consumeStubChallenge(user.id, code, "enroll");
    if (!ok) redirect(backTo(formData, "/enroll-mfa", `method=${method}&error=code`));
  } else {
    redirect(backTo(formData, "/enroll-mfa", "error=method"));
  }
  await db
    .update(users)
    .set({
      mfaEnrolled: true,
      mustEnrollMfa: false,
      mfaDemoBypass: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await setMfaCookie("ok");
  redirect("/");
}

export async function changeOwnPassword(formData: FormData) {
  const session = await requireSignedInAllowMfaSetup();
  if (!session.userId || !session.user) redirect("/login");
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (next.length < 4 || next !== confirm) {
    redirect("/settings/security?error=password");
  }
  const { passwordMatchesUser } = await import("@/lib/auth/session");
  if (!passwordMatchesUser(session.user, current)) {
    redirect("/settings/security?error=current");
  }
  await db
    .update(users)
    .set({ passwordHash: hashPassword(next), mustSetPassword: false, updatedAt: new Date() })
    .where(eq(users.id, session.userId));
  flashAction("/settings/security", "password-saved");
}

export async function saveOwnProfile(formData: FormData) {
  const session = await requireSignedInAllowMfaSetup();
  if (!session.userId) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const meetingAddress = String(formData.get("meetingAddress") ?? "").trim();
  if (!name) redirect("/settings/profile?error=name");
  await db
    .update(users)
    .set({ name, meetingAddress: meetingAddress || null, updatedAt: new Date() })
    .where(eq(users.id, session.userId));
  flashAction("/settings/profile", "profile-saved");
}
