"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  AGENCY_BRAND,
  COLOR_PRESETS,
  DEFAULT_TENANT_ID,
  DESK_ROLES,
  DENSITY_PRESETS,
  EMAIL_JOB_HOLD,
  FONT_PRESETS,
  LIST_COLUMN_CATALOG,
  type ColorPreset,
  type ColumnLayout,
  type DensityPreset,
  type DeskRole,
  type FontPreset,
} from "@/lib/domain";
import { requireSignedInAction } from "@/lib/auth/guards";
import { mergeOneList } from "@/lib/brand/column-layout";
import { DESK_ROLE_COOKIE, getDeskActor, isAdminActor } from "@/lib/brand/desk-role";
import { db } from "@/lib/db";
import { agencyBrand, agentUiPrefs, emailSendJobs, emailSignatures } from "@/lib/db/schema";
import { previewMergedSignature } from "@/lib/templates/signature-html";
import { AGENCY_BRAND_ID, AGENT_PREF_IDS } from "@/lib/fixtures/ids";
import { flashSettings } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshBrand() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/settings/agency");
  revalidatePath("/settings/my-desk");
  revalidatePath("/settings/email-templates");
  revalidatePath("/settings/email-signatures");
  revalidatePath("/automations");
  revalidatePath("/automations/signatures");
  revalidatePath("/settings/email-triggers");
  revalidatePath("/leads");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/policies");
}

async function requireAdmin() {
  const actor = await getDeskActor();
  if (!isAdminActor(actor)) {
    redirect("/settings/my-desk?error=admin-only");
  }
  return actor;
}

function asColor(value: string): ColorPreset {
  return (COLOR_PRESETS as readonly string[]).includes(value)
    ? (value as ColorPreset)
    : "agency";
}
function asFont(value: string): FontPreset {
  return (FONT_PRESETS as readonly string[]).includes(value) ? (value as FontPreset) : "plex";
}
function asDensity(value: string): DensityPreset {
  return (DENSITY_PRESETS as readonly string[]).includes(value)
    ? (value as DensityPreset)
    : "comfortable";
}

function layoutFromForm(form: FormData, prefix: string): ColumnLayout {
  const layout: ColumnLayout = {};
  for (const listKey of Object.keys(LIST_COLUMN_CATALOG)) {
    const raw = form.getAll(`${prefix}${listKey}`);
    const keys = raw.map((v) => String(v)).filter(Boolean);
    if (keys.length > 0) layout[listKey] = keys;
  }
  return layout;
}

export async function switchDeskRole(formData: FormData) {
  const role = str(formData, "role");
  const next: DeskRole = (DESK_ROLES as readonly string[]).includes(role)
    ? (role as DeskRole)
    : "admin";
  const jar = await cookies();
  jar.set(DESK_ROLE_COOKIE, next, { path: "/", sameSite: "lax" });
  refreshBrand();
}

export async function saveAgencyBrand(formData: FormData) {
  await requireAdmin();
  const values = {
    agencyName: str(formData, "agencyName") || AGENCY_BRAND.name,
    defaultColorPreset: asColor(str(formData, "defaultColorPreset")),
    defaultFontPreset: asFont(str(formData, "defaultFontPreset")),
    defaultDensity: asDensity(str(formData, "defaultDensity")),
    defaultColumnLayout: layoutFromForm(formData, "agencyCol_"),
    updatedAt: new Date(),
  };
  const [existing] = await db
    .select()
    .from(agencyBrand)
    .where(eq(agencyBrand.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db.update(agencyBrand).set(values).where(eq(agencyBrand.id, existing.id));
  } else {
    await db.insert(agencyBrand).values({
      id: AGENCY_BRAND_ID,
      tenantId: DEFAULT_TENANT_ID,
      ...values,
    });
  }
  refreshBrand();
  await flashSettings("/settings/agency", "brand-saved");
}

export async function uploadAgencyLogo(formData: FormData) {
  await requireAdmin();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/settings/agency?error=choose-logo");
  }
  if (file.size > 1_500_000) {
    redirect("/settings/agency?error=logo-too-large");
  }
  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/") && mime !== "image/svg+xml") {
    redirect("/settings/agency?error=logo-type");
  }
  const ext = mime.includes("svg")
    ? "svg"
    : mime.includes("png")
      ? "png"
      : mime.includes("webp")
        ? "webp"
        : "jpg";
  const rel = path.join(DEFAULT_TENANT_ID, "brand", `logo.${ext}`);
  const abs = path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));

  const [existing] = await db
    .select()
    .from(agencyBrand)
    .where(eq(agencyBrand.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(agencyBrand)
      .set({ logoStoragePath: rel, logoMime: mime, updatedAt: new Date() })
      .where(eq(agencyBrand.id, existing.id));
  }
  refreshBrand();
}

