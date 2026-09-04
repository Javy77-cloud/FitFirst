"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkDemoPassword, DEMO_USERS, SESSION_COOKIE_OPTS, SESSION_COOKIES } from "@/lib/auth/session";
import { DESK_ROLE_COOKIE } from "@/lib/brand/desk-role";
import { DESK_AGENT_COOKIE } from "@/lib/crm/desk-agent";
import { normalizeRole } from "@/lib/home/scope";

async function establishSession(user: typeof users.$inferSelect) {
  const role = normalizeRole(user.role);
  const jar = await cookies();
  jar.set(SESSION_COOKIES.role, role, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.actor, role, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.actorId, user.id, SESSION_COOKIE_OPTS);
  jar.set(SESSION_COOKIES.name, user.name, SESSION_COOKIE_OPTS);
  jar.set(DESK_ROLE_COOKIE, role === "agent" ? "agent" : "admin", SESSION_COOKIE_OPTS);
  jar.set(DESK_AGENT_COOKIE, user.id, SESSION_COOKIE_OPTS);
}

async function signInByEmail(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.email, email), eq(users.active, true)));
  if (!user || !checkDemoPassword(email, password)) {
    redirect("/login?error=1");
  }
  await establishSession(user);
  redirect("/");
}

export async function loginDesk(formData: FormData) {
  const who = String(formData.get("who") ?? "").trim().toLowerCase();
  if (who === "admin" || who === "javy") {
    await signInByEmail(DEMO_USERS.admin.email, DEMO_USERS.admin.password);
  }
  if (who === "agent" || who === "maya") {
    await signInByEmail(DEMO_USERS.agent.email, DEMO_USERS.agent.password);
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  await signInByEmail(email, password);
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
