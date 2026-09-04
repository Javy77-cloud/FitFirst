import { and, desc, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { authRecoveryTokens, mfaChallenges, users, type User } from "@/lib/db/schema";
import { hashOpaque, newRecoveryToken, newStubCode, opaqueMatches, type MfaMethod } from "@/lib/auth/mfa";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueStubChallenge(input: {
  userId: string;
  method: Exclude<MfaMethod, "totp">;
  destination: string;
  purpose: "enroll" | "verify";
}) {
  const code = newStubCode();
  const [row] = await db
    .insert(mfaChallenges)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      userId: input.userId,
      method: input.method,
      codeHash: hashOpaque(code),
      stubCode: code,
      destination: input.destination,
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    })
    .returning();
  return row;
}

export async function latestOpenChallenge(userId: string, purpose?: "enroll" | "verify") {
  const filters = [
    eq(mfaChallenges.tenantId, DEFAULT_TENANT_ID),
    eq(mfaChallenges.userId, userId),
    isNull(mfaChallenges.consumedAt),
  ];
  if (purpose) filters.push(eq(mfaChallenges.purpose, purpose));
  const [row] = await db
    .select()
    .from(mfaChallenges)
    .where(and(...filters))
    .orderBy(desc(mfaChallenges.createdAt))
    .limit(1);
  return row ?? null;
}

export async function consumeStubChallenge(
  userId: string,
  code: string,
  purpose: "enroll" | "verify",
) {
  const row = await latestOpenChallenge(userId, purpose);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  if (!opaqueMatches(code.trim(), row.codeHash)) return null;
  await db
    .update(mfaChallenges)
    .set({ consumedAt: new Date(), updatedAt: new Date() })
    .where(eq(mfaChallenges.id, row.id));
  return row;
}

export async function issueRecoveryLink(input: {
  userId: string;
  kind: "password_reset" | "mfa_reset";
  createdBy: string | null;
}) {
  const { token, hash } = newRecoveryToken();
  const [row] = await db
    .insert(authRecoveryTokens)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      userId: input.userId,
      kind: input.kind,
      tokenHash: hash,
      stubToken: token,
      createdBy: input.createdBy,
      expiresAt: new Date(Date.now() + RECOVERY_TTL_MS),
    })
    .returning();
  return { row, token };
}

export async function findOpenRecovery(token: string, kind: "password_reset" | "mfa_reset") {
  const [row] = await db
    .select()
    .from(authRecoveryTokens)
    .where(
      and(
        eq(authRecoveryTokens.tenantId, DEFAULT_TENANT_ID),
        eq(authRecoveryTokens.kind, kind),
        eq(authRecoveryTokens.tokenHash, hashOpaque(token)),
        isNull(authRecoveryTokens.usedAt),
      ),
    )
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function markRecoveryUsed(id: string) {
  await db
    .update(authRecoveryTokens)
    .set({ usedAt: new Date(), stubToken: null, updatedAt: new Date() })
    .where(eq(authRecoveryTokens.id, id));
}

export async function listUsersForRecovery() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      mfaEnrolled: users.mfaEnrolled,
      mfaMethod: users.mfaMethod,
      mfaDemoBypass: users.mfaDemoBypass,
    })
    .from(users)
    .where(eq(users.tenantId, DEFAULT_TENANT_ID))
    .orderBy(users.name);
}

export async function latestUnusedRecoveryByUser() {
  const rows = await db
    .select()
    .from(authRecoveryTokens)
    .where(and(eq(authRecoveryTokens.tenantId, DEFAULT_TENANT_ID), isNull(authRecoveryTokens.usedAt)))
    .orderBy(desc(authRecoveryTokens.createdAt));
  const byUser = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, row);
  }
  return byUser;
}

export async function loadUserById(id: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  return user ?? null;
}

export function recoveryPath(kind: "password_reset" | "mfa_reset", token: string) {
  return kind === "password_reset" ? `/recover/password?token=${token}` : `/recover/mfa?token=${token}`;
}
