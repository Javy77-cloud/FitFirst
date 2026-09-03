import { sql } from "@/lib/db";

const cache = new Map<string, boolean>();

async function hasTable(name: string): Promise<boolean> {
  const hit = cache.get(`t:${name}`);
  if (hit != null) return hit;
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = ${name}
    ) as exists
  `;
  const value = Boolean(rows[0]?.exists);
  cache.set(`t:${name}`, value);
  return value;
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const key = `c:${table}.${column}`;
  const hit = cache.get(key);
  if (hit != null) return hit;
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = ${table} and column_name = ${column}
    ) as exists
  `;
  const value = Boolean(rows[0]?.exists);
  cache.set(key, value);
  return value;
}

export async function detectOwnerHomeTables() {
  const [commissions, opportunities, xDates, workQueue, users] = await Promise.all([
    hasTable("commissions"),
    hasTable("opportunities"),
    hasTable("x_dates"),
    hasTable("work_queue"),
    hasTable("users"),
  ]);
  const [policyOwnerId, policyAssignedTo, dealOwnerId] = await Promise.all([
    hasColumn("policies", "owner_id"),
    hasColumn("policies", "assigned_to"),
    hasColumn("deals", "owner_id"),
  ]);
  return {
    commissions,
    opportunities: opportunities || xDates,
    xDates,
    workQueue,
    users,
    assigneeColumn: policyOwnerId ? "owner_id" : policyAssignedTo ? "assigned_to" : null,
    dealAssigneeColumn: dealOwnerId ? "owner_id" : null,
  };
}

export type OwnerHomeTables = Awaited<ReturnType<typeof detectOwnerHomeTables>>;
