"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkDemoPassword, SESSION_COOKIES } from "@/lib/auth/session";
import { normalizeRole } from "@/lib/home/scope";

export async function loginDesk(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.email, email), eq(users.active, true)));
  if (!user || !checkDemoPassword(email, password)) {
    redirect("/login?error=1");
  }
  const role = normalizeRole(user.role);
  const jar = await cookies();
  const opts = { path: "/", httpOnly: false, sameSite: "lax" as const };
  jar.set(SESSION_COOKIES.role, role, opts);
  jar.set(SESSION_COOKIES.actor, role, opts);
  jar.set(SESSION_COOKIES.actorId, user.id, opts);
  jar.set(SESSION_COOKIES.name, user.name, opts);
  redirect("/");
}

export async function logoutDesk() {
  const jar = await cookies();
  for (const key of Object.values(SESSION_COOKIES)) {
    jar.delete(key);
  }
  redirect("/login");
}
