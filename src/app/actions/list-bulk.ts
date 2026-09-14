"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { listModuleTags, writeRecordTags } from "@/app/actions/record-tags";
import { csvFilename } from "@/lib/api/v1/csv";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  alerts,
  carriers,
  contacts,
  deals,
  leads,
  policies,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import { dealTransferNotification } from "@/lib/deals/transfer";
import { packFor } from "@/lib/import-export/catalog";
import { objectsToCsv } from "@/lib/import-export/csv";
import { exportRows } from "@/lib/import-export/export";
import { isUuid } from "@/lib/ids";
import {
  applyMassTagMode,
  canMassAssignOwner,
  importEntityForCrmList,
  massAssignBlockedReason,
  tagModuleForCrmList,
  type MassTagMode,
} from "@/lib/lists/list-bulk";
import {
  isCrmListModule,
  moduleListHref,
  recordDetailHref,
  type CrmListModule,
} from "@/lib/lists/selection-actions";
import { assignFromCatalog } from "@/lib/tags/manage";
import { normalizeTags, parseTagsFromForm, type TagModule } from "@/lib/tags/module-tags";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function moduleFrom(form: FormData): CrmListModule | null {
  const value = str(form, "module");
  return isCrmListModule(value) ? value : null;
}

function idsFrom(form: FormData): string[] {
  const many = form.getAll("recordId").map((v) => String(v).trim()).filter(Boolean);
  const csv = str(form, "recordIds");
  const fromCsv = csv ? csv.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return [...new Set([...many, ...fromCsv].filter((id) => isUuid(id)))];
}

function revalidateList(module: CrmListModule, ids: string[]) {
  revalidatePath(moduleListHref(module));
  for (const id of ids.slice(0, 40)) {
    revalidatePath(recordDetailHref(module, id));
  }
}

async function readRecordTags(tagModule: TagModule, recordId: string): Promise<string[]> {
  if (tagModule === "leads") {
    const [row] = await db
      .select({ tags: leads.tags })
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, recordId)));
    return normalizeTags(row?.tags);
  }
  if (tagModule === "contacts") {
    const [row] = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, recordId)));
    return normalizeTags(row?.tags);
  }
  if (tagModule === "deals") {
    const [row] = await db
      .select({ tags: deals.tags })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, recordId)));
    return normalizeTags(row?.tags);
  }
  if (tagModule === "accounts") {
    const [row] = await db
      .select({ tags: accounts.tags })
      .from(accounts)
      .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, recordId)));
    return normalizeTags(row?.tags);
  }
  if (tagModule === "carriers") {
    const [row] = await db
      .select({ tags: carriers.tags })
      .from(carriers)
      .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, recordId)));
    return normalizeTags(row?.tags);
  }
  if (tagModule === "tasks") {
    const [row] = await db
      .select({ tags: reviewTasks.tags })
      .from(reviewTasks)
      .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, recordId)));
    return normalizeTags(row?.tags);
  }
  const [row] = await db
    .select({ tags: policies.tags })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, recordId)));
  return normalizeTags(row?.tags);
}

export async function applyMassTags(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return { ok: false, message: "Sign in to mass-tag." };

  const module = moduleFrom(formData);
  if (!module) return { ok: false, message: "Unknown list module." };
  const tagModule = tagModuleForCrmList(module);
  if (!tagModule) return { ok: false, message: "Tags are not on this list." };

  const ids = idsFrom(formData);
  if (ids.length === 0) return { ok: false, message: "Select rows first." };

  const modeRaw = str(formData, "mode") || "add";
  const mode: MassTagMode = modeRaw === "replace" ? "replace" : "add";
  const catalog = await listModuleTags(tagModule);
  const picked = assignFromCatalog(
    parseTagsFromForm(formData),
    catalog.map((row) => row.name),
  );
  if (mode === "add" && picked.length === 0) {
    return { ok: false, message: "Pick at least one tag to add." };
  }

  for (const id of ids) {
    const current = await readRecordTags(tagModule, id);
    const next = applyMassTagMode(current, picked, mode);
    await writeRecordTags(tagModule, id, next);
  }

  revalidateList(module, ids);
  return {
    ok: true,
    message: `${mode === "replace" ? "Replaced" : "Added"} tags on ${ids.length} ${
      ids.length === 1 ? "row" : "rows"
    }.`,
  };
}

export async function exportSelectedCsv(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  csv?: string;
  filename?: string;
}> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, message: "Sign in to export." };

  const module = moduleFrom(formData);
  if (!module) return { ok: false, message: "Unknown list module." };
  const entity = importEntityForCrmList(module);
  if (!entity) return { ok: false, message: "CSV export is not on this list." };

  const ids = idsFrom(formData);
  if (ids.length === 0) {
    return { ok: false, message: "Select rows or keep the filtered list loaded." };
  }

  const pack = packFor(entity);
  if (!pack) return { ok: false, message: "Unknown export pack." };

  const all = await exportRows(entity);
  const idSet = new Set(ids);
  const rows = all.filter((row) => idSet.has(String(row.id ?? "")));
  if (rows.length === 0) {
    return { ok: false, message: "No exportable rows matched the selection." };
  }

  return {
    ok: true,
    message: `Exported ${rows.length} ${rows.length === 1 ? "row" : "rows"}.`,
    csv: objectsToCsv(pack.headers, rows),
    filename: csvFilename(`${entity}-selected`),
  };
}

export async function assignSelectedOwner(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return { ok: false, message: "Sign in to assign." };

  const module = moduleFrom(formData);
  if (!module) return { ok: false, message: "Unknown list module." };
  const blocked = massAssignBlockedReason(module);
  if (blocked) return { ok: false, message: blocked };
  if (!canMassAssignOwner(module)) return { ok: false, message: "Assign is not on this list." };

  const ids = idsFrom(formData);
  if (ids.length === 0) return { ok: false, message: "Select rows first." };

  const ownerId = str(formData, "ownerId");
  if (!isUuid(ownerId)) return { ok: false, message: "Pick an owner." };
  const [owner] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, ownerId)));
  if (!owner) return { ok: false, message: "Owner not found." };

  const patch = { ownerId: owner.id, updatedAt: new Date() };
  if (module === "leads") {
    await db
      .update(leads)
      .set(patch)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), inArray(leads.id, ids)));
  } else if (module === "contacts") {
    await db
      .update(contacts)
      .set(patch)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, ids)));
  } else if (module === "policies") {
    await db
      .update(policies)
      .set(patch)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, ids)));
  } else if (module === "deals") {
    const rows = await db
      .select({ id: deals.id, title: deals.title })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    await db
      .update(deals)
      .set(patch)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), inArray(deals.id, ids)));
    if (owner.id !== session.userId) {
      for (const row of rows) {
        const ping = dealTransferNotification({ dealTitle: row.title, fromName: session.name });
        await db.insert(alerts).values({
          tenantId: DEFAULT_TENANT_ID,
          kind: "deal_transfer",
          title: ping.title,
          body: ping.body,
          severity: "info",
          entityType: "deal",
          entityId: row.id,
          userId: owner.id,
          recipientUserId: owner.id,
        });
      }
    }
  }

  revalidateList(module, ids);
  return {
    ok: true,
    message: `Assigned ${owner.name} on ${ids.length} ${ids.length === 1 ? "row" : "rows"}.`,
  };
}
