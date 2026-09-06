import { cookies } from "next/headers";
import { and, eq, or } from "drizzle-orm";
import { isAdmin, type Actor } from "@/lib/auth/rbac";
import { capabilitiesFor, type DeskCapabilities } from "@/lib/auth/access";
import { ACTOR_COOKIE, SESSION_COOKIE_OPTS, SESSION_COOKIES } from "@/lib/auth/cookies";
import { resolveMfaStatus, type MfaStatus } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/password";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { normalizeRole, type DeskRole } from "@/lib/home/scope";
import { isDeskLoginAllowed, normalizeAccessStatus } from "@/lib/people/status";
import { normalizeLogin } from "@/lib/people/tokens";

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
  mfaStatus: MfaStatus;
  mfaEnrolled: boolean;
  mfaMethod: string | null;
  mfaDemoBypass: boolean;
  canSwitchRole: boolean;
  impersonatorId: string | null;
  impersonatorName: string | null;
  isImpersonating: boolean;
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

export function passwordMatchesUser(
  user: Pick<User, "email" | "passwordHash">,
  password: string,
): boolean {
  if (!password) return false;
  if (user.passwordHash && verifyPassword(password, user.passwordHash)) return true;
  return checkDemoPassword(user.email, password);
}

export async function findUserByLogin(login: string): Promise<User | null> {
  const key = normalizeLogin(login);
  if (!key) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.tenantId, DEFAULT_TENANT_ID),
        or(eq(users.email, key), eq(users.username, key)),
      ),
    );
  return user ?? null;
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
    mfaStatus: "pending",
    mfaEnrolled: false,
    mfaMethod: null,
    mfaDemoBypass: false,
    canSwitchRole: false,
    impersonatorId: null,
    impersonatorName: null,
    isImpersonating: false,
  };
}

function sessionFromUser(
  user: User,
  mfaCookie?: string,
  impersonator?: { id: string; name: string } | null,
): DeskSession {
  const role = normalizeRole(user.role);
  const isAdminRole = role === "admin" || role === "owner";
  const impersonating = Boolean(impersonator && impersonator.id !== user.id);
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
    mfaStatus: resolveMfaStatus(user, mfaCookie),
    mfaEnrolled: Boolean(user.mfaEnrolled),
    mfaMethod: user.mfaMethod,
    mfaDemoBypass: Boolean(user.mfaDemoBypass),
    canSwitchRole: isAdminRole || Boolean(impersonator),
    impersonatorId: impersonator?.id ?? null,
    impersonatorName: impersonator?.name ?? null,
    isImpersonating: impersonating,
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
    if (!isDeskLoginAllowed(user.accessStatus ?? "active")) return guestSession();
    const impersonatorId = jar.get(SESSION_COOKIES.impersonatorId)?.value ?? null;
    let impersonator: { id: string; name: string } | null = null;
    if (impersonatorId && impersonatorId !== user.id) {
      const source = await findUser(impersonatorId);
      const sourceRole = source ? normalizeRole(source.role) : "agent";
      if (source && (sourceRole === "admin" || sourceRole === "owner")) {
        impersonator = { id: source.id, name: source.name };
      }
    }
    return sessionFromUser(user, jar.get(SESSION_COOKIES.mfa)?.value, impersonator);
  } catch {
    return guestSession();
  }
}

export async function pendingMfaUser(): Promise<User | null> {
  try {
    const jar = await cookies();
    const pendingId = jar.get(SESSION_COOKIES.mfaPending)?.value ?? null;
    if (pendingId) return findUser(pendingId);
    const userId = jar.get(SESSION_COOKIES.actorId)?.value ?? null;
    const mfa = jar.get(SESSION_COOKIES.mfa)?.value;
    if (userId && (mfa === "challenge" || mfa === "pending")) return findUser(userId);
    return null;
  } catch {
    return null;
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

export { isAdmin, normalizeAccessStatus };
