"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, deskModuleTags, leads, policies } from "@/lib/db/schema";
import { getActor } from "@/lib/auth/session";
import {
  isTagModule,
  normalizeTags,
  parseTagsFromForm,
  type TagModule,
} from "@/lib/tags/module-tags";

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
  await writeRecordTags(module, recordId, tags);
  const paths = PATHS[module];
  revalidatePath(paths.list);
  revalidatePath(paths.detail(recordId));
}

export async function writeRecordTags(module: TagModule, recordId: string, tags: string[]) {
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

export async function listModuleTagSuggestions(module: TagModule): Promise<string[]> {
  try {
    const rows = await db
      .select({ name: deskModuleTags.name })
      .from(deskModuleTags)
      .where(and(eq(deskModuleTags.tenantId, DEFAULT_TENANT_ID), eq(deskModuleTags.module, module)));
    return rows.map((row) => row.name);
  } catch {
    return [];
  }
}
