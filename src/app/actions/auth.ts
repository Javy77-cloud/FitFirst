"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_OPTS,
  SESSION_COOKIES,
  DEMO_USERS,
  passwordMatchesUser,
  findUserByLogin,
} from "@/lib/auth/session";
import { DESK_ROLE_COOKIE } from "@/lib/brand/desk-role";
import { DESK_AGENT_COOKIE } from "@/lib/crm/desk-agent";
import { needsMfaEnroll } from "@/lib/auth/mfa";
import { isDeskLoginAllowed } from "@/lib/people/status";
import { startMfaPending } from "@/app/actions/mfa";

async function signInByLogin(login: string, password: string) {
  const user = await findUserByLogin(login);
  if (!user) redirect("/login?error=1");
  if (!isDeskLoginAllowed(user.accessStatus)) {
    redirect(user.accessStatus === "removed" ? "/login?error=removed" : "/login?error=frozen");
  }
  if (user.mustSetPassword && !user.passwordHash) {
    redirect("/login?error=invite");
  }
  if (!passwordMatchesUser(user, password)) {
    redirect("/login?error=1");
  }
  await startMfaPending(user);
  redirect(needsMfaEnroll(user) ? "/login/mfa?enroll=1" : "/login/mfa");
}

export async function loginDesk(formData: FormData) {
  const who = String(formData.get("who") ?? "").trim().toLowerCase();
  if (who === "admin" || who === "javy") {
    await signInByLogin(DEMO_USERS.admin.email, DEMO_USERS.admin.password);
  }
  if (who === "agent" || who === "maya") {
    await signInByLogin(DEMO_USERS.agent.email, DEMO_USERS.agent.password);
  }
  const login = String(formData.get("email") ?? formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
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
