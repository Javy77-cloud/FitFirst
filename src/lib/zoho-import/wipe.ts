import { sql } from "@/lib/db";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import type { WipeCounts, WipeResult } from "./types";

export const WIPE_ROOT_TABLES = [
  "alerts",
  "quotes",
  "activities",
  "leads",
  "deals",
  "contacts",
  "accounts",
  "policies",
] as const;

export const KEEP_TABLES = new Set([
  "tenants",
  "users",
  "auth_recovery_tokens",
  "api_tokens",
  "mfa_challenges",
  "carriers",
  "carrier_appointments",
  "carrier_secret_reveal_logs",
  "desk_agents",
  "agency_settings",
  "offices",
  "territories",
  "territory_offices",
  "user_offices",
  "user_territories",
  "global_lists",
  "line_subfilter_options",
  "pipelines",
  "pipeline_stages",
  "form_templates",
  "email_templates",
  "email_triggers",
  "email_send_accounts",
  "agency_brand",
  "email_signatures",
  "sms_settings",
  "telephony_settings",
  "esign_settings",
  "integration_connections",
  "user_dashboard_prefs",
  "user_home_layouts",
  "agent_ui_prefs",
  "desk_column_prefs",
  "column_layouts",
  "calendar_connections",
  "appetite_rules",
  "carrier_goals",
  "commission_rate_settings",
  "carrier_download_connections",
  "lead_routing_rules",
  "guided_automations",
  "developer_functions",
  "developer_function_executions",
  "developer_org_api_keys",
  "developer_webhooks",
  "developer_webhook_deliveries",
  "developer_inbound_hooks",
  "developer_inbound_payloads",
  "developer_connections",
  "desk_macros",
  "desk_macro_runs",
  "desk_custom_buttons",
  "desk_client_scripts",
  "desk_widgets",
  "lead_follow_up_templates",
  "lead_follow_up_steps",
  "import_export_jobs",
  "email_campaigns",
  "campaign_sequences",
  "contests",
]);

type FkRow = {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  is_nullable: "YES" | "NO";
};

async function loadForeignKeys(): Promise<FkRow[]> {
  return (await sql`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      c.is_nullable
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.columns c
      ON c.table_schema = tc.table_schema
      AND c.table_name = tc.table_name
      AND c.column_name = kcu.column_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `) as FkRow[];
}

