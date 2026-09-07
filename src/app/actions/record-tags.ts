"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, carriers, contacts, deals, deskModuleTags, leads, policies } from "@/lib/db/schema";
import { getActor } from "@/lib/auth/session";
import {
  isTagModule,
  normalizeTag,
  normalizeTags,
  parseTagsFromForm,
  SUGGESTED_MODULE_TAGS,
  TAG_MODULE_PATHS,
  type TagModule,
} from "@/lib/tags/module-tags";
import { assignFromCatalog, deleteTagFromList, mergeTagInList, renameTagInList } from "@/lib/tags/manage";
import { normalizeTagColor, type TagColorMap } from "@/lib/tags/tag-colors";
import { flashAction } from "@/lib/flash-action";

function pathsFor(module: TagModule) {
  return TAG_MODULE_PATHS[module];
}

function revalidateModule(module: TagModule, recordId?: string) {
  const paths = pathsFor(module);
  revalidatePath(paths.list);
  if (recordId) revalidatePath(paths.detail(recordId));
  revalidatePath("/settings/tags");
  if (module === "deals") revalidatePath("/pipeline");
  if (module === "accounts") revalidatePath("/businesses");
}

export async function saveRecordTags(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const recordId = String(formData.get("recordId") ?? "").trim();
  if (!isTagModule(module) || !recordId) return;
  const catalog = await listModuleTags(module);
  const tags = assignFromCatalog(parseTagsFromForm(formData), catalog.map((row) => row.name));
  await writeRecordTags(module, recordId, tags);
  revalidateModule(module, recordId);
  flashAction(pathsFor(module).detail(recordId), "tags-saved");
}

export async function writeRecordTags(module: TagModule, recordId: string, tags: string[]) {
  const next = normalizeTags(tags);
  if (module === "leads") {
    await db
      .update(leads)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, recordId)));
  } else if (module === "contacts") {
    await db
      .update(contacts)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, recordId)));
  } else if (module === "deals") {
    await db
      .update(deals)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, recordId)));
  } else if (module === "accounts") {
    await db
      .update(accounts)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, recordId)));
  } else if (module === "carriers") {
    await db
      .update(carriers)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, recordId)));
  } else {
    await db
      .update(policies)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, recordId)));
  }
}

async function recordsForModule(module: TagModule) {
  if (module === "leads") {
    return db.select({ id: leads.id, tags: leads.tags }).from(leads).where(eq(leads.tenantId, DEFAULT_TENANT_ID));
  }
  if (module === "contacts") {
    return db
      .select({ id: contacts.id, tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
  }
  if (module === "deals") {
    return db.select({ id: deals.id, tags: deals.tags }).from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID));
  }
  if (module === "accounts") {
    return db
      .select({ id: accounts.id, tags: accounts.tags })
      .from(accounts)
      .where(eq(accounts.tenantId, DEFAULT_TENANT_ID));
  }
  if (module === "carriers") {
    return db
      .select({ id: carriers.id, tags: carriers.tags })
      .from(carriers)
      .where(eq(carriers.tenantId, DEFAULT_TENANT_ID));
  }
  return db
    .select({ id: policies.id, tags: policies.tags })
    .from(policies)
    .where(eq(policies.tenantId, DEFAULT_TENANT_ID));
}

async function rewriteModuleTags(module: TagModule, rewrite: (tags: string[]) => string[]) {
  const rows = await recordsForModule(module);
  for (const row of rows) {
    const current = normalizeTags(row.tags);
    const next = rewrite(current);
    if (next.join(",") === current.join(",")) continue;
    await writeRecordTags(module, row.id, next);
  }
}

async function insertCatalogTag(module: TagModule, name: string, color: string | null) {
  const actor = await getActor().catch(() => null);
  await db
    .insert(deskModuleTags)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      name,
      color,
      createdBy: actor?.id ?? null,
    })
    .onConflictDoNothing({
      target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name],
    });
}

/** Suggested defaults + names already on records (once, if the catalog is still thin). Never wipes. */
export async function ensureModuleTagCatalog(module: TagModule) {
  const existing = await readModuleTagRows(module);
  const have = new Set(existing.map((row) => row.name));
  const missingSuggested = SUGGESTED_MODULE_TAGS[module].filter((name) => !have.has(name));
  if (missingSuggested.length === 0 && existing.length > 0) return;
  const harvested = new Set<string>();
  try {
    const records = await recordsForModule(module);
    for (const row of records) {
      for (const tag of normalizeTags(row.tags)) harvested.add(tag);
    }
  } catch {
    // table may not have tags yet on a stale migrate — catalog still gets defaults
  }
  const needed = normalizeTags([...SUGGESTED_MODULE_TAGS[module], ...harvested]).filter(
    (name) => !have.has(name),
  );
  for (const name of needed) {
    await insertCatalogTag(module, name, null);
  }
}

