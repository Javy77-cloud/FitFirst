import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  DEFAULT_AGENCY_LINES,
  canonicalizeLineCode,
  findAgencyLineOrphans,
  requireAgencyLineCode,
  type AgencyLine,
  type AgencyLineOrphan,
} from "@/lib/desk/agency-lines";
import { db } from "./index";
import { agencyLines, deals, policies } from "./schema";

function tenant() {
  return DEFAULT_TENANT_ID;
}

function toLine(row: typeof agencyLines.$inferSelect): AgencyLine {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    family: row.family === "life" ? "life" : row.family === "health" ? "health" : "pc",
    active: row.active,
    sortOrder: row.sortOrder,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    system: row.system,
  };
}

export async function ensureDefaultAgencyLines() {
  const existing = await db
    .select({ id: agencyLines.id })
    .from(agencyLines)
    .where(eq(agencyLines.tenantId, tenant()))
    .limit(1);
  if (existing.length > 0) return;

  await db
    .insert(agencyLines)
    .values(
      DEFAULT_AGENCY_LINES.map((line) => ({
        tenantId: tenant(),
        code: line.code,
        label: line.label,
        family: line.family,
        active: line.active,
        sortOrder: line.sortOrder,
        aliases: line.aliases,
        system: line.system,
      })),
    )
    .onConflictDoNothing();
}

export async function loadAgencyLines(): Promise<AgencyLine[]> {
  await ensureDefaultAgencyLines();
  const rows = await db
    .select()
    .from(agencyLines)
    .where(eq(agencyLines.tenantId, tenant()))
    .orderBy(asc(agencyLines.sortOrder), asc(agencyLines.label));
  return rows.length > 0 ? rows.map(toLine) : DEFAULT_AGENCY_LINES;
}

export async function listAgencyLineOrphans(): Promise<AgencyLineOrphan[]> {
  const lines = await loadAgencyLines();
  const [dealRows, policyRows] = await Promise.all([
    db
      .select({ lineOfBusiness: deals.lineOfBusiness })
      .from(deals)
      .where(eq(deals.tenantId, tenant())),
    db
      .select({ lineOfBusiness: policies.lineOfBusiness })
      .from(policies)
      .where(eq(policies.tenantId, tenant())),
  ]);
  return findAgencyLineOrphans(
    [...dealRows.map((row) => row.lineOfBusiness), ...policyRows.map((row) => row.lineOfBusiness)],
    lines,
  );
}

export async function resolveStoredLineOfBusiness(
  value: string | null | undefined,
): Promise<string | null> {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const lines = await loadAgencyLines();
  return canonicalizeLineCode(raw, lines);
}

export async function requireStoredLineOfBusiness(
  value: string | null | undefined,
  fallback = "HO",
): Promise<string> {
  const lines = await loadAgencyLines();
  return requireAgencyLineCode(value, lines, fallback);
}

/** Rewrite known aliases on deals + policies to the master code. Unknown values stay. */
export async function normalizeStoredLineOfBusiness(): Promise<{ deals: number; policies: number }> {
  const lines = await loadAgencyLines();
  let dealCount = 0;
  let policyCount = 0;
  for (const line of lines) {
    const keys = [line.code, line.label, ...line.aliases]
      .map((item) => item.trim())
      .filter(Boolean);
    if (keys.length === 0) continue;
    const upper = keys.map((item) => item.toUpperCase());
    const dealResult = await db
      .update(deals)
      .set({ lineOfBusiness: line.code, updatedAt: new Date() })
      .where(
        and(
          eq(deals.tenantId, tenant()),
          sql`${deals.lineOfBusiness} <> ${line.code}`,
          or(
            inArray(deals.lineOfBusiness, keys),
            sql`upper(trim(${deals.lineOfBusiness})) in (${sql.join(
              upper.map((item) => sql`${item}`),
              sql`, `,
            )})`,
          ),
        ),
      );
    dealCount += dealResult.rowCount ?? 0;
    const policyResult = await db
      .update(policies)
      .set({ lineOfBusiness: line.code, updatedAt: new Date() })
      .where(
        and(
          eq(policies.tenantId, tenant()),
          sql`${policies.lineOfBusiness} <> ${line.code}`,
          or(
            inArray(policies.lineOfBusiness, keys),
            sql`upper(trim(${policies.lineOfBusiness})) in (${sql.join(
              upper.map((item) => sql`${item}`),
              sql`, `,
            )})`,
          ),
        ),
      );
    policyCount += policyResult.rowCount ?? 0;
  }
  return { deals: dealCount, policies: policyCount };
}

export async function remapLineOfBusiness(fromRaw: string, toCode: string) {
  const from = fromRaw.trim();
  const to = toCode.trim();
  if (!from || !to) return { deals: 0, policies: 0 };
  const dealResult = await db
    .update(deals)
    .set({ lineOfBusiness: to, updatedAt: new Date() })
    .where(
      and(
        eq(deals.tenantId, tenant()),
        or(eq(deals.lineOfBusiness, from), sql`upper(trim(${deals.lineOfBusiness})) = ${from.toUpperCase()}`),
      ),
    );
  const policyResult = await db
    .update(policies)
    .set({ lineOfBusiness: to, updatedAt: new Date() })
    .where(
      and(
        eq(policies.tenantId, tenant()),
        or(
          eq(policies.lineOfBusiness, from),
          sql`upper(trim(${policies.lineOfBusiness})) = ${from.toUpperCase()}`,
        ),
      ),
    );
  return { deals: dealResult.rowCount ?? 0, policies: policyResult.rowCount ?? 0 };
}

export async function countRecordsForLine(code: string) {
  const value = code.trim();
  if (!value) return { deals: 0, policies: 0 };
  const [{ n: dealN }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(deals)
    .where(and(eq(deals.tenantId, tenant()), eq(deals.lineOfBusiness, value)));
  const [{ n: policyN }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(policies)
    .where(and(eq(policies.tenantId, tenant()), eq(policies.lineOfBusiness, value)));
  return { deals: Number(dealN ?? 0), policies: Number(policyN ?? 0) };
}
