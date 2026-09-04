import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { alerts, deals, deskAgents, deskMessages, leads, policies, users, type User } from "@/lib/db/schema";
import { accessStatusFromFlags, type AccessStatus } from "./status";

const tenant = () => DEFAULT_TENANT_ID;

export type PeopleRow = User & { status: AccessStatus };

export async function listPeople(): Promise<PeopleRow[]> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.tenantId, tenant()))
    .orderBy(asc(users.name));
  return rows.map((row) => ({ ...row, status: accessStatusFromFlags(row) }));
}

export async function getPerson(id: string): Promise<PeopleRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant()), eq(users.id, id)));
  if (!row) return null;
  return { ...row, status: accessStatusFromFlags(row) };
}

export async function findPersonByToken(
  kind: "invite" | "reset" | "recovery",
  token: string,
): Promise<User | null> {
  const value = token.trim();
  if (!value) return null;
  const column =
    kind === "invite" ? users.inviteToken : kind === "reset" ? users.resetToken : users.recoveryToken;
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant()), eq(column, value)));
  return row ?? null;
}

export async function findPersonByLogin(login: string): Promise<User | null> {
  const key = login.trim().toLowerCase();
  if (!key) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant()), or(eq(users.email, key), eq(users.username, key))));
  return row ?? null;
}

export async function listMessagesFor(userId: string) {
  return db
    .select()
    .from(deskMessages)
    .where(and(eq(deskMessages.tenantId, tenant()), eq(deskMessages.toUserId, userId)))
    .orderBy(desc(deskMessages.createdAt))
    .limit(20);
}

export async function agentProduction(ownerId: string) {
  const [row] = await db
    .select({
      leads: sql<number>`(select count(*) from leads where tenant_id = ${tenant()} and owner_id = ${ownerId})`,
      deals: sql<number>`(select count(*) from deals where tenant_id = ${tenant()} and owner_id = ${ownerId})`,
      shopping: sql<number>`(select count(*) from deals where tenant_id = ${tenant()} and owner_id = ${ownerId} and pipeline_stage in ('shopping','quoting','quote_sent'))`,
      policies: sql<number>`(select count(*) from policies where tenant_id = ${tenant()} and owner_id = ${ownerId})`,
      inForce: sql<number>`(select count(*) from policies where tenant_id = ${tenant()} and owner_id = ${ownerId} and status in ('active','bound'))`,
      premium: sql<number>`(select coalesce(sum(cast(premium as numeric)), 0) from policies where tenant_id = ${tenant()} and owner_id = ${ownerId} and status in ('active','bound'))`,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenant()), eq(users.id, ownerId)));
  return {
    leads: Number(row?.leads ?? 0),
    deals: Number(row?.deals ?? 0),
    shopping: Number(row?.shopping ?? 0),
    policies: Number(row?.policies ?? 0),
    inForce: Number(row?.inForce ?? 0),
    premium: Number(row?.premium ?? 0),
  };
}

export async function ensureDeskAgentRow(input: {
  id: string;
  slug: string;
  displayName: string;
  role: string;
}) {
  const [existing] = await db.select().from(deskAgents).where(eq(deskAgents.id, input.id));
  if (existing) {
    await db
      .update(deskAgents)
      .set({ displayName: input.displayName, role: input.role, slug: input.slug })
      .where(eq(deskAgents.id, input.id));
    return;
  }
  await db.insert(deskAgents).values({
    id: input.id,
    tenantId: tenant(),
    slug: input.slug,
    displayName: input.displayName,
    role: input.role,
  });
}
