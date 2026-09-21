import { and, eq, isNull } from "drizzle-orm";
import { ADMIN_EMAIL } from "@/lib/auth/api";
import { resolveDirectoryOwnerId } from "@/lib/auth/producer-identity";
import { db, sql } from "@/lib/db";
import { contacts, deals, leads, policies, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { ADMIN_NAME, ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { lookupEmail, lookupId, lookupName } from "./values";
import type { ZohoRecord } from "./types";

export const OWNED_IMPORT_TABLES = ["contacts", "leads", "deals", "policies"] as const;
export type OwnedImportTable = (typeof OWNED_IMPORT_TABLES)[number];

export type ZohoOwnerRef = {
  zohoId: string | null;
  name: string | null;
  email: string | null;
};

export type TenantUserRef = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AssignOwnerTableResult = {
  table: OwnedImportTable;
  ownerUpdated: number;
  createdByUpdated: number;
  createdByColumn: string | null;
};

export type AssignOwnerReport = {
  adminId: string;
  adminEmail: string;
  adminName: string;
  tables: AssignOwnerTableResult[];
};

const emptyOwner: ZohoOwnerRef = { zohoId: null, name: null, email: null };

export function extractZohoOwner(record: ZohoRecord, field = "Owner"): ZohoOwnerRef {
  const raw = record[field];
  if (raw == null) return { ...emptyOwner };
  if (typeof raw === "string" || typeof raw === "number") {
    const text = String(raw).trim();
    if (!text) return { ...emptyOwner };
    if (text.includes("@")) return { zohoId: null, name: null, email: text };
    return { zohoId: null, name: text, email: null };
  }
  if (typeof raw === "object") {
    return {
      zohoId: lookupId(raw),
      name: lookupName(raw),
      email: lookupEmail(raw),
    };
  }
  return { ...emptyOwner };
}

export function resolveOwnerId(
  owner: ZohoOwnerRef | null | undefined,
  directory: TenantUserRef[],
  fallbackId: string,
): string {
  return resolveDirectoryOwnerId(owner, directory, fallbackId);
}

export async function loadTenantUsers(tenantId = DEFAULT_TENANT_ID): Promise<TenantUserRef[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId));
}

export async function resolveTenantAdmin(tenantId = DEFAULT_TENANT_ID): Promise<TenantUserRef> {
  const directory = await loadTenantUsers(tenantId);
  const byEmail = directory.find((user) => user.email.trim().toLowerCase() === ADMIN_EMAIL);
  if (byEmail) return byEmail;
  const byId = directory.find((user) => user.id === ADMIN_USER_ID);
  if (byId) return byId;
  const byRole = directory.find((user) => user.role === "admin");
  if (byRole) return byRole;
  return { id: ADMIN_USER_ID, name: ADMIN_NAME, email: ADMIN_EMAIL, role: "admin" };
}

const TABLE_MODELS = {
  contacts,
  leads,
  deals,
  policies,
} as const;

export async function assignNullOwners(
  tenantId = DEFAULT_TENANT_ID,
  admin?: TenantUserRef,
): Promise<AssignOwnerReport> {
  const resolved = admin ?? (await resolveTenantAdmin(tenantId));
  const columns = await ownerAndCreatedByColumns(OWNED_IMPORT_TABLES);
  const tables: AssignOwnerTableResult[] = [];

  for (const table of OWNED_IMPORT_TABLES) {
    const model = TABLE_MODELS[table];
    const available = columns.get(table);
    let ownerUpdated = 0;
    if (available?.has("owner_id")) {
      const result = await db
        .update(model)
        .set({ ownerId: resolved.id, updatedAt: new Date() })
        .where(and(eq(model.tenantId, tenantId), isNull(model.ownerId)))
        .returning({ id: model.id });
      ownerUpdated = result.length;
    }

    let createdByUpdated = 0;
    const createdByColumn = createdByColumnName(available);
    if (createdByColumn) {
      createdByUpdated = await updateNullCreatedBy(table, createdByColumn, tenantId, resolved.id);
    }

    tables.push({ table, ownerUpdated, createdByUpdated, createdByColumn });
  }

  return {
    adminId: resolved.id,
    adminEmail: resolved.email,
    adminName: resolved.name,
    tables,
  };
}

export function formatAssignOwnerReport(report: AssignOwnerReport): string {
  const lines = [
    `Assigned null owners to ${report.adminName} (${report.adminEmail} / ${report.adminId}). No wipe.`,
  ];
  for (const row of report.tables) {
    const created =
      row.createdByColumn != null
        ? `, ${row.createdByColumn}=${row.createdByUpdated}`
        : "";
    lines.push(`  ${row.table}: owner_id=${row.ownerUpdated}${created}`);
  }
  return lines.join("\n");
}

async function ownerAndCreatedByColumns(tables: readonly string[]): Promise<Map<string, Set<string>>> {
  const rows = (await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ${sql([...tables])}
      and column_name in ('owner_id', 'created_by', 'created_by_user_id')
  `) as Array<{ table_name: string; column_name: string }>;
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = map.get(row.table_name) ?? new Set<string>();
    set.add(row.column_name);
    map.set(row.table_name, set);
  }
  return map;
}

function createdByColumnName(columns: Set<string> | undefined): string | null {
  if (!columns) return null;
  if (columns.has("created_by")) return "created_by";
  if (columns.has("created_by_user_id")) return "created_by_user_id";
  return null;
}

function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Refusing to quote unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

async function updateNullCreatedBy(
  table: OwnedImportTable,
  column: string,
  tenantId: string,
  adminId: string,
): Promise<number> {
  const result = await sql.unsafe(
    `update ${quoteIdent(table)} set ${quoteIdent(column)} = $1 where tenant_id = $2 and ${quoteIdent(column)} is null`,
    [adminId, tenantId],
  );
  return Number(result.count ?? 0);
}