async function tableHasColumn(table: string, column: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Refusing to quote unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

export function planWipe(fks: FkRow[]): {
  full: string[];
  partial: Array<{ table: string; columns: string[] }>;
  nullOut: Array<{ table: string; columns: string[] }>;
} {
  const incoming = new Map<string, FkRow[]>();
  for (const fk of fks) {
    if (fk.table_name === fk.foreign_table_name) continue;
    const list = incoming.get(fk.foreign_table_name) ?? [];
    list.push(fk);
    incoming.set(fk.foreign_table_name, list);
  }

  const full = new Set<string>(WIPE_ROOT_TABLES);
  let grew = true;
  while (grew) {
    grew = false;
    for (const parent of [...full]) {
      for (const fk of incoming.get(parent) ?? []) {
        if (KEEP_TABLES.has(fk.table_name)) continue;
        if (full.has(fk.table_name)) continue;
        if (fk.is_nullable === "NO") {
          full.add(fk.table_name);
          grew = true;
        }
      }
    }
  }

  const partialMap = new Map<string, Set<string>>();
  const nullMap = new Map<string, Set<string>>();
  for (const parent of full) {
    for (const fk of incoming.get(parent) ?? []) {
      if (full.has(fk.table_name)) continue;
      if (KEEP_TABLES.has(fk.table_name)) {
        const cols = nullMap.get(fk.table_name) ?? new Set<string>();
        cols.add(fk.column_name);
        nullMap.set(fk.table_name, cols);
        continue;
      }
      const cols = partialMap.get(fk.table_name) ?? new Set<string>();
      cols.add(fk.column_name);
      partialMap.set(fk.table_name, cols);
    }
  }

  const topo: string[] = [];
  const remaining = new Set(full);
  while (remaining.size) {
    const ready = [...remaining].filter((table) => {
      const deps = (incoming.get(table) ?? [])
        .map((fk) => fk.table_name)
        .filter((child) => remaining.has(child) && child !== table);
      return deps.length === 0;
    });
    const batch = ready.length ? ready : [[...remaining][0]!];
    for (const table of batch) {
      topo.push(table);
      remaining.delete(table);
    }
  }

  return {
    full: topo,
    partial: [...partialMap.entries()].map(([table, columns]) => ({ table, columns: [...columns] })),
    nullOut: [...nullMap.entries()].map(([table, columns]) => ({ table, columns: [...columns] })),
  };
}

function childrenOf(fks: FkRow[]): Map<string, FkRow[]> {
  const incoming = new Map<string, FkRow[]>();
  for (const fk of fks) {
    if (fk.table_name === fk.foreign_table_name) continue;
    const list = incoming.get(fk.foreign_table_name) ?? [];
    list.push(fk);
    incoming.set(fk.foreign_table_name, list);
  }
  return incoming;
}

export async function wipeCrmDemo(tenantId = DEFAULT_TENANT_ID): Promise<WipeResult> {
  const fks = await loadForeignKeys();
  const incoming = childrenOf(fks);
  const deleted: WipeCounts = {};
  const hasTenantCache = new Map<string, boolean>();

  async function hasTenant(table: string): Promise<boolean> {
    const cached = hasTenantCache.get(table);
    if (cached != null) return cached;
    const value = await tableHasColumn(table, "tenant_id");
    hasTenantCache.set(table, value);
    return value;
  }

  function withTenant(tableHasTenantCol: boolean, whereSql: string, params: unknown[]): { where: string; params: unknown[] } {
    if (!tableHasTenantCol || whereSql.includes("tenant_id")) return { where: whereSql, params };
    return { where: `tenant_id = $1 AND (${whereSql})`, params: [tenantId, ...params] };
  }

  async function deleteWhere(table: string, whereSql: string, params: unknown[], stack: Set<string>) {
    if (KEEP_TABLES.has(table)) return;
    const ident = quoteIdent(table);
    const nextStack = new Set(stack);
    nextStack.add(table);

    for (const child of incoming.get(table) ?? []) {
      const childIdent = quoteIdent(child.table_name);
      const childCol = quoteIdent(child.column_name);
      const childWhere = `${childCol} IN (SELECT ${quoteIdent("id")} FROM ${ident} WHERE ${whereSql})`;
      if (KEEP_TABLES.has(child.table_name) || nextStack.has(child.table_name)) {
        const scoped = withTenant(await hasTenant(child.table_name), childWhere, params);
        await sql.unsafe(`UPDATE ${childIdent} SET ${childCol} = NULL WHERE ${scoped.where}`, scoped.params);
        continue;
      }
      const scoped = withTenant(await hasTenant(child.table_name), childWhere, params);
      await deleteWhere(child.table_name, scoped.where, scoped.params, nextStack);
    }

    const counted = await sql.unsafe(`SELECT count(*)::int AS n FROM ${ident} WHERE ${whereSql}`, params);
    const n = Number((counted[0] as { n: number } | undefined)?.n ?? 0);
    if (n > 0) {
      await sql.unsafe(`DELETE FROM ${ident} WHERE ${whereSql}`, params);
      deleted[table] = (deleted[table] ?? 0) + n;
    }
  }

  const [users] = await sql`SELECT count(*)::int AS n FROM users WHERE tenant_id = ${tenantId}`;
  const [tenants] = await sql`SELECT count(*)::int AS n FROM tenants WHERE id = ${tenantId}`;
  const [carriers] = await sql`SELECT count(*)::int AS n FROM carriers WHERE tenant_id = ${tenantId}`;
  const [appointments] =
    await sql`SELECT count(*)::int AS n FROM carrier_appointments WHERE tenant_id = ${tenantId}`;
  const anaBefore = await sql`SELECT 1 FROM contacts WHERE id = ${CONTACT_ID} LIMIT 1`;

  for (const table of WIPE_ROOT_TABLES) {
    const scoped = (await hasTenant(table)) ? `tenant_id = $1` : "TRUE";
    await deleteWhere(table, scoped, scoped === "TRUE" ? [] : [tenantId], new Set());
  }

  return {
    kept: {
      users: Number((users as { n: number } | undefined)?.n ?? 0),
      tenants: Number((tenants as { n: number } | undefined)?.n ?? 0),
      carriers: Number((carriers as { n: number } | undefined)?.n ?? 0),
      carrierAppointments: Number((appointments as { n: number } | undefined)?.n ?? 0),
    },
    deleted,
    anaRemoved: anaBefore.length > 0,
  };
}

export function formatWipeReport(result: WipeResult): string {
  const lines = [
    "Wiped FitFirst CRM demo data. Kept users, tenant, and carriers.",
    `  kept users=${result.kept.users} tenant_rows=${result.kept.tenants} carriers=${result.kept.carriers} appointments=${result.kept.carrierAppointments}`,
    "  deleted:",
  ];
  const keys = Object.keys(result.deleted).sort();
  for (const key of keys) {
    lines.push(`    ${key}: ${result.deleted[key]}`);
  }
  lines.push(
    result.anaRemoved
      ? "  Ana fixture removed and not re-seeded."
      : "  Ana fixture was not present.",
  );
  return lines.join("\n");
}
