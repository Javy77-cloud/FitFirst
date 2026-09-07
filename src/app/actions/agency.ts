"use server";

import { revalidatePath } from "next/cache";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings, emailTemplates } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
}

export async function saveAgencyBrand(formData: FormData) {
  await assertAdmin();
  const [existing] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  const patch = {
    agencyName: str(formData, "agencyName") || null,
    emailSignature: str(formData, "emailSignature") || null,
    fiscalYearStartMonth: Number(str(formData, "fiscalYearStartMonth") || "1") || 1,
  };
  if (existing) {
    await db.update(agencySettings).set(patch).where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      ...patch,
    });
  }
  revalidatePath("/");
  revalidatePath("/settings");
  flashAction("/settings", "brand-saved");
}

export async function uploadAgencyLogo(formData: FormData) {
  await assertAdmin();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return;
  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const safe = [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext) ? ext : ".png";
  const rel = `agency/logo${safe}`;
  const dest = path.join(process.cwd(), "public", rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  const [existing] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db.update(agencySettings).set({ logoPath: rel }).where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      logoPath: rel,
    });
  }
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function deleteAgencyLogo() {
  await assertAdmin();
  const [existing] = await db
    .select()
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  if (!existing?.logoPath) return;
  try {
    await unlink(path.join(process.cwd(), "public", existing.logoPath));
  } catch {
    // Clear the pointer even if the file is already gone.
  }
  await db.update(agencySettings).set({ logoPath: null }).where(eq(agencySettings.id, existing.id));
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function saveEmailTemplate(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  if (!id) return;
  await db
    .update(emailTemplates)
    .set({
      name: str(formData, "name") || "Template",
      subject: str(formData, "subject") || "",
      body: str(formData, "body") || "",
      updatedAt: new Date(),
    })
    .where(and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID), eq(emailTemplates.id, id)));
  revalidatePath("/settings");
  flashAction("/settings", "template-saved");
}
