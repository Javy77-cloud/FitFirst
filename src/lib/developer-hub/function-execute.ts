import { sql } from "@/lib/db";

export type FunctionExecuteResult =
  | { ok: true; detail: string }
  | { ok: false; reason: "missing_api_name" | "no_functions_table" | "not_found" | "not_wired"; detail: string };

const FUNCTION_TABLES = ["desk_functions", "developer_functions", "hub_functions"] as const;

/**
 * Custom Button → Function by apiName.
 * TODO: wire to Developer Hub core execute when that branch lands.
 * Do not block buttons if the Functions table is absent.
 */
export async function executeFunctionByApiName(
  apiName: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<FunctionExecuteResult> {
  const name = (apiName ?? "").trim();
  if (!name) {
    return { ok: false, reason: "missing_api_name", detail: "No function apiName on this button." };
  }

  const { executeDeskFunction } = await import("./core-execute");
  const sibling = await executeDeskFunction(name, payload);
  if (sibling) return sibling;

  const tables = await listExistingFunctionTables();
  if (tables.length === 0) {
    return {
      ok: false,
      reason: "no_functions_table",
      detail: "Functions table is not on this branch yet. Developer Hub core owns execute.",
    };
  }

  const found = await lookupFunctionRow(tables, name);
  if (!found) {
    return {
      ok: false,
      reason: "not_found",
      detail: `No function named ${name} in ${tables.join(", ")}.`,
    };
  }

  return {
    ok: false,
    reason: "not_wired",
    detail: `Found ${name} on ${found.table}. Execute lives in Developer Hub core — not called from here.`,
  };
}

async function listExistingFunctionTables(): Promise<string[]> {
  try {
    const rows = await sql<Array<{ table_name: string }>>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('desk_functions', 'developer_functions', 'hub_functions')
    `;
    return rows.map((row) => row.table_name).filter((name) => FUNCTION_TABLES.includes(name as (typeof FUNCTION_TABLES)[number]));
  } catch {
    return [];
  }
}

async function lookupFunctionRow(
  tables: string[],
  apiName: string,
): Promise<{ table: string } | null> {
  for (const table of tables) {
    try {
      const rows = await sql.unsafe(
        `select 1 from ${table} where api_name = $1 or "apiName" = $1 limit 1`,
        [apiName],
      );
      if (Array.isArray(rows) && rows.length > 0) return { table };
    } catch {
      // Column names differ across sibling drafts.
    }
  }
  return null;
}
