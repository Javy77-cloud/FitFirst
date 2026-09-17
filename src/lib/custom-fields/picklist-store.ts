import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskFieldPicklists } from "@/lib/db/schema";
import {
  sanitizeRichPicklistOptions,
  type FieldPicklist,
  type PicklistOption,
} from "./picklists";
import { insertAssociatesEducationOption } from "@/lib/contacts/contact-field-catalog";
import {
  STARTER_FIELD_PICKLISTS,
  STARTER_PICKLIST_SEED_KEY,
  matchStarterList,
} from "./starter-picklists";

export function toPicklist(row: {
  id: string;
  name: string;
  options: unknown;
  seedKey?: string | null;
  active?: boolean | null;
}): FieldPicklist {
  return {
    id: row.id,
    name: row.name,
    options: sanitizeRichPicklistOptions(row.options ?? []),
    seedKey: row.seedKey ?? null,
    active: row.active !== false,
  };
}

async function readFieldPicklists(opts?: { includeInactive?: boolean }): Promise<FieldPicklist[]> {
  const rows = await db
    .select()
    .from(deskFieldPicklists)
    .where(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID));
  return rows
    .filter((row) => opts?.includeInactive || row.active !== false)
    .map(toPicklist)
    .sort((a, b) => a.name.localeCompare(b.name));
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
  const existing = await readFieldPicklists({ includeInactive: true });
  const taken = new Set(existing.map((list) => list.name.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** Insert missing starter lists. Never overwrites a list that already has values or a renamed name. */
export async function ensureDefaultFieldPicklists(): Promise<FieldPicklist[]> {
  try {
    const existing = await readFieldPicklists({ includeInactive: true });
    const byId = new Map(existing.map((list) => [list.id, list]));
    for (const starter of STARTER_FIELD_PICKLISTS) {
      const current = matchStarterList(existing, starter);
      if (!current) {
        const created = await createFieldPicklist(starter.name, starter.options, { seedKey: starter.seedKey });
        existing.push(created);
        byId.set(created.id, created);
        continue;
      }
      const patch: { seedKey?: string; options?: Array<string | PicklistOption> } = {};
      if (!current.seedKey) patch.seedKey = starter.seedKey;
      if (current.active !== false && current.options.length === 0 && starter.options.length > 0) {
        patch.options = starter.options;
      } else if (
        current.active !== false &&
        starter.seedKey === STARTER_PICKLIST_SEED_KEY.education
      ) {
        const next = insertAssociatesEducationOption(current.options);
        if (next !== current.options) patch.options = next;
      }
      if (Object.keys(patch).length === 0) continue;
      const updated = await updateFieldPicklist(current.id, patch);
      if (updated) {
        const index = existing.findIndex((list) => list.id === current.id);
        if (index >= 0) existing[index] = updated;
        byId.set(updated.id, updated);
      }
    }
    return [...byId.values()]
      .filter((list) => list.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
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

export async function getFieldPicklist(id: string): Promise<FieldPicklist | null> {
  try {
    const [row] = await db
      .select()
      .from(deskFieldPicklists)
      .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
    return row ? toPicklist(row) : null;
  } catch {
    return null;
  }
}

export async function createFieldPicklist(
  name: string,
  options: Array<string | PicklistOption> = [],
  meta?: { seedKey?: string | null },
): Promise<FieldPicklist> {
  const uniqueName = await allocateUniquePicklistName(name.trim() || "Untitled list");
  const seedKey = meta?.seedKey?.trim() || null;
  try {
    const [row] = await db
      .insert(deskFieldPicklists)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        name: uniqueName,
        options: sanitizeRichPicklistOptions(options),
        seedKey,
        active: true,
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

export async function updateFieldPicklist(
  id: string,
  patch: { name?: string; options?: Array<string | PicklistOption>; seedKey?: string | null; active?: boolean },
) {
  const [existing] = await db
    .select()
    .from(deskFieldPicklists)
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
  if (!existing) return null;

  const nextName = patch.name !== undefined ? patch.name.trim() || existing.name : existing.name;
  if (nextName.toLowerCase() !== existing.name.trim().toLowerCase()) {
    const siblings = await readFieldPicklists({ includeInactive: true });
    const clash = siblings.some(
      (list) => list.id !== id && list.name.trim().toLowerCase() === nextName.toLowerCase(),
    );
    if (clash) {
      throw new Error(`A picklist named "${nextName}" already exists.`);
    }
  }

  const nextSeedKey = patch.seedKey !== undefined ? patch.seedKey : existing.seedKey;

  try {
    const [row] = await db
      .update(deskFieldPicklists)
      .set({
        name: nextName,
        options: patch.options !== undefined ? sanitizeRichPicklistOptions(patch.options) : existing.options,
        seedKey: nextSeedKey,
        active: patch.active !== undefined ? patch.active : existing.active,
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
  // Soft-delete so starter seed keys stay claimed and Deal field pickers keep their ids.
  await db
    .update(deskFieldPicklists)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(deskFieldPicklists.tenantId, DEFAULT_TENANT_ID), eq(deskFieldPicklists.id, id)));
}
