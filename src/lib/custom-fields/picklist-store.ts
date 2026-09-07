import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskFieldPicklists } from "@/lib/db/schema";
import {
  sanitizePicklistOptions,
  type FieldPicklist,
} from "./picklists";

export function toPicklist(row: {
  id: string;
  name: string;
  options: string[] | null;
}): FieldPicklist {
  return {
    id: row.id,
    name: row.name,
    options: sanitizePicklistOptions(row.options ?? []),
  };
}

export async function listFieldPicklists(): Promise<FieldPicklist[]> {
  try {
    const rows = await db
      .select()
      .from(deskFieldPicklists)
      .where(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID));
    return rows.map(toPicklist).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function createFieldPicklist(name: string, options: string[] = []): Promise<FieldPicklist> {
  const trimmed = name.trim() || "Untitled list";
  const [row] = await db
    .insert(deskFieldPicklists)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name: trimmed,
      options: sanitizePicklistOptions(options),
    })
    .returning();
  return toPicklist(row);
}

export async function updateFieldPicklist(id: string, patch: { name?: string; options?: string[] }) {
  const [existing] = await db
    .select()
    .from(deskFieldPicklists)
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
  if (!existing) return null;
  const [row] = await db
    .update(deskFieldPicklists)
    .set({
      name: patch.name?.trim() || existing.name,
      options: patch.options !== undefined ? sanitizePicklistOptions(patch.options) : existing.options,
      updatedAt: new Date(),
    })
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)))
    .returning();
  return row ? toPicklist(row) : null;
}

export async function deleteFieldPicklist(id: string) {
  await db
    .delete(deskFieldPicklists)
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
}
