import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, healthsherpaEnrollments, policies } from "@/lib/db/schema";
import { homeLineKey } from "@/lib/home/lines";
import {
  HEALTHSHERPA_AGENT_EMAIL_MISSING,
  HEALTHSHERPA_KEYS_MISSING,
  HEALTHSHERPA_MEDICARE_BULK_FILTER,
} from "./copy";
import { ensureHealthSherpaFailure } from "./client";
import { syncContactToHealthSherpa, type HealthSherpaContactRecord } from "./sync";
import {
  loadHealthSherpaMedicareCredentials,
  type HealthSherpaMedicareCredentials,
} from "./vault";
import {
  parseMedicareBulkOneshotState,
  persistableMedicareBulkLastRun,
  type MedicareBulkOneshotState,
  type MedicareBulkRow,
  type MedicareBulkRunResult,
  type MedicareBulkTally,
} from "./bulk-medicare-result";

export {
  failedMedicareBulkMessages,
  MEDICARE_BULK_ONESHOT_ERROR_LIMIT,
  medicareBulkAuthBanner,
  medicareBulkAuthKind,
  parseMedicareBulkOneshotState,
  persistableMedicareBulkLastRun,
} from "./bulk-medicare-result";
export type {
  MedicareBulkErrorRow,
  MedicareBulkOneshotLastRun,
  MedicareBulkOneshotState,
  MedicareBulkRow,
  MedicareBulkRowStatus,
  MedicareBulkRunResult,
  MedicareBulkTally,
} from "./bulk-medicare-result";

/** Sentinel enrollment row: last-run tally + whether the one-shot control is hidden. */
export const MEDICARE_BULK_ONESHOT_APPLICATION_ID = "ff:medicare-bulk-oneshot";
export const MEDICARE_BULK_ONESHOT_EVENT = "bulk_oneshot";
export const MEDICARE_BULK_RATE_LIMIT_MS = 250;

export const MEDICARE_HEALTH_TAG_TOKENS = [
  "health",
  "medicare",
  "mapd",
  "medigap",
  "medicare advantage",
  "medicare supplement",
  "medicare a&b",
  "using healthsherpa",
  "healthsherpa",
] as const;

export type MedicareBulkReady =
  | { ok: true; agentEmail: string }
  | { ok: false; code: "not_configured" | "agent_email"; message: string };

export type MedicareHealthContactSignals = {
  hasHealthPolicy?: boolean;
  source?: string | null;
  tags?: string[] | null;
  healthNotes?: string | null;
  status?: string | null;
  archivedAt?: Date | string | null;
  mergedIntoId?: string | null;
};

export const MEDICARE_BULK_FILTER_DOC = HEALTHSHERPA_MEDICARE_BULK_FILTER;

function blank(value: unknown): boolean {
  if (value == null) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return String(value).trim() === "";
}

export function isRetiredMedicareContact(input: Pick<MedicareHealthContactSignals, "status" | "archivedAt" | "mergedIntoId">): boolean {
  return input.status === "archived" || !blank(input.archivedAt) || !blank(input.mergedIntoId);
}

export function isHealthPolicyLine(lineOfBusiness: string | null | undefined): boolean {
  return homeLineKey(String(lineOfBusiness ?? "")) === "HEALTH";
}

export function tagLooksMedicareHealth(tag: string | null | undefined): boolean {
  const raw = String(tag ?? "").trim().toLowerCase();
  if (!raw) return false;
  if ((MEDICARE_HEALTH_TAG_TOKENS as readonly string[]).includes(raw)) return true;
  return raw.includes("medicare") || raw.includes("healthsherpa");
}

export function hasMedicareHealthFlag(input: Pick<MedicareHealthContactSignals, "tags" | "healthNotes">): boolean {
  if (!blank(input.healthNotes)) return true;
  return (input.tags ?? []).some((tag) => tagLooksMedicareHealth(tag));
}

/**
 * Medicare/Health candidate filter. Does not match the whole CRM.
 * Include when any of: HEALTH policy, source=healthsherpa, Health/Medicare tag, or Health notes.
 * Exclude archived / merged contacts.
 */
export function contactLooksMedicareHealth(input: MedicareHealthContactSignals): boolean {
  if (isRetiredMedicareContact(input)) return false;
  if (input.hasHealthPolicy) return true;
  if (String(input.source ?? "").trim().toLowerCase() === "healthsherpa") return true;
  return hasMedicareHealthFlag(input);
}

export function contactHasSyncIdentity(input: { firstName?: string | null; lastName?: string | null }): boolean {
  return Boolean(input.firstName?.trim() && input.lastName?.trim());
}

export function medicareBulkCredentialsReady(
  creds: HealthSherpaMedicareCredentials | null | undefined,
): MedicareBulkReady {
  if (!creds?.apiKey) {
    return { ok: false, code: "not_configured", message: HEALTHSHERPA_KEYS_MISSING };
  }
  const agentEmail = creds.agentEmail?.trim() || "";
  if (!agentEmail) {
    return { ok: false, code: "agent_email", message: HEALTHSHERPA_AGENT_EMAIL_MISSING };
  }
  return { ok: true, agentEmail };
}

