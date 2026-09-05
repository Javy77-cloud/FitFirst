import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import {
  developerConnections,
  developerFunctionExecutions,
  developerFunctions,
  developerInboundHooks,
  developerInboundPayloads,
  developerOrgApiKeys,
  developerWebhookDeliveries,
  developerWebhooks,
  type DeveloperConnection,
  type DeveloperFunction,
  type DeveloperInboundHook,
  type DeveloperOrgApiKey,
  type DeveloperWebhook,
} from "@/lib/db/schema";
import { encryptSecret, isMaskedSecretInput } from "@/lib/secrets/vault";
import { attemptWebhookDelivery } from "./events";
import { generateOrgApiKey, hashOrgApiKey, prefixFromSecret } from "./keys";
import { parseJsonInput, runFunctionBody } from "./runner";
import {
  isConnectionKind,
  isFunctionCategory,
  isFunctionLanguage,
  isWebhookEvent,
  slugifyApiName,
  slugifyLinkName,
  type FunctionCategory,
} from "./types";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export async function listDeveloperFunctions(category?: string | null) {
  const filters = [eq(developerFunctions.tenantId, tenant())];
  if (category && isFunctionCategory(category)) {
    filters.push(eq(developerFunctions.category, category));
  }
  return db
    .select()
    .from(developerFunctions)
    .where(and(...filters))
    .orderBy(developerFunctions.name);
}

export async function getDeveloperFunction(id: string) {
  const [row] = await db
    .select()
    .from(developerFunctions)
    .where(and(eq(developerFunctions.tenantId, tenant()), eq(developerFunctions.id, id)));
  return row ?? null;
}

export async function getDeveloperFunctionByApiName(apiName: string) {
  const [row] = await db
    .select()
    .from(developerFunctions)
    .where(and(eq(developerFunctions.tenantId, tenant()), eq(developerFunctions.apiName, apiName)));
  return row ?? null;
}

