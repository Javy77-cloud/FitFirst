import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { isAdmin, type Actor } from "@/lib/auth/rbac";
import { capabilitiesFor, type DeskCapabilities } from "@/lib/auth/access";
import { ACTOR_COOKIE, SESSION_COOKIE_OPTS, SESSION_COOKIES } from "@/lib/auth/cookies";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { normalizeRole, type DeskRole } from "@/lib/home/scope";

export { ACTOR_COOKIE, SESSION_COOKIE_OPTS, SESSION_COOKIES };

export async function findUser(id: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  return user ?? null;
}

export type DeskSession = {
  user: User | null;
  role: DeskRole;
  userId: string | null;
  name: string;
  email: string | null;
  isAdmin: boolean;
  isAgent: boolean;
  signedIn: boolean;
  capabilities: DeskCapabilities;
};

const DEMO_PASSWORDS: Record<string, string> = {
  "javy@fitfirst.local": "javy",
  "maya@fitfirst.local": "maya",
};

export const DEMO_USERS = {
  admin: {
    email: "javy@fitfirst.local",
    password: "javy",
    name: "Javy Rivera",
    role: "admin" as const,
    label: "Admin",
    summary: "Whole book. Settings, integrations, global lists, Ask a teammate.",
  },
  agent: {
    email: "maya@fitfirst.local",
    password: "maya",
    name: "Maya Chen",
    role: "agent" as const,
    label: "Agent",
    summary: "Own book. CRM, pipeline, calendar, and client email/SMS when connected.",
  },
} as const;

export function demoPasswordFor(email: string): string | null {
  return DEMO_PASSWORDS[email.trim().toLowerCase()] ?? null;
}

export function checkDemoPassword(email: string, password: string): boolean {
  const expected = demoPasswordFor(email);
  if (!expected) return false;
  return password === expected;
}

function guestSession(): DeskSession {
  return {
    user: null,
    role: "agent",
    userId: null,
    name: "",
    email: null,
    isAdmin: false,
    isAgent: false,
    signedIn: false,
    capabilities: capabilitiesFor("guest"),
  };
}

function sessionFromUser(user: User): DeskSession {
  const role = normalizeRole(user.role);
  const isAdminRole = role === "admin" || role === "owner";
  return {
    user,
    role,
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: isAdminRole,
    isAgent: role === "agent",
    signedIn: true,
    capabilities: capabilitiesFor(isAdminRole ? "admin" : "agent"),
  };
}

export async function currentDeskSession(): Promise<DeskSession> {
  try {
    const jar = await cookies();
    const userId = jar.get(SESSION_COOKIES.actorId)?.value ?? null;
    if (!userId) return guestSession();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, userId), eq(users.active, true)));
    if (!user) return guestSession();
    return sessionFromUser(user);
  } catch {
    return guestSession();
  }
}

export function scopeOwnerId(session: DeskSession): string | null {
  return session.isAdmin ? null : session.userId;
}

export async function getActor(): Promise<Actor> {
  const session = await currentDeskSession();
  if (session.user) {
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role === "agent" ? "agent" : "admin",
    };
  }
  return {
    id: "",
    name: "",
    email: "",
    role: "agent",
  };
}

export { isAdmin };
