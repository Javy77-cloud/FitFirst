"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { slugifySubfilter } from "@/lib/desk/line-settings";
import { db } from "@/lib/db";
import { agencySettings, lineSubfilterOptions } from "@/lib/db/schema";
import { ensureDefaultLineSubfilters } from "@/lib/db/line-settings";

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
  revalidatePath("/");
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