export async function deleteAgencyLogo() {
  await requireAdmin();
  const [existing] = await db
    .select()
    .from(agencyBrand)
    .where(eq(agencyBrand.tenantId, DEFAULT_TENANT_ID));
  if (!existing?.logoStoragePath) return;
  try {
    await unlink(
      path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"), existing.logoStoragePath),
    );
  } catch {
    // Clear the pointer even if the file is already gone.
  }
  await db
    .update(agencyBrand)
    .set({ logoStoragePath: null, logoMime: null, updatedAt: new Date() })
    .where(eq(agencyBrand.id, existing.id));
  refreshBrand();
}

export async function saveEmailSignature(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const values = {
    name: str(formData, "name") || "Agency signature",
    bodyEn: str(formData, "bodyEn") || "",
    bodyEs: str(formData, "bodyEs") || "",
    isExampleCopy: str(formData, "isExampleCopy") === "true",
    updatedAt: new Date(),
  };
  if (id) {
    await db
      .update(emailSignatures)
      .set(values)
      .where(and(eq(emailSignatures.tenantId, DEFAULT_TENANT_ID), eq(emailSignatures.id, id)));
  } else {
    await db.insert(emailSignatures).values({
      tenantId: DEFAULT_TENANT_ID,
      isDefault: true,
      ...values,
    });
  }
  refreshBrand();
  await flashSettings("/settings/email-signatures", "signature-saved");
}

export async function testSendEmailSignature(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.isAdmin) throw new Error("Admin only.");
  const locale = str(formData, "locale") === "es" ? "es" : "en";
  const body = locale === "es" ? str(formData, "bodyEs") : str(formData, "bodyEn");
  const preview = previewMergedSignature(body);
  const now = new Date();
  await db.insert(emailSendJobs).values({
    tenantId: DEFAULT_TENANT_ID,
    anchorKind: "signature_test",
    anchorAt: now,
    scheduledFor: now,
    status: "queued",
    toEmail: session.email,
    subject: "FitFirst signature test",
    body: preview,
    holdReason: EMAIL_JOB_HOLD,
    locale,
  });
  refreshBrand();
  await flashSettings("/settings/email-signatures", "signature-test-queued");
}

export async function saveMyDeskPrefs(formData: FormData) {
  const actor = await getDeskActor();
  const inherit = str(formData, "inheritAgency") === "true";
  const values = {
    colorPreset: inherit ? null : asColor(str(formData, "colorPreset")),
    fontPreset: inherit ? null : asFont(str(formData, "fontPreset")),
    density: inherit ? null : asDensity(str(formData, "density")),
    columnLayout: inherit ? null : layoutFromForm(formData, "agentCol_"),
    updatedAt: new Date(),
  };
  const [existing] = await db
    .select()
    .from(agentUiPrefs)
    .where(
      and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, actor.key)),
    );
  if (existing) {
    await db.update(agentUiPrefs).set(values).where(eq(agentUiPrefs.id, existing.id));
  } else {
    await db.insert(agentUiPrefs).values({
      id: actor.key === "admin" ? AGENT_PREF_IDS.admin : AGENT_PREF_IDS.agent,
      tenantId: DEFAULT_TENANT_ID,
      actorKey: actor.key,
      ...values,
    });
  }
  refreshBrand();
  await flashSettings("/settings/my-desk", "desk-saved");
}

/**
 * Persist one list's column keys. CRM UI picker (bc-1fc5b3be) should call this
 * instead of creating a second picker/store.
 * - Admin saving agency default → agency_brand.default_column_layout
 * - Anyone saving their desk → agent_ui_prefs.column_layout for that actor
 */
export async function saveListColumnLayout(formData: FormData) {
  const listKey = str(formData, "listKey");
  const scope = str(formData, "scope") === "agency" ? "agency" : "agent";
  const keys = formData.getAll("keys").map((v) => String(v)).filter(Boolean);
  if (!LIST_COLUMN_CATALOG[listKey]) return;

  if (scope === "agency") {
    await requireAdmin();
    const [existing] = await db
      .select()
      .from(agencyBrand)
      .where(eq(agencyBrand.tenantId, DEFAULT_TENANT_ID));
    const next = mergeOneList(existing?.defaultColumnLayout, listKey, keys);
    if (existing) {
      await db
        .update(agencyBrand)
        .set({ defaultColumnLayout: next, updatedAt: new Date() })
        .where(eq(agencyBrand.id, existing.id));
    }
    refreshBrand();
    return;
  }

  const actor = await getDeskActor();
  const [existing] = await db
    .select()
    .from(agentUiPrefs)
    .where(
      and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, actor.key)),
    );
  const next = mergeOneList(existing?.columnLayout, listKey, keys);
  if (existing) {
    await db
      .update(agentUiPrefs)
      .set({ columnLayout: next, updatedAt: new Date() })
      .where(eq(agentUiPrefs.id, existing.id));
  } else {
    await db.insert(agentUiPrefs).values({
      id: actor.key === "admin" ? AGENT_PREF_IDS.admin : AGENT_PREF_IDS.agent,
      tenantId: DEFAULT_TENANT_ID,
      actorKey: actor.key,
      columnLayout: next,
    });
  }
  refreshBrand();
}
