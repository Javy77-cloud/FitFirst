import { cookies } from "next/headers";
import { and, asc, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { columnLayouts, deskAgents, type DeskAgent } from "@/lib/db/schema";
import { SEEDED_DESK_AGENTS } from "@/lib/fixtures/ids";
import { resolveColumnLayout, type LayoutSource } from "./lists";

export const DESK_AGENT_COOKIE = "ff-desk-agent";
export { SEEDED_DESK_AGENTS };

const tenant = () => DEFAULT_TENANT_ID;

export function deskAgentsToInsert<T extends { id: string; slug: string }>(
  existing: Array<{ id: string; slug: string }>,
  seeds: readonly T[],
): T[] {
  const haveId = new Set(existing.map((row) => row.id));
  const haveSlug = new Set(existing.map((row) => row.slug));
  return seeds.filter((row) => !haveId.has(row.id) && !haveSlug.has(row.slug));
}

export async function listDeskAgents(): Promise<DeskAgent[]> {
  return db
    .select()
    .from(deskAgents)
    .where(eq(deskAgents.tenantId, tenant()))
    .orderBy(asc(deskAgents.displayName));
}

export async function ensureDeskAgents(): Promise<DeskAgent[]> {
  const existing = await listDeskAgents();
  const missing = deskAgentsToInsert(existing, SEEDED_DESK_AGENTS);
  if (missing.length > 0) {
    await db
      .insert(deskAgents)
      .values(
        missing.map((row) => ({
          id: row.id,
          tenantId: tenant(),
          slug: row.slug,
          displayName: row.displayName,
          role: row.role,
        })),
      )
      .onConflictDoNothing();
  }
  return listDeskAgents();
}

export function isAdminAgent(agent: Pick<DeskAgent, "role"> | null | undefined): boolean {
  return agent?.role === "admin";
}

export async function getCurrentAgent(): Promise<DeskAgent> {
  const agents = await ensureDeskAgents();
  try {
    const { currentDeskSession } = await import("@/lib/auth/session");
    const session = await currentDeskSession();
    if (session.userId) {
      const fromSession = agents.find((agent) => agent.id === session.userId);
      if (fromSession) return fromSession;
      if (session.isAdmin) {
        const admin = agents.find((agent) => agent.role === "admin");
        if (admin) return admin;
      }
    }
  } catch {
    // fall through to cookie
  }
  const jar = await cookies();
  const id = jar.get(DESK_AGENT_COOKIE)?.value;
  return (
    agents.find((agent) => agent.id === id) ??
    agents.find((agent) => agent.slug === "javy") ??
    agents[0]!
  );
}

export async function loadColumnLayout(
  tableId: string,
  columns: Array<{ id: string; defaultVisible?: boolean; hideable?: boolean }>,
): Promise<{ ids: string[]; source: LayoutSource; hasAgentOverride: boolean }> {
  const agent = await getCurrentAgent();
  const rows = await db
    .select()
    .from(columnLayouts)
    .where(and(eq(columnLayouts.tenantId, tenant()), eq(columnLayouts.tableId, tableId)));
  const agentRow = rows.find((row) => row.agentId === agent.id);
  const agencyRow = rows.find((row) => row.agentId == null);
  const resolved = resolveColumnLayout(columns, {
    agentIds: agentRow?.columnIds ?? null,
    agencyIds: agencyRow?.columnIds ?? null,
  });
  return { ...resolved, hasAgentOverride: Boolean(agentRow) };
}

export async function upsertColumnLayout(input: {
  tableId: string;
  columnIds: string[];
  agentId: string | null;
}) {
  const where = input.agentId
    ? and(
        eq(columnLayouts.tenantId, tenant()),
        eq(columnLayouts.tableId, input.tableId),
        eq(columnLayouts.agentId, input.agentId),
      )
    : and(
        eq(columnLayouts.tenantId, tenant()),
        eq(columnLayouts.tableId, input.tableId),
        isNull(columnLayouts.agentId),
      );
  const [existing] = await db.select().from(columnLayouts).where(where);
  if (existing) {
    await db
      .update(columnLayouts)
      .set({ columnIds: input.columnIds, updatedAt: new Date() })
      .where(eq(columnLayouts.id, existing.id));
    return;
  }
  await db.insert(columnLayouts).values({
    tenantId: tenant(),
    tableId: input.tableId,
    agentId: input.agentId,
    columnIds: input.columnIds,
  });
}

export async function deleteAgentColumnLayout(tableId: string, agentId: string) {
  await db
    .delete(columnLayouts)
    .where(
      and(
        eq(columnLayouts.tenantId, tenant()),
        eq(columnLayouts.tableId, tableId),
        eq(columnLayouts.agentId, agentId),
      ),
    );
}
