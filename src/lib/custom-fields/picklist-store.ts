import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskFieldPicklists } from "@/lib/db/schema";
import {
  sanitizeRichPicklistOptions,
  type FieldPicklist,
  type PicklistOption,
} from "./picklists";
import { STARTER_FIELD_PICKLISTS } from "./starter-picklists";

export function toPicklist(row: {
  id: string;
  name: string;
  options: unknown;
}): FieldPicklist {
  return {
    id: row.id,
    name: row.name,
    options: sanitizeRichPicklistOptions(row.options ?? []),
  };
}

async function readFieldPicklists(): Promise<FieldPicklist[]> {
  const rows = await db
    .select()
    .from(deskFieldPicklists)
    .where(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID));
  return rows.map(toPicklist).sort((a, b) => a.name.localeCompare(b.name));
}

function isUniqueViolation(error: unknown): boolean {
  const codes: unknown[] = [];
  let cur: unknown = error;
  for (let i = 0; i < 4 && cur && typeof cur === "object"; i++) {
    if ("code" in cur) codes.push((cur as { code?: unknown }).code);
    cur = "cause" in cur ? (cur as { cause?: unknown }).cause : undefined;
  }
  return codes.some((code) => code === "23505");
}

/** "Foo", then "Foo 2", "Foo 3", … when the desired name is already taken for the tenant. */
async function allocateUniquePicklistName(desired: string): Promise<string> {
  const base = desired.trim() || "Untitled list";
  const existing = await readFieldPicklists();
  const taken = new Set(existing.map((list) => list.name.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** Insert missing starter lists. Never overwrites a list that already has values. */
export async function ensureDefaultFieldPicklists(): Promise<FieldPicklist[]> {
  try {
    const existing = await readFieldPicklists();
    const byName = new Map(existing.map((list) => [list.name.trim().toLowerCase(), list]));
    for (const starter of STARTER_FIELD_PICKLISTS) {
      const current = byName.get(starter.name.toLowerCase());
      if (!current) {
        const created = await createFieldPicklist(starter.name, starter.options);
        byName.set(created.name.trim().toLowerCase(), created);
        continue;
      }
      if (current.options.length === 0) {
        const updated = await updateFieldPicklist(current.id, { options: starter.options });
        if (updated) byName.set(updated.name.trim().toLowerCase(), updated);
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function listFieldPicklists(): Promise<FieldPicklist[]> {
  try {
    const lists = await ensureDefaultFieldPicklists();
    if (lists.length > 0) return lists;
    return await readFieldPicklists();
  } catch {
    return [];
  }
}

export async function createFieldPicklist(name: string, options: Array<string | PicklistOption> = []): Promise<FieldPicklist> {
  const uniqueName = await allocateUniquePicklistName(name.trim() || "Untitled list");
  try {
    const [row] = await db
      .insert(deskFieldPicklists)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name: uniqueName,
        options: sanitizeRichPicklistOptions(options),
      })
      .returning();
    return toPicklist(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(`A picklist named "${uniqueName}" already exists.`);
    }
    throw error;
  }
}

export async function updateFieldPicklist(id: string, patch: { name?: string; options?: Array<string | PicklistOption> }) {
  const [existing] = await db
    .select()
    .from(deskFieldPicklists)
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
  if (!existing) return null;

  const nextName = patch.name !== undefined ? patch.name.trim() || existing.name : existing.name;
  if (nextName.toLowerCase() !== existing.name.trim().toLowerCase()) {
    const siblings = await readFieldPicklists();
    const clash = siblings.some(
      (list) => list.id !== id && list.name.trim().toLowerCase() === nextName.toLowerCase(),
    );
    if (clash) {
      throw new Error(`A picklist named "${nextName}" already exists.`);
    }
  }

  try {
    const [row] = await db
      .update(deskFieldPicklists)
      .set({
        name: nextName,
        options: patch.options !== undefined ? sanitizeRichPicklistOptions(patch.options) : existing.options,
        updatedAt: new Date(),
      })
      .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)))
      .returning();
    return row ? toPicklist(row) : null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(`A picklist named "${nextName}" already exists.`);
    }
    throw error;
  }
}

export async function deleteFieldPicklist(id: string) {
  await db
    .delete(deskFieldPicklists)
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
}
