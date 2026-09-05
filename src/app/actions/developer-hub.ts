"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/auth/guards";
import { parseJsonInput } from "@/lib/developer-hub/runner";
import {
  createDeveloperConnection,
  createDeveloperFunction,
  createDeveloperWebhook,
  createInboundHook,
  createOrgApiKey,
  deleteDeveloperConnection,
  deleteDeveloperFunction,
  deleteDeveloperWebhook,
  deleteInboundHook,
  executeDeveloperFunction,
  getDeveloperFunction,
  getDeveloperWebhook,
  regenerateOrgApiKey,
  revokeOrgApiKey,
  sendWebhookTest,
  updateDeveloperConnection,
  updateDeveloperFunction,
  updateDeveloperWebhook,
} from "@/lib/developer-hub/store";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function bool(form: FormData, key: string) {
  const raw = form.get(key);
  return raw === "on" || raw === "1" || raw === "true";
}

function revalidateHub(extra?: string) {
  revalidatePath("/settings");
  revalidatePath("/settings/developer");
  revalidatePath("/settings/developer/functions");
  revalidatePath("/settings/developer/api-keys");
  revalidatePath("/settings/developer/webhooks");
  revalidatePath("/settings/developer/connections");
  if (extra) revalidatePath(extra);
}

export async function saveDeveloperFunction(formData: FormData) {
  const session = await requireAdminAction();
  const id = str(formData, "id");
  const payload = {
    name: str(formData, "name"),
    apiName: str(formData, "apiName"),
    description: str(formData, "description"),
    language: str(formData, "language"),
    category: str(formData, "category"),
    body: String(formData.get("body") ?? ""),
    exposeAsRest: bool(formData, "exposeAsRest"),
    exposeAsOauth: bool(formData, "exposeAsOauth"),
    connectionLinkName: str(formData, "connectionLinkName") || null,
  };
  try {
    if (id) {
      const row = await updateDeveloperFunction(id, payload);
      if (!row) redirect("/settings/developer/functions?error=missing");
      revalidateHub(`/settings/developer/functions/${id}`);
      redirect(`/settings/developer/functions/${id}?notice=saved`);
    }
    const row = await createDeveloperFunction({ ...payload, createdBy: session.userId });
    revalidateHub();
    redirect(`/settings/developer/functions/${row.id}?notice=created`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/settings/developer/functions?error=save");
  }
}

export async function removeDeveloperFunction(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteDeveloperFunction(id);
  revalidateHub();
  redirect("/settings/developer/functions?notice=deleted");
}

export async function runDeveloperFunctionTest(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const fn = id ? await getDeveloperFunction(id) : null;
  if (!fn) redirect("/settings/developer/functions?error=missing");
  const input = parseJsonInput(String(formData.get("input") ?? ""));
  await executeDeveloperFunction({ fn, input, source: "test" });
  revalidateHub(`/settings/developer/functions/${id}`);
  redirect(`/settings/developer/functions/${id}?notice=ran`);
}

export async function issueOrgApiKey(formData: FormData) {
  const session = await requireAdminAction();
  const { key, secret } = await createOrgApiKey(str(formData, "name"), session.userId);
  revalidateHub();
  redirect(
    `/settings/developer/api-keys?notice=created&keyId=${encodeURIComponent(key.id)}&secret=${encodeURIComponent(secret)}`,
  );
}

export async function rotateOrgApiKey(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const rotated = id ? await regenerateOrgApiKey(id) : null;
  if (!rotated) redirect("/settings/developer/api-keys?error=missing");
  revalidateHub();
  redirect(
    `/settings/developer/api-keys?notice=regenerated&keyId=${encodeURIComponent(rotated.key.id)}&secret=${encodeURIComponent(rotated.secret)}`,
  );
}

export async function retireOrgApiKey(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await revokeOrgApiKey(id);
  revalidateHub();
  redirect("/settings/developer/api-keys?notice=revoked");
}

export async function saveDeveloperWebhook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const payload = {
    name: str(formData, "name"),
    event: str(formData, "event"),
    targetUrl: str(formData, "targetUrl"),
    secret: str(formData, "secret"),
    enabled: bool(formData, "enabled"),
  };
  try {
    if (id) {
      const row = await updateDeveloperWebhook(id, payload);
      if (!row) redirect("/settings/developer/webhooks?error=missing");
      revalidateHub(`/settings/developer/webhooks/${id}`);
      redirect(`/settings/developer/webhooks/${id}?notice=saved`);
    }
    const row = await createDeveloperWebhook(payload);
    revalidateHub();
    redirect(`/settings/developer/webhooks/${row.id}?notice=created`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/settings/developer/webhooks?error=save");
  }
}

export async function removeDeveloperWebhook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteDeveloperWebhook(id);
  revalidateHub();
  redirect("/settings/developer/webhooks?notice=deleted");
}

export async function testDeveloperWebhook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  const hook = id ? await getDeveloperWebhook(id) : null;
  if (!hook) redirect("/settings/developer/webhooks?error=missing");
  const delivery = await sendWebhookTest(hook);
  const status = delivery?.status ?? "pending";
  revalidateHub(`/settings/developer/webhooks/${id}`);
  redirect(`/settings/developer/webhooks/${id}?notice=test&status=${encodeURIComponent(status)}`);
}

export async function saveInboundHook(formData: FormData) {
  await requireAdminAction();
  try {
    await createInboundHook(str(formData, "name"), str(formData, "slug"));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/settings/developer/webhooks?error=inbound");
  }
  revalidateHub();
  redirect("/settings/developer/webhooks?notice=inbound");
}

export async function removeInboundHook(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteInboundHook(id);
  revalidateHub();
  redirect("/settings/developer/webhooks?notice=inbound-deleted");
}

export async function saveDeveloperConnection(formData: FormData) {
  const session = await requireAdminAction();
  const id = str(formData, "id");
  const payload = {
    name: str(formData, "name"),
    linkName: str(formData, "linkName"),
    kind: str(formData, "kind"),
    status: str(formData, "status"),
    clientId: str(formData, "clientId"),
    clientSecret: str(formData, "clientSecret"),
    notes: str(formData, "notes"),
  };
  try {
    if (id) {
      const row = await updateDeveloperConnection(id, payload);
      if (!row) redirect("/settings/developer/connections?error=missing");
      revalidateHub(`/settings/developer/connections/${id}`);
      redirect(`/settings/developer/connections/${id}?notice=saved`);
    }
    const row = await createDeveloperConnection({ ...payload, createdBy: session.userId });
    revalidateHub();
    redirect(`/settings/developer/connections/${row.id}?notice=created`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    redirect("/settings/developer/connections?error=save");
  }
}

export async function removeDeveloperConnection(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "id");
  if (id) await deleteDeveloperConnection(id);
  revalidateHub();
  redirect("/settings/developer/connections?notice=deleted");
}