export function tallyMedicareBulkRows(rows: MedicareBulkRow[]): MedicareBulkTally {
  const errors: MedicareBulkTally["errors"] = [];
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    if (row.status === "synced") synced += 1;
    else if (row.status === "skipped") skipped += 1;
    else {
      failed += 1;
      const failure = ensureHealthSherpaFailure({
        code: row.code,
        message: row.message,
      });
      errors.push({
        contactId: row.contactId,
        name: row.name,
        code: failure.code,
        message: failure.message,
      });
    }
  }
  return { synced, skipped, failed, errors };
}

export function emptyMedicareBulkTally(): MedicareBulkTally {
  return { synced: 0, skipped: 0, failed: 0, errors: [] };
}

function contactDisplayName(input: { firstName?: string | null; lastName?: string | null }): string {
  return `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim() || "Unnamed contact";
}

function emptyRun(code: string, message: string, configured: boolean): MedicareBulkRunResult {
  return {
    ok: false,
    code,
    message,
    configured,
    candidateCount: 0,
    rows: [],
    ...emptyMedicareBulkTally(),
  };
}

export async function describeMedicareBulkReady(): Promise<{
  hasApiKey: boolean;
  hasAgentEmail: boolean;
  configured: boolean;
  code: "ok" | "not_configured" | "agent_email";
  message: string | null;
}> {
  const creds = await loadHealthSherpaMedicareCredentials();
  const ready = medicareBulkCredentialsReady(creds);
  if (ready.ok) {
    return { hasApiKey: true, hasAgentEmail: true, configured: true, code: "ok", message: null };
  }
  return {
    hasApiKey: Boolean(creds?.apiKey),
    hasAgentEmail: Boolean(creds?.agentEmail?.trim()),
    configured: false,
    code: ready.code,
    message: ready.message,
  };
}

async function loadOneshotRow() {
  const [row] = await db
    .select()
    .from(healthsherpaEnrollments)
    .where(
      and(
        eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID),
        eq(healthsherpaEnrollments.hsApplicationId, MEDICARE_BULK_ONESHOT_APPLICATION_ID),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function loadMedicareBulkOneshotState(): Promise<MedicareBulkOneshotState> {
  try {
    const row = await loadOneshotRow();
    return parseMedicareBulkOneshotState(row?.payload);
  } catch {
    return { hidden: false, lastRunAt: null, lastRun: null };
  }
}

export async function saveMedicareBulkOneshotState(
  next: MedicareBulkOneshotState,
): Promise<MedicareBulkOneshotState> {
  const payload = {
    hidden: next.hidden,
    lastRunAt: next.lastRunAt,
    lastRun: next.lastRun,
  };
  const existing = await loadOneshotRow();
  if (existing) {
    await db
      .update(healthsherpaEnrollments)
      .set({
        product: "medicare",
        event: MEDICARE_BULK_ONESHOT_EVENT,
        payload,
        updatedAt: new Date(),
      })
      .where(eq(healthsherpaEnrollments.id, existing.id));
  } else {
    await db.insert(healthsherpaEnrollments).values({
      tenantId: DEFAULT_TENANT_ID,
      product: "medicare",
      event: MEDICARE_BULK_ONESHOT_EVENT,
      hsApplicationId: MEDICARE_BULK_ONESHOT_APPLICATION_ID,
      payload,
    });
  }
  return next;
}

export async function hideMedicareBulkOneshot(): Promise<MedicareBulkOneshotState> {
  const current = await loadMedicareBulkOneshotState();
  return saveMedicareBulkOneshotState({ ...current, hidden: true });
}

export async function restoreMedicareBulkOneshot(): Promise<MedicareBulkOneshotState> {
  const current = await loadMedicareBulkOneshotState();
  return saveMedicareBulkOneshotState({ ...current, hidden: false });
}

type ListedContact = HealthSherpaContactRecord & {
  tags: string[] | null;
  healthNotes: string | null;
  status: string | null;
  archivedAt: Date | null;
  mergedIntoId: string | null;
};

async function listMedicareHealthCandidateContacts(): Promise<ListedContact[]> {
  const policyRows = await db
    .select({ contactId: policies.contactId, lineOfBusiness: policies.lineOfBusiness })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), isNotNull(policies.contactId)));
  const healthPolicySet = new Set(
    policyRows
      .filter((row) => isHealthPolicyLine(row.lineOfBusiness) && row.contactId)
      .map((row) => row.contactId as string),
  );

  const flagged = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      dateOfBirth: contacts.dateOfBirth,
      mailingAddress: contacts.mailingAddress,
      city: contacts.city,
      state: contacts.state,
      zip: contacts.zip,
      source: contacts.source,
      sourceId: contacts.sourceId,
      tags: contacts.tags,
      healthNotes: contacts.healthNotes,
      status: contacts.status,
      archivedAt: contacts.archivedAt,
      mergedIntoId: contacts.mergedIntoId,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.tenantId, DEFAULT_TENANT_ID),
        isNull(contacts.archivedAt),
        isNull(contacts.mergedIntoId),
        ne(contacts.status, "archived"),
        or(
          eq(contacts.source, "healthsherpa"),
          sql`coalesce(trim(${contacts.healthNotes}), '') <> ''`,
          sql`exists (
            select 1
            from jsonb_array_elements_text(coalesce(${contacts.tags}, '[]'::jsonb)) as tag
            where lower(tag) in (
              'health', 'medicare', 'mapd', 'medigap', 'medicare advantage',
              'medicare supplement', 'medicare a&b', 'using healthsherpa', 'healthsherpa'
            )
            or lower(tag) like '%medicare%'
            or lower(tag) like '%healthsherpa%'
          )`,
          healthPolicySet.size ? inArray(contacts.id, [...healthPolicySet]) : sql`false`,
        ),
      ),
    );

  return flagged.filter((row) =>
    contactLooksMedicareHealth({
      hasHealthPolicy: healthPolicySet.has(row.id),
      source: row.source,
      tags: row.tags,
      healthNotes: row.healthNotes,
      status: row.status,
      archivedAt: row.archivedAt,
      mergedIntoId: row.mergedIntoId,
    }),
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runMedicareContactBulkSync(input?: {
  loadCredentials?: typeof loadHealthSherpaMedicareCredentials;
  listCandidates?: () => Promise<ListedContact[]>;
  syncContact?: typeof syncContactToHealthSherpa;
  sleep?: (ms: number) => Promise<void>;
  persist?: boolean;
}): Promise<MedicareBulkRunResult> {
  const loadCredentials = input?.loadCredentials ?? loadHealthSherpaMedicareCredentials;
  const listCandidates = input?.listCandidates ?? listMedicareHealthCandidateContacts;
  const syncContact = input?.syncContact ?? syncContactToHealthSherpa;
  const sleep = input?.sleep ?? wait;
  const persist = input?.persist !== false;

  const creds = await loadCredentials();
  const ready = medicareBulkCredentialsReady(creds);
  if (!ready.ok) {
    return emptyRun(ready.code, ready.message, false);
  }

  const candidates = await listCandidates();
  const rows: MedicareBulkRow[] = [];
  for (const [index, contact] of candidates.entries()) {
    const name = contactDisplayName(contact);
    if (!contactHasSyncIdentity(contact)) {
      rows.push({
        contactId: contact.id,
        name,
        status: "skipped",
        code: "identity",
        message: "Missing first or last name.",
      });
      continue;
    }
    if (index > 0) await sleep(MEDICARE_BULK_RATE_LIMIT_MS);
    try {
      const result = await syncContact({
        contact,
        agentEmail: ready.agentEmail,
        notes: [`FitFirst Medicare bulk sync ${new Date().toISOString().slice(0, 10)}`],
      });
      if (result.ok) {
        rows.push({
          contactId: contact.id,
          name,
          status: "synced",
          message: result.message,
        });
        continue;
      }
      const failure = ensureHealthSherpaFailure({
        code: result.code,
        message: result.message,
      });
      rows.push({
        contactId: contact.id,
        name,
        status: "failed",
        code: failure.code,
        message: failure.message,
      });
    } catch (error) {
      const failure = ensureHealthSherpaFailure({
        code: "healthsherpa_error",
        message: error instanceof Error ? error.message : "HealthSherpa sync failed.",
      });
      rows.push({
        contactId: contact.id,
        name,
        status: "failed",
        code: failure.code,
        message: failure.message,
      });
    }
  }

  const tally = tallyMedicareBulkRows(rows);
  const completed: MedicareBulkRunResult = {
    ok: tally.failed === 0,
    code: tally.failed ? "partial" : candidates.length === 0 ? "empty" : "ok",
    message:
      candidates.length === 0
        ? "No Medicare/Health contacts matched the filter. Nothing was pushed."
        : tally.failed
          ? `Finished with ${tally.failed} failed of ${candidates.length} matched.`
          : `Synced ${tally.synced} · skipped ${tally.skipped} · failed ${tally.failed}.`,
    configured: true,
    candidateCount: candidates.length,
    rows,
    ...tally,
  };

  if (persist) {
    try {
      const current = await loadMedicareBulkOneshotState();
      const autoHide = completed.ok && completed.code !== "empty";
      await saveMedicareBulkOneshotState({
        hidden: autoHide || current.hidden,
        lastRunAt: new Date().toISOString(),
        lastRun: persistableMedicareBulkLastRun(completed),
      });
    } catch {
      /* oneshot persistence is optional — do not fail the push */
    }
  }

  return completed;
}
