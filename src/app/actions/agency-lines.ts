"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  parseAgencyLineFamily,
  resolveAgencyLine,
  slugifyLineCode,
} from "@/lib/desk/agency-lines";
import { db } from "@/lib/db";
import {
  countRecordsForLine,
  ensureDefaultAgencyLines,
  loadAgencyLines,
  normalizeStoredLineOfBusiness,
  remapLineOfBusiness,
} from "@/lib/db/agency-lines";
import { agencyLines } from "@/lib/db/schema";
import { flashSettings } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function checked(form: FormData, key: string) {
  return form.get(key) === "true" || form.get(key) === "on";
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/settings/lines");
  revalidatePath("/settings/lists");
  revalidatePath("/settings/field-builder");
  revalidatePath("/deals");
  revalidatePath("/deals/new");
  revalidatePath("/policies");
  revalidatePath("/leads");
}

export async function addAgencyLine(formData: FormData) {
  await assertAdmin();
  await ensureDefaultAgencyLines();
  const label = str(formData, "label");
  if (!label) return;
  const family = parseAgencyLineFamily(str(formData, "family"));
  const code = slugifyLineCode(str(formData, "code") || label);
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${agencyLines.sortOrder}), -1) + 1` })
    .from(agencyLines)
    .where(eq(agencyLines.tenantId, DEFAULT_TENANT_ID));
  try {
    await db.insert(agencyLines).values({
      tenantId: DEFAULT_TENANT_ID,
      code,
      label,
      family,
      sortOrder: Number(n ?? 0),
      aliases: [],
      system: false,
      active: true,
    });
  } catch {
    // Unique (tenant, code) — keep the existing line.
  }
  refresh();
  await flashSettings("/settings/lines", "agency-line-saved");
}

export async function saveAgencyLine(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  const label = str(formData, "label");
  if (!id || !label) return;
  const family = parseAgencyLineFamily(str(formData, "family"));
  const active = checked(formData, "active");
  await db
    .update(agencyLines)
    .set({ label, family, active, updatedAt: new Date() })
    .where(and(eq(agencyLines.tenantId, DEFAULT_TENANT_ID), eq(agencyLines.id, id)));
  refresh();
  await flashSettings("/settings/lines", "agency-line-saved");
}

export async function deleteAgencyLine(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  if (!id) return;
  const [row] = await db
    .select()
    .from(agencyLines)
    .where(and(eq(agencyLines.tenantId, DEFAULT_TENANT_ID), eq(agencyLines.id, id)));
  if (!row || row.system) return;
  const usage = await countRecordsForLine(row.code);
  if (usage.deals + usage.policies > 0) return;
  await db
    .delete(agencyLines)
    .where(and(eq(agencyLines.tenantId, DEFAULT_TENANT_ID), eq(agencyLines.id, id)));
  refresh();
  await flashSettings("/settings/lines", "agency-line-deleted");
}

export async function adoptOrphanLine(formData: FormData) {
  await assertAdmin();
  await ensureDefaultAgencyLines();
  const raw = str(formData, "raw");
  if (!raw) return;
  const lines = await loadAgencyLines();
  if (resolveAgencyLine(raw, lines)) {
    refresh();
    return;
  }
  const family = parseAgencyLineFamily(str(formData, "family"));
  const code = slugifyLineCode(str(formData, "code") || raw);
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${agencyLines.sortOrder}), -1) + 1` })
    .from(agencyLines)
    .where(eq(agencyLines.tenantId, DEFAULT_TENANT_ID));
  try {
    await db.insert(agencyLines).values({
      tenantId: DEFAULT_TENANT_ID,
      code,
      label: raw,
      family,
      sortOrder: Number(n ?? 0),
      aliases: raw.toUpperCase() === code ? [] : [raw],
      system: false,
      active: true,
    });
  } catch {
    // Unique code — already on the list.
  }
  if (code !== raw) {
    await remapLineOfBusiness(raw, code);
  }
  refresh();
  await flashSettings("/settings/lines", "agency-line-adopted");
}

export async function mapOrphanLine(formData: FormData) {
  await assertAdmin();
  const raw = str(formData, "raw");
  const toCode = str(formData, "toCode");
  if (!raw || !toCode) return;
  const lines = await loadAgencyLines();
  const target = resolveAgencyLine(toCode, lines);
  if (!target) return;
  await remapLineOfBusiness(raw, target.code);
  refresh();
  await flashSettings("/settings/lines", "agency-line-mapped");
}

export async function normalizeAgencyLineOrphans() {
  await assertAdmin();
  await normalizeStoredLineOfBusiness();
  refresh();
  await flashSettings("/settings/lines", "agency-lines-normalized");
}
