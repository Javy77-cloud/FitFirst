"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  DEFAULT_TENANT_ID,
  EMAIL_DELAY_UNITS,
  EMAIL_TEMPLATE_KINDS,
  SEND_FROM_PROVIDERS,
  type EmailDelayUnit,
  type EmailTemplateKind,
  type SendFromProvider,
} from "@/lib/domain";
import { db } from "@/lib/db";
import { emailTemplates, emailTriggers } from "@/lib/db/schema";
import { getDeskActor, isAdminActor } from "@/lib/brand/desk-role";
import { markSendAccountDemoConnected } from "@/lib/templates/connectors";
import { processDueEmailJobs } from "@/lib/templates/send";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function bool(form: FormData, key: string) {
  const v = str(form, key);
  return v === "on" || v === "true" || v === "1";
}

function refreshTemplates(id?: string) {
  revalidatePath("/settings");
  revalidatePath("/settings/email-templates");
  revalidatePath("/settings/email-triggers");
  if (id) revalidatePath(`/settings/email-templates/${id}`);
}

function asKind(value: string): EmailTemplateKind {
  if ((EMAIL_TEMPLATE_KINDS as readonly string[]).includes(value)) {
    return value as EmailTemplateKind;
  }
  return "custom";
}

function asProvider(value: string): SendFromProvider {
  if ((SEND_FROM_PROVIDERS as readonly string[]).includes(value)) {
    return value as SendFromProvider;
  }
  return "google";
}

function asUnit(value: string): EmailDelayUnit {
  if ((EMAIL_DELAY_UNITS as readonly string[]).includes(value)) {
    return value as EmailDelayUnit;
  }
  return "days";
}

async function requireAdmin() {
  const actor = await getDeskActor();
  if (!isAdminActor(actor)) redirect("/settings/my-desk?error=admin-only");
}

export async function saveEmailTemplate(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const values = {
    name: str(formData, "name") || "Untitled template",
    slug: str(formData, "slug") || `template-${Date.now()}`,
    kind: asKind(str(formData, "kind")),
    subjectEn: str(formData, "subjectEn") || "(no subject)",
    bodyEn: str(formData, "bodyEn") || "",
    subjectEs: str(formData, "subjectEs") || "(sin asunto)",
    bodyEs: str(formData, "bodyEs") || "",
    isExampleCopy: bool(formData, "isExampleCopy"),
    updatedAt: new Date(),
  };

  if (id) {
    await db
      .update(emailTemplates)
      .set(values)
      .where(and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID), eq(emailTemplates.id, id)));
    refreshTemplates(id);
    return;
  }

  const [row] = await db
    .insert(emailTemplates)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      isSeeded: false,
      ...values,
    })
    .returning();
  refreshTemplates(row?.id);
  redirect(`/settings/email-templates/${row.id}`);
}

export async function duplicateEmailTemplate(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const [src] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID), eq(emailTemplates.id, id)));
  if (!src) throw new Error("Template not found");

  const [row] = await db
    .insert(emailTemplates)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      slug: `${src.slug}-copy-${Date.now().toString().slice(-4)}`,
      name: `${src.name} (copy)`,
      kind: src.kind,
      subjectEn: src.subjectEn,
      bodyEn: src.bodyEn,
      subjectEs: src.subjectEs,
      bodyEs: src.bodyEs,
      isSeeded: false,
      isExampleCopy: src.isExampleCopy,
    })
    .returning();

  refreshTemplates();
  redirect(`/settings/email-templates/${row.id}`);
}

export async function saveEmailTrigger(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  await db
    .update(emailTriggers)
    .set({
      enabled: bool(formData, "enabled"),
      delayAmount: Number(str(formData, "delayAmount") || 0) || 0,
      delayUnit: asUnit(str(formData, "delayUnit")),
      templateId: str(formData, "templateId"),
      sendFromProvider: asProvider(str(formData, "sendFromProvider")),
      emailClient: bool(formData, "emailClient"),
      createBrokerTask: bool(formData, "createBrokerTask"),
    })
    .where(and(eq(emailTriggers.tenantId, DEFAULT_TENANT_ID), eq(emailTriggers.id, id)));
  refreshTemplates();
}

export async function connectDemoInbox(formData: FormData) {
  const provider = asProvider(str(formData, "provider"));
  await markSendAccountDemoConnected(provider);
  await processDueEmailJobs();
  refreshTemplates();
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/policies");
}

export async function runDueEmailJobs() {
  await processDueEmailJobs();
  refreshTemplates();
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/policies");
}
