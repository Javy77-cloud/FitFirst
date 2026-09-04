import { and, eq } from "drizzle-orm";
import { ACTOR_COOKIE, SESSION_COOKIES } from "@/lib/auth/cookies";
import { isAdmin, type Actor } from "@/lib/auth/rbac";
import { DEMO_API_TOKEN, generateApiToken, hashToken, parseBearer, readCookie } from "@/lib/auth/token-crypto";
import { isDeskLoginAllowed } from "@/lib/people/status";
import { DEFAULT_TENANT_ID, type UserRole } from "@/lib/domain";
import { ADMIN_NAME, ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { db } from "@/lib/db";
import { apiTokens, users } from "@/lib/db/schema";

export type ApiActor = Actor & { tenantId: string };

export const ADMIN_EMAIL = "javy@fitfirst.local";

export const FALLBACK_ADMIN: ApiActor = {
  id: ADMIN_USER_ID,
  name: ADMIN_NAME,
  email: ADMIN_EMAIL,
  role: "admin",
  tenantId: DEFAULT_TENANT_ID,
};

export function publicActor(actor: ApiActor) {
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role,
    tenant_id: actor.tenantId,
  };
}

function toActor(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
}): ApiActor {
  const role: UserRole = row.role === "agent" ? "agent" : "admin";
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    tenantId: row.tenantId ?? DEFAULT_TENANT_ID,
  };
}

async function loadUser(id: string): Promise<ApiActor | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  if (!user || user.active === false) return null;
  if (!isDeskLoginAllowed(user.accessStatus ?? "active")) return null;
  return toActor({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });
}

async function actorFromBearer(token: string): Promise<ApiActor | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tenantId, DEFAULT_TENANT_ID), eq(apiTokens.tokenHash, tokenHash)));
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  void db
    .update(apiTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiTokens.id, row.id))
    .catch(() => undefined);
  return loadUser(row.userId);
}

export async function resolveApiActor(request: Request): Promise<ApiActor | null> {
  const bearer = parseBearer(request.headers.get("authorization"));
  if (bearer) return actorFromBearer(bearer);

  const cookieHeader = request.headers.get("cookie");
  const cookieId =
    readCookie(cookieHeader, SESSION_COOKIES.actorId) ?? readCookie(cookieHeader, ACTOR_COOKIE);
  if (cookieId && cookieId !== "admin" && cookieId !== "agent") return loadUser(cookieId);
  return null;
}

export async function requireApiActor(request: Request): Promise<ApiActor> {
  const actor = await resolveApiActor(request);
  if (!actor) {
    const err = new Error("unauthorized");
    err.name = "UnauthorizedError";
    throw err;
  }
  return actor;
}

export async function issueApiToken(
  actor: ApiActor,
  label = "issued",
): Promise<{ token: string; actor: ApiActor }> {
  const token = generateApiToken();
  await db.insert(apiTokens).values({
    tenantId: actor.tenantId,
    userId: actor.id,
    tokenHash: hashToken(token),
    label,
    expiresAt: null,
  });
  return { token, actor };
}

export async function issueDemoAdminToken(label = "demo"): Promise<{
  token: string;
  actor: ApiActor;
}> {
  const actor = (await loadUser(ADMIN_USER_ID)) ?? FALLBACK_ADMIN;
  return issueApiToken(actor, label);
}

export function demoTokenPlaintext(): string {
  return DEMO_API_TOKEN;
}

export { isAdmin };
