"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, deskModuleTags, leads, policies } from "@/lib/db/schema";
import { getActor } from "@/lib/auth/session";
import {
  isTagModule,
  normalizeTag,
  normalizeTags,
  parseTagsFromForm,
  type TagModule,
} from "@/lib/tags/module-tags";
import { deleteTagFromList, mergeTagInList, renameTagInList } from "@/lib/tags/manage";
import {
  normalizeTagColor,
  parseTagColorsFromForm,
  type TagColorMap,
} from "@/lib/tags/tag-colors";
import { flashAction, flashStay } from "@/lib/flash-action";

const PATHS: Record<TagModule, { list: string; detail: (id: string) => string }> = {
  leads: { list: "/leads", detail: (id) => `/leads/${id}` },
  contacts: { list: "/contacts", detail: (id) => `/contacts/${id}` },
  deals: { list: "/deals", detail: (id) => `/deals/${id}` },
  policies: { list: "/policies", detail: (id) => `/policies/${id}` },
};

export async function saveRecordTags(formData: FormData) {
  const module = String(formData.get("module") ?? "");
  const recordId = String(formData.get("recordId") ?? "").trim();
  if (!isTagModule(module) || !recordId) return;
  const tags = parseTagsFromForm(formData);
  const colors = parseTagColorsFromForm(formData);
  await writeRecordTags(module, recordId, tags, colors);
  const paths = PATHS[module];
  revalidatePath(paths.list);
  revalidatePath(paths.detail(recordId));
  flashAction(paths.detail(recordId), "tags-saved");
}

export async function writeRecordTags(
  module: TagModule,
  recordId: string,
  tags: string[],
  colors: TagColorMap = {},
) {
  const next = normalizeTags(tags);
  const actor = await getActor().catch(() => null);
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
  } else {
    await db
      .update(policies)
      .set({ tags: next, updatedAt: new Date() })
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, recordId)));
  }
  for (const name of next) {
    const color = normalizeTagColor(colors[name]);
    if (color) {
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
    } else {
      await db
        .insert(deskModuleTags)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          module,
          name,
          createdBy: actor?.id ?? null,
        })
        .onConflictDoNothing({
          target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name],
        });
    }
  }
}

async function recordsForModule(module: TagModule) {
  if (module === "leads") return db.select({ id: leads.id, tags: leads.tags }).from(leads).where(eq(leads.tenantId, DEFAULT_TENANT_ID));
  if (module === "contacts") {
    return db.select({ id: contacts.id, tags: contacts.tags }).from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
  }
  if (module === "deals") return db.select({ id: deals.id, tags: deals.tags }).from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID));
  return db.select({ id: policies.id, tags: policies.tags }).from(policies).where(eq(policies.tenantId, DEFAULT_TENANT_ID));
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
  revalidatePath(PATHS[module].list);
  revalidatePath("/settings/tags");
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
  revalidatePath(PATHS[module].list);
  revalidatePath("/settings/tags");
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
  revalidatePath(PATHS[module].list);
  revalidatePath("/settings/tags");
}

export async function listModuleTagSuggestions(module: TagModule): Promise<string[]> {
  const rows = await listModuleTags(module);
  return rows.map((row) => row.name);
}

export async function listModuleTags(module: TagModule): Promise<{ name: string; color: string | null }[]> {
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
  revalidatePath(PATHS[module].list);
  revalidatePath("/settings/tags");
  flashStay(formData, `/settings/tags?module=${module}`, "tag-color-saved");
}
