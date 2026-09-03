import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { normalizeRole, type DeskRole } from "@/lib/home/scope";

export const SESSION_COOKIES = {
  role: "ff_role",
  actor: "ff_actor",
  actorId: "ff_actor_id",
  name: "ff_actor_name",
} as const;

export type DeskSession = {
  user: User | null;
  role: DeskRole;
  userId: string | null;
  name: string;
  isAdmin: boolean;
  isAgent: boolean;
};

const DEMO_PASSWORDS: Record<string, string> = {
  "javy@fitfirst.local": "javy",
  "maya@fitfirst.local": "maya",
};

export function demoPasswordFor(email: string): string | null {
  return DEMO_PASSWORDS[email.trim().toLowerCase()] ?? null;
}

export function checkDemoPassword(email: string, password: string): boolean {
  const expected = demoPasswordFor(email);
  if (!expected) return false;
  return password === expected;
}

export async function currentDeskSession(): Promise<DeskSession> {
  try {
    const jar = await cookies();
    const userId = jar.get(SESSION_COOKIES.actorId)?.value ?? null;
    const roleCookie = jar.get(SESSION_COOKIES.role)?.value ?? jar.get(SESSION_COOKIES.actor)?.value;
    if (userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, userId), eq(users.active, true)));
      if (user) {
        const role = normalizeRole(user.role);
        return {
          user,
          role,
          userId: user.id,
          name: user.name,
          isAdmin: role === "admin" || role === "owner",
          isAgent: role === "agent",
        };
      }
    }
    const role = normalizeRole(roleCookie ?? "owner");
    return {
      user: null,
      role,
      userId: role === "agent" ? AGENT_USER_ID : role === "admin" ? ADMIN_USER_ID : null,
      name: role === "agent" ? "Maya Chen" : "Javy Rivera",
      isAdmin: role !== "agent",
      isAgent: role === "agent",
    };
  } catch {
    return {
      user: null,
      role: "owner",
      userId: null,
      name: "Javy Rivera",
      isAdmin: true,
      isAgent: false,
    };
  }
}

export function scopeOwnerId(session: DeskSession): string | null {
  return session.isAgent ? session.userId : null;
}
