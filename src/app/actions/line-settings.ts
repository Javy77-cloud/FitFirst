"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  defaultFamilyForLobCode,
  isAgencyLobFamily,
  resolveSheetProduct,
  slugifyAgencyLob,
} from "@/lib/desk/agency-lobs";
import { slugifySubfilter } from "@/lib/desk/line-settings";
import { db } from "@/lib/db";
import { agencyLobs, agencySettings, lineSubfilterOptions } from "@/lib/db/schema";
import { ensureDefaultAgencyLobs, ensureDefaultLineSubfilters } from "@/lib/db/line-settings";
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
  revalidatePath("/deals");
  revalidatePath("/policies");
  revalidatePath("/deals");
  revalidatePath("/deals/new");
  revalidatePath("/carriers");
  revalidatePath("/forms");
  revalidatePath("/documents");
  revalidatePath("/");
}

export async function addAgencyLob(formData: FormData) {
  await assertAdmin();
  await ensureDefaultAgencyLobs();
  const label = str(formData, "label");
  if (!label) return;
  const family = isAgencyLobFamily(str(formData, "family"))
    ? str(formData, "family")
    : defaultFamilyForLobCode(str(formData, "lobCode"));
  const lobCode = (str(formData, "lobCode") || label).trim().toUpperCase().replace(/\s+/g, "_").slice(0, 24);
  const productId = slugifyAgencyLob(str(formData, "productId") || label);
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${agencyLobs.sortOrder}), -1) + 1` })
    .from(agencyLobs)
    .where(eq(agencyLobs.tenantId, DEFAULT_TENANT_ID));
  try {
    await db.insert(agencyLobs).values({
      tenantId: DEFAULT_TENANT_ID,
      productId,
      label,
      lobCode: lobCode || "HO",
      family,
      sheetProduct: resolveSheetProduct(str(formData, "sheetProduct") || null),
      quotingForm: str(formData, "quotingForm") || label,
      active: true,
      builtIn: false,
      sortOrder: Number(n ?? 0),
    });
  } catch {
    // Unique (tenant, product_id) — keep the existing line.
  }
  refresh();
}

export async function updateAgencyLob(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  const label = str(formData, "label");
  if (!id || !label) return;
  await db
    .update(agencyLobs)
    .set({
      label,
      lobCode: (str(formData, "lobCode") || label).trim().toUpperCase().slice(0, 24),
      family: isAgencyLobFamily(str(formData, "family")) ? str(formData, "family") : "personal",
      active: checked(formData, "active"),
      updatedAt: new Date(),
    })
    .where(and(eq(agencyLobs.tenantId, DEFAULT_TENANT_ID), eq(agencyLobs.id, id)));
  refresh();
}

export async function toggleAgencyLob(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  if (!id) return;
  const [row] = await db
    .select({ active: agencyLobs.active })
    .from(agencyLobs)
    .where(and(eq(agencyLobs.tenantId, DEFAULT_TENANT_ID), eq(agencyLobs.id, id)));
  if (!row) return;
  await db
    .update(agencyLobs)
    .set({ active: !row.active, updatedAt: new Date() })
    .where(and(eq(agencyLobs.tenantId, DEFAULT_TENANT_ID), eq(agencyLobs.id, id)));
  refresh();
}

export async function deleteAgencyLob(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  if (!id) return;
  await db
    .delete(agencyLobs)
    .where(
      and(
        eq(agencyLobs.tenantId, DEFAULT_TENANT_ID),
        eq(agencyLobs.id, id),
        eq(agencyLobs.builtIn, false),
      ),
    );
  refresh();
}

export async function saveWrittenLines(formData: FormData) {
  await assertAdmin();
  await ensureDefaultLineSubfilters();
  const writeLife = checked(formData, "writeLife");
  const writeHealth = checked(formData, "writeHealth");
  const showSellingAgency = checked(formData, "showSellingAgency");
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(agencySettings)
      .set({ writeLife, writeHealth, showSellingAgency, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      tenantId: DEFAULT_TENANT_ID,
      writeLife,
      writeHealth,
      showSellingAgency,
    });
  }
  refresh();
  await flashSettings("/settings/lines", "line-settings-saved");
}

export async function addLineSubfilter(formData: FormData) {
  await assertAdmin();
  await ensureDefaultLineSubfilters();
  const book = str(formData, "book") === "health" ? "health" : "life";
  const label = str(formData, "label");
  if (!label) return;
  const slug = slugifySubfilter(str(formData, "slug") || label);
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${lineSubfilterOptions.sortOrder}), -1) + 1` })
    .from(lineSubfilterOptions)
    .where(
      and(eq(lineSubfilterOptions.tenantId, DEFAULT_TENANT_ID), eq(lineSubfilterOptions.book, book)),
    );
  try {
    await db.insert(lineSubfilterOptions).values({
      tenantId: DEFAULT_TENANT_ID,
      book,
      slug,
      label,
      sortOrder: Number(n ?? 0),
    });
  } catch {
    // Unique (tenant, book, slug) — keep the existing chip.
  }
  refresh();
}

export async function deleteLineSubfilter(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  if (!id) return;
  await db
    .delete(lineSubfilterOptions)
    .where(and(eq(lineSubfilterOptions.tenantId, DEFAULT_TENANT_ID), eq(lineSubfilterOptions.id, id)));
  refresh();
}