async function readModuleTagRows(module: TagModule): Promise<{ name: string; color: string | null }[]> {
  try {
    const rows = await db
      .select({ name: deskModuleTags.name, color: deskModuleTags.color })
      .from(deskModuleTags)
      .where(and(eq(deskModuleTags.tenantId, DEFAULT_TENANT_ID), eq(deskModuleTags.module, module)));
    return rows.map((row) => ({ name: row.name, color: normalizeTagColor(row.color) }));
  } catch {
    return [];
  }
}

export async function createModuleTag(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const name = normalizeTag(String(formData.get("name") ?? ""));
  const color = normalizeTagColor(String(formData.get("color") ?? ""));
  if (!isTagModule(module) || !name) return;
  const actor = await getActor().catch(() => null);
  await db
    .insert(deskModuleTags)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      name,
      color,
      createdBy: actor?.id ?? null,
    })
    .onConflictDoUpdate({
      target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name],
      set: color ? { color, updatedAt: new Date() } : { updatedAt: new Date() },
    });
  revalidateModule(module);
}

export async function renameModuleTag(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const from = normalizeTag(String(formData.get("from") ?? ""));
  const to = normalizeTag(String(formData.get("to") ?? ""));
  if (!isTagModule(module) || !from || !to || from === to) return;
  const actor = await getActor().catch(() => null);
  const existing = await listModuleTags(module);
  const carried = existing.find((row) => row.name === from)?.color ?? null;
  await rewriteModuleTags(module, (tags) => renameTagInList(tags, from, to));
  await db
    .delete(deskModuleTags)
    .where(
      and(eq(deskModuleTags.tenantId, DEFAULT_TENANT_ID), eq(deskModuleTags.module, module), eq(deskModuleTags.name, from)),
    );
  await db
    .insert(deskModuleTags)
    .values({ tenantId: DEFAULT_TENANT_ID, module, name: to, color: carried, createdBy: actor?.id ?? null })
    .onConflictDoUpdate({
      target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name],
      set: carried ? { color: carried, updatedAt: new Date() } : { updatedAt: new Date() },
    });
  revalidateModule(module);
}

export async function mergeModuleTag(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const from = normalizeTag(String(formData.get("from") ?? ""));
  const into = normalizeTag(String(formData.get("into") ?? ""));
  if (!isTagModule(module) || !from || !into || from === into) return;
  const actor = await getActor().catch(() => null);
  await rewriteModuleTags(module, (tags) => mergeTagInList(tags, from, into));
  await db
    .delete(deskModuleTags)
    .where(
      and(eq(deskModuleTags.tenantId, DEFAULT_TENANT_ID), eq(deskModuleTags.module, module), eq(deskModuleTags.name, from)),
    );
  await db
    .insert(deskModuleTags)
    .values({ tenantId: DEFAULT_TENANT_ID, module, name: into, createdBy: actor?.id ?? null })
    .onConflictDoNothing({ target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name] });
  revalidateModule(module);
}

export async function deleteModuleTag(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const name = normalizeTag(String(formData.get("name") ?? ""));
  if (!isTagModule(module) || !name) return;
  await rewriteModuleTags(module, (tags) => deleteTagFromList(tags, name));
  await db
    .delete(deskModuleTags)
    .where(
      and(eq(deskModuleTags.tenantId, DEFAULT_TENANT_ID), eq(deskModuleTags.module, module), eq(deskModuleTags.name, name)),
    );
  revalidateModule(module);
}

export async function listModuleTagSuggestions(module: TagModule): Promise<string[]> {
  const rows = await listModuleTags(module);
  return rows.map((row) => row.name);
}

export async function listModuleTags(module: TagModule): Promise<{ name: string; color: string | null }[]> {
  await ensureModuleTagCatalog(module);
  const rows = await readModuleTagRows(module);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listModuleTagColors(module: TagModule): Promise<TagColorMap> {
  const rows = await listModuleTags(module);
  const out: TagColorMap = {};
  for (const row of rows) {
    if (row.color) out[row.name] = row.color;
  }
  return out;
}

export async function updateModuleTagColor(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const name = normalizeTag(String(formData.get("name") ?? ""));
  const color = normalizeTagColor(String(formData.get("color") ?? ""));
  if (!isTagModule(module) || !name || !color) return;
  const actor = await getActor().catch(() => null);
  await db
    .insert(deskModuleTags)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      name,
      color,
      createdBy: actor?.id ?? null,
    })
    .onConflictDoUpdate({
      target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name],
      set: { color, updatedAt: new Date() },
    });
  revalidateModule(module);
}

