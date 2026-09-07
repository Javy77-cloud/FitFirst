"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { findOpenRecovery, issueRecoveryLink, loadUserById, markRecoveryUsed } from "@/lib/auth/store";
import { flashAction } from "@/lib/flash-action";

function agentsNotice(kind: string, userId: string, token?: string) {
  const params = new URLSearchParams({ notice: kind, user: userId });
  if (token) params.set("token", token);
  return `/settings/agents?${params.toString()}`;
}

export async function sendPasswordResetLink(formData: FormData) {
  const session = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "");
  const user = await loadUserById(userId);
  if (!user) redirect("/settings/agents?error=missing");
  const { token } = await issueRecoveryLink({
    userId: user.id,
    kind: "password_reset",
    createdBy: session.userId,
  });
  redirect(agentsNotice("password-reset", user.id, token));
}

export async function sendMfaResetLink(formData: FormData) {
  const session = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "");
  const user = await loadUserById(userId);
  if (!user) redirect("/settings/agents?error=missing");
  const { token } = await issueRecoveryLink({
    userId: user.id,
    kind: "mfa_reset",
    createdBy: session.userId,
  });
  redirect(agentsNotice("mfa-reset", user.id, token));
}

export async function forceReenrollMfa(formData: FormData) {
  await requireAdminAction();
  const userId = String(formData.get("userId") ?? "");
  const user = await loadUserById(userId);
  if (!user) redirect("/settings/agents?error=missing");
  await db
    .update(users)
    .set({
      mfaEnrolled: false,
      mustEnrollMfa: true,
      mfaMethod: null,
      totpSecret: null,
      mfaSecret: null,
      mfaPhone: null,
      mfaEmail: null,
      mfaDemoBypass: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  redirect(agentsNotice("reenroll", user.id));
}

export async function completePasswordReset(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!token) redirect("/recover/password?error=token");
  if (next.length < 4 || next !== confirm) redirect(`/recover/password?token=${token}&error=password`);
  const row = await findOpenRecovery(token, "password_reset");
  if (!row) redirect("/recover/password?error=expired");
  await db
    .update(users)
    .set({ passwordHash: hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, row.userId));
  await markRecoveryUsed(row.id);
  flashAction("/login", "password-saved");
}

export async function completeMfaReset(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/recover/mfa?error=token");
  const row = await findOpenRecovery(token, "mfa_reset");
  if (!row) redirect("/recover/mfa?error=expired");
  await db
    .update(users)
    .set({
      mfaEnrolled: false,
      mustEnrollMfa: true,
      mfaMethod: null,
      totpSecret: null,
      mfaSecret: null,
      mfaPhone: null,
      mfaEmail: null,
      mfaDemoBypass: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.userId));
  await markRecoveryUsed(row.id);
  redirect("/login?mfareset=1");
}
