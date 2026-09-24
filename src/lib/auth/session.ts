import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, or } from "drizzle-orm";
import { isAdmin, type Actor } from "@/lib/auth/rbac";
import { capabilitiesFor, type DeskCapabilities } from "@/lib/auth/access";
import { ACTOR_COOKIE, SESSION_COOKIE_OPTS, SESSION_COOKIES } from "@/lib/auth/cookies";
import { resolveMfaStatus, type MfaStatus } from "@/lib/auth/mfa";
import { localTestPasswordMatches } from "@/lib/auth/dev-passwords";
import { isFitFirstProduction } from "@/lib/auth/production";
import { verifyPassword } from "@/lib/auth/password";
import { verifySessionToken } from "@/lib/auth/signed-session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { userIsSiteDeveloper } from "@/lib/developer/site-developer";
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
  isDeveloper: boolean;
  isSiteDeveloper: boolean;
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

export function passwordMatchesUser(
  user: Pick<User, "email" | "passwordHash">,
  password: string,
): boolean {
  if (!password) return false;
  if (user.passwordHash && verifyPassword(password, user.passwordHash)) return true;
  if (isFitFirstProduction()) return false;
  return localTestPasswordMatches(user.email, password);
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
    isDeveloper: false,
    isSiteDeveloper: false,
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
  const isSiteDeveloper = userIsSiteDeveloper(user);
  const isDeveloper = role === "developer" || isSiteDeveloper;
  const impersonating = Boolean(impersonator && impersonator.id !== user.id);
  const capRole = role === "developer" ? "developer" : isAdminRole ? "admin" : "agent";
  return {
    user,
    role,
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: isAdminRole,
    isAgent: role === "agent",
    isDeveloper,
    isSiteDeveloper,
    signedIn: true,
    capabilities: capabilitiesFor(capRole, { isDeveloper }),
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

export const currentDeskSession = cache(async function currentDeskSession(): Promise<DeskSession> {
  try {
    const jar = await cookies();
    const claims = verifySessionToken(jar.get(SESSION_COOKIES.session)?.value);
    const userId = claims?.sub ?? null;
    if (!userId) return guestSession();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, userId), eq(users.active, true)));
    if (!user) return guestSession();
    if (!isDeskLoginAllowed(user.accessStatus ?? "active")) return guestSession();
    const impersonatorId = claims?.imp || null;
    let impersonator: { id: string; name: string } | null = null;
    if (impersonatorId && impersonatorId !== user.id) {
      const source = await findUser(impersonatorId);
      const sourceRole = source ? normalizeRole(source.role) : "agent";
      if (source && (sourceRole === "admin" || sourceRole === "owner")) {
        impersonator = { id: source.id, name: source.name };
      }
    }
    return sessionFromUser(user, claims?.mfa, impersonator);
  } catch {
    return guestSession();
  }
});

export async function pendingMfaUser(): Promise<User | null> {
  try {
    const jar = await cookies();
    const claims = verifySessionToken(jar.get(SESSION_COOKIES.session)?.value);
    if (claims && (claims.mfa === "challenge" || claims.mfa === "pending")) return findUser(claims.sub);
    return null;
  } catch {
    return null;
  }
}

export function sessionSeesAgencyBook(session: DeskSession): boolean {
  return session.isAdmin || Boolean(session.user?.canSeeAgencyWidgets);
}

export function scopeOwnerId(session: DeskSession): string | null {
  return sessionSeesAgencyBook(session) ? null : session.userId;
}

export const getActor = cache(async function getActor(): Promise<Actor> {
  const session = await currentDeskSession();
  if (session.user) {
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role === "agent" || session.user.role === "developer" ? "agent" : "admin",
      profile: session.isDeveloper && !session.isAdmin ? "developer" : session.isAdmin ? "admin" : "agent",
      canSeeAgencyBook: Boolean(session.user?.canSeeAgencyWidgets),
    };
  }
  return {
    id: "",
    name: "",
    email: "",
    role: "agent",
  };
});

export { isAdmin, normalizeAccessStatus };