export async function createDeveloperFunction(input: {
  name: string;
  apiName?: string;
  description?: string;
  language?: string;
  category?: string;
  body?: string;
  exposeAsRest?: boolean;
  exposeAsOauth?: boolean;
  connectionLinkName?: string | null;
  createdBy?: string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  const apiName = slugifyApiName(input.apiName || name);
  const [row] = await db
    .insert(developerFunctions)
    .values({
      tenantId: tenant(),
      name,
      apiName,
      description: input.description?.trim() || null,
      language: isFunctionLanguage(input.language ?? "") ? input.language : "typescript",
      category: isFunctionCategory(input.category ?? "") ? input.category : "standalone",
      body: input.body ?? "",
      exposeAsRest: Boolean(input.exposeAsRest),
      exposeAsOauth: Boolean(input.exposeAsOauth),
      connectionLinkName: input.connectionLinkName?.trim() || null,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function updateDeveloperFunction(
  id: string,
  input: {
    name: string;
    apiName?: string;
    description?: string;
    language?: string;
    category?: string;
    body?: string;
    exposeAsRest?: boolean;
    exposeAsOauth?: boolean;
    connectionLinkName?: string | null;
  },
) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  const [row] = await db
    .update(developerFunctions)
    .set({
      name,
      apiName: slugifyApiName(input.apiName || name),
      description: input.description?.trim() || null,
      language: isFunctionLanguage(input.language ?? "") ? input.language : "typescript",
      category: isFunctionCategory(input.category ?? "") ? input.category : "standalone",
      body: input.body ?? "",
      exposeAsRest: Boolean(input.exposeAsRest),
      exposeAsOauth: Boolean(input.exposeAsOauth),
      connectionLinkName: input.connectionLinkName?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(developerFunctions.tenantId, tenant()), eq(developerFunctions.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteDeveloperFunction(id: string) {
  await db
    .delete(developerFunctionExecutions)
    .where(
      and(eq(developerFunctionExecutions.tenantId, tenant()), eq(developerFunctionExecutions.functionId, id)),
    );
  await db
    .delete(developerFunctions)
    .where(and(eq(developerFunctions.tenantId, tenant()), eq(developerFunctions.id, id)));
}

export async function listFunctionExecutions(functionId: string, limit = 20) {
  return db
    .select()
    .from(developerFunctionExecutions)
    .where(
      and(
        eq(developerFunctionExecutions.tenantId, tenant()),
        eq(developerFunctionExecutions.functionId, functionId),
      ),
    )
    .orderBy(desc(developerFunctionExecutions.createdAt))
    .limit(limit);
}

export async function executeDeveloperFunction(opts: {
  fn: DeveloperFunction;
  input: unknown;
  source: "test" | "rest" | "oauth_stub";
}) {
  const result = runFunctionBody(opts.fn.body, opts.input);
  const [log] = await db
    .insert(developerFunctionExecutions)
    .values({
      tenantId: tenant(),
      functionId: opts.fn.id,
      source: opts.source,
      status: result.ok ? "ok" : "error",
      input: opts.input ?? {},
      output: result.output ?? {},
      error: result.error ?? null,
    })
    .returning();
  return { result, log };
}

export async function listOrgApiKeys() {
  return db
    .select()
    .from(developerOrgApiKeys)
    .where(eq(developerOrgApiKeys.tenantId, tenant()))
    .orderBy(desc(developerOrgApiKeys.createdAt));
}

export async function createOrgApiKey(name: string, createdBy?: string | null) {
  const label = name.trim() || "Desk key";
  const generated = generateOrgApiKey();
  const [row] = await db
    .insert(developerOrgApiKeys)
    .values({
      tenantId: tenant(),
      name: label,
      prefix: generated.prefix,
      secretHash: hashOrgApiKey(generated.secret),
      createdBy: createdBy ?? null,
    })
    .returning();
  return { key: row, secret: generated.secret };
}

export async function regenerateOrgApiKey(id: string) {
  const generated = generateOrgApiKey();
  const [row] = await db
    .update(developerOrgApiKeys)
    .set({
      prefix: generated.prefix,
      secretHash: hashOrgApiKey(generated.secret),
      revokedAt: null,
      lastUsedAt: null,
    })
    .where(and(eq(developerOrgApiKeys.tenantId, tenant()), eq(developerOrgApiKeys.id, id)))
    .returning();
  if (!row) return null;
  return { key: row, secret: generated.secret };
}

export async function revokeOrgApiKey(id: string) {
  const [row] = await db
    .update(developerOrgApiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(developerOrgApiKeys.tenantId, tenant()), eq(developerOrgApiKeys.id, id)))
    .returning();
  return row ?? null;
}

export async function verifyOrgApiKey(secret: string): Promise<DeveloperOrgApiKey | null> {
  const hash = hashOrgApiKey(secret);
  const [row] = await db
    .select()
    .from(developerOrgApiKeys)
    .where(and(eq(developerOrgApiKeys.tenantId, tenant()), eq(developerOrgApiKeys.secretHash, hash)));
  if (!row || row.revokedAt) return null;
  await db
    .update(developerOrgApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(developerOrgApiKeys.id, row.id));
  return row;
}

export async function listDeveloperWebhooks() {
  return db
    .select()
    .from(developerWebhooks)
    .where(eq(developerWebhooks.tenantId, tenant()))
    .orderBy(developerWebhooks.name);
}

export async function getDeveloperWebhook(id: string) {
  const [row] = await db
    .select()
    .from(developerWebhooks)
    .where(and(eq(developerWebhooks.tenantId, tenant()), eq(developerWebhooks.id, id)));
  return row ?? null;
}

export async function createDeveloperWebhook(input: {
  name: string;
  event: string;
  targetUrl: string;
  secret?: string;
  enabled?: boolean;
}) {
  const name = input.name.trim();
  const targetUrl = input.targetUrl.trim();
  if (!name) throw new Error("Name is required.");
  if (!targetUrl) throw new Error("Target URL is required.");
  if (!isWebhookEvent(input.event)) throw new Error("Unknown desk event.");
  const [row] = await db
    .insert(developerWebhooks)
    .values({
      tenantId: tenant(),
      name,
      event: input.event,
      targetUrl,
      secret: input.secret?.trim() || null,
      enabled: input.enabled !== false,
    })
    .returning();
  return row;
}

export async function updateDeveloperWebhook(
  id: string,
  input: {
    name: string;
    event: string;
    targetUrl: string;
    secret?: string;
    enabled?: boolean;
  },
) {
  const name = input.name.trim();
  const targetUrl = input.targetUrl.trim();
  if (!name) throw new Error("Name is required.");
  if (!targetUrl) throw new Error("Target URL is required.");
  if (!isWebhookEvent(input.event)) throw new Error("Unknown desk event.");
  const [row] = await db
    .update(developerWebhooks)
    .set({
      name,
      event: input.event,
      targetUrl,
      secret: input.secret?.trim() || null,
      enabled: input.enabled !== false,
      updatedAt: new Date(),
    })
    .where(and(eq(developerWebhooks.tenantId, tenant()), eq(developerWebhooks.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteDeveloperWebhook(id: string) {
  await db
    .delete(developerWebhookDeliveries)
    .where(
      and(eq(developerWebhookDeliveries.tenantId, tenant()), eq(developerWebhookDeliveries.webhookId, id)),
    );
  await db
    .delete(developerWebhooks)
    .where(and(eq(developerWebhooks.tenantId, tenant()), eq(developerWebhooks.id, id)));
}

export async function listWebhookDeliveries(webhookId: string, limit = 25) {
  return db
    .select()
    .from(developerWebhookDeliveries)
    .where(
      and(
        eq(developerWebhookDeliveries.tenantId, tenant()),
        eq(developerWebhookDeliveries.webhookId, webhookId),
      ),
    )
    .orderBy(desc(developerWebhookDeliveries.createdAt))
    .limit(limit);
}

export async function sendWebhookTest(webhook: DeveloperWebhook) {
  const [delivery] = await db
    .insert(developerWebhookDeliveries)
    .values({
      tenantId: tenant(),
      webhookId: webhook.id,
      event: webhook.event,
      payload: {
        event: webhook.event,
        test: true,
        source: "developer_hub",
        at: new Date().toISOString(),
      },
      status: "pending",
    })
    .returning();
  if (!delivery) return null;
  return attemptWebhookDelivery(delivery.id, webhook.targetUrl, webhook.secret);
}

export async function listInboundHooks() {
  return db
    .select()
    .from(developerInboundHooks)
    .where(eq(developerInboundHooks.tenantId, tenant()))
    .orderBy(developerInboundHooks.name);
}

export async function getInboundHookBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(developerInboundHooks)
    .where(and(eq(developerInboundHooks.tenantId, tenant()), eq(developerInboundHooks.slug, slug)));
  return row ?? null;
}

export async function createInboundHook(name: string, slug: string) {
  const label = name.trim();
  const clean = slugifyApiName(slug || label);
  if (!label) throw new Error("Name is required.");
  const [row] = await db
    .insert(developerInboundHooks)
    .values({
      tenantId: tenant(),
      name: label,
      slug: clean,
      enabled: true,
    })
    .returning();
  return row;
}

export async function deleteInboundHook(id: string) {
  await db
    .delete(developerInboundPayloads)
    .where(and(eq(developerInboundPayloads.tenantId, tenant()), eq(developerInboundPayloads.hookId, id)));
  await db
    .delete(developerInboundHooks)
    .where(and(eq(developerInboundHooks.tenantId, tenant()), eq(developerInboundHooks.id, id)));
}

export async function listInboundPayloads(hookId?: string, limit = 20) {
  const filters = [eq(developerInboundPayloads.tenantId, tenant())];
  if (hookId) filters.push(eq(developerInboundPayloads.hookId, hookId));
  return db
    .select()
    .from(developerInboundPayloads)
    .where(and(...filters))
    .orderBy(desc(developerInboundPayloads.createdAt))
    .limit(limit);
}

export async function acceptInboundSignal(slug: string, payload: unknown) {
  const hook = await getInboundHookBySlug(slug);
  if (!hook || !hook.enabled) return null;
  const [stored] = await db
    .insert(developerInboundPayloads)
    .values({
      tenantId: tenant(),
      hookId: hook.id,
      slug: hook.slug,
      payload: payload ?? {},
    })
    .returning();
  await db.insert(alerts).values({
    tenantId: tenant(),
    kind: "signal",
    title: `Inbound signal · ${hook.name}`,
    body: `POST /api/dev/webhooks/inbound/${hook.slug}`,
    severity: "info",
    entityType: "developer_inbound",
    entityId: hook.id,
  });
  return { hook, stored };
}

export async function listDeveloperConnections() {
  return db
    .select()
    .from(developerConnections)
    .where(eq(developerConnections.tenantId, tenant()))
    .orderBy(developerConnections.name);
}

export async function getDeveloperConnection(id: string) {
  const [row] = await db
    .select()
    .from(developerConnections)
    .where(and(eq(developerConnections.tenantId, tenant()), eq(developerConnections.id, id)));
  return row ?? null;
}

export async function createDeveloperConnection(input: {
  name: string;
  linkName?: string;
  kind: string;
  status?: string;
  clientId?: string;
  clientSecret?: string;
  notes?: string;
  createdBy?: string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (!isConnectionKind(input.kind)) throw new Error("Unknown connector.");
  const sealed =
    input.clientSecret && !isMaskedSecretInput(input.clientSecret)
      ? encryptSecret(input.clientSecret)
      : null;
  const [row] = await db
    .insert(developerConnections)
    .values({
      tenantId: tenant(),
      name,
      linkName: slugifyLinkName(input.linkName || name),
      kind: input.kind,
      status: input.status === "connected_demo" ? "connected_demo" : "needs_credentials",
      clientId: input.clientId?.trim() || null,
      clientSecretEnc: sealed?.enc ?? null,
      clientSecretIv: sealed?.iv ?? null,
      notes: input.notes?.trim() || null,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function updateDeveloperConnection(
  id: string,
  input: {
    name: string;
    linkName?: string;
    kind: string;
    status?: string;
    clientId?: string;
    clientSecret?: string;
    notes?: string;
  },
) {
  const existing = await getDeveloperConnection(id);
  if (!existing) return null;
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (!isConnectionKind(input.kind)) throw new Error("Unknown connector.");
  const keepSecret = isMaskedSecretInput(input.clientSecret);
  const sealed =
    input.clientSecret && !keepSecret ? encryptSecret(input.clientSecret) : null;
  const [row] = await db
    .update(developerConnections)
    .set({
      name,
      linkName: slugifyLinkName(input.linkName || name),
      kind: input.kind,
      status: input.status === "connected_demo" ? "connected_demo" : "needs_credentials",
      clientId: input.clientId?.trim() || null,
      clientSecretEnc: sealed?.enc ?? existing.clientSecretEnc,
      clientSecretIv: sealed?.iv ?? existing.clientSecretIv,
      notes: input.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(developerConnections.tenantId, tenant()), eq(developerConnections.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteDeveloperConnection(id: string) {
  await db
    .delete(developerConnections)
    .where(and(eq(developerConnections.tenantId, tenant()), eq(developerConnections.id, id)));
}

export async function hubOverviewCounts() {
  const [functions, keys, webhooks, inbound, connections] = await Promise.all([
    listDeveloperFunctions(),
    listOrgApiKeys(),
    listDeveloperWebhooks(),
    listInboundHooks(),
    listDeveloperConnections(),
  ]);
  return {
    functions: functions.length,
    liveKeys: keys.filter((row) => !row.revokedAt).length,
    webhooks: webhooks.length,
    inbound: inbound.length,
    connections: connections.length,
  };
}

export function maskConnectionSecret(row: DeveloperConnection) {
  return row.clientSecretEnc ? "••••••••••••" : "";
}

export type { DeveloperFunction, DeveloperInboundHook, FunctionCategory };
