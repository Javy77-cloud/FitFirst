import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  carriers,
  clientHistory,
  commissions,
  contacts,
  deals,
  leads,
  pipelineStages,
  pipelines,
  policies,
  users,
} from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";
import { newDeskToken, tokenExpiresAt, usernameFromEmail } from "@/lib/people/tokens";
import { flagsForStatus } from "@/lib/people/status";
import { buildDealTitle, clientNameFromStoredTitle } from "@/lib/deals/deal-title";
import { ensureDealRisk } from "@/lib/deals/ensure-risk";
import { ensureDeskAgentRow } from "@/lib/people/store";
import {
  ANA_PROTECTED_MESSAGE,
  anaCoverageOverwrite,
  anaPolicyBlocked,
  isAnaContactId,
  isAnaDealId,
  isAnaEmail,
  isAnaLeadId,
  isAnaName,
  refersToAna,
} from "./ana";
import { canImport, packFor } from "./catalog";
import { cell, errorCsvFrom, normalizeEmail, parseBool, parseCsv, parseDate, parseIntCell } from "./csv";
import { recordJob } from "./jobs";
import {
  findAccount,
  findCarrier,
  findContact,
  findDeal,
  findLead,
  findPipeline,
  findPolicy,
  findUser,
  loadImportLookups,
  type ImportLookups,
} from "./lookups";
import type { CommitResult, CsvRow, ImportEntity, JobActor, PreviewResult, PreviewRow, RowAction } from "./types";

const tenant = () => DEFAULT_TENANT_ID;

function previewOf(
  entity: ImportEntity,
  headers: string[],
  rows: PreviewRow[],
): PreviewResult {
  const pack = packFor(entity);
  return {
    entity,
    headers: pack?.headers ? [...pack.headers] : headers,
    rows,
    createCount: rows.filter((row) => row.action === "create").length,
    updateCount: rows.filter((row) => row.action === "update").length,
    skipCount: rows.filter((row) => row.action === "skip").length,
    errorCount: rows.filter((row) => row.action === "error").length,
    importable: pack ? canImport(pack) : false,
  };
}

function row(
  line: number,
  action: RowAction,
  key: string,
  label: string,
  message: string,
  values: CsvRow,
): PreviewRow {
  return { line, action, key, label, message, values };
}

function slugFor(username: string, id: string) {
  const base = username.replace(/[^a-z0-9-]/g, "") || "agent";
  return `${base}-${id.slice(0, 8)}`.slice(0, 40);
}

export function previewFromCsv(entity: ImportEntity, text: string, lookups: ImportLookups): PreviewResult {
  const pack = packFor(entity);
  if (!pack) throw new Error(`Unknown entity: ${entity}`);
  const parsed = parseCsv(text);
  if (parsed.rows.length === 0) {
    return previewOf(entity, [...pack.headers], []);
  }
  if (!canImport(pack)) {
    return previewOf(
      entity,
      [...pack.headers],
      parsed.rows.map((values, index) =>
        row(index + 2, "skip", entity, pack.label, pack.coming ?? "Import is not offered for this pack.", values),
      ),
    );
  }
  const seen = new Set<string>();
  const rows = parsed.rows.map((values, index) => {
    const preview = previewOne(entity, values, lookups);
    const dupKey = preview.key.toLowerCase();
    if (dupKey && seen.has(dupKey) && preview.action !== "error") {
      return row(index + 2, "error", preview.key, preview.label, "Duplicate row in this file for the same match key.", values);
    }
    if (dupKey) seen.add(dupKey);
    return { ...preview, line: index + 2, values };
  });
  return previewOf(entity, parsed.headers, rows);
}

function previewOne(entity: ImportEntity, values: CsvRow, lookups: ImportLookups): Omit<PreviewRow, "line" | "values"> {
  switch (entity) {
    case "leads":
      return previewLead(values, lookups);
    case "contacts":
      return previewContact(values, lookups);
    case "businesses":
      return previewBusiness(values, lookups);
    case "deals":
      return previewDeal(values, lookups);
    case "policies":
      return previewPolicy(values, lookups);
    case "carriers":
      return previewCarrier(values, lookups);
    case "activities":
      return previewActivity(values, lookups);
    case "notes":
      return previewNote(values, lookups);
    case "commissions":
      return previewCommission(values, lookups);
    case "users":
      return previewUser(values, lookups);
    case "pipelines":
      return previewPipeline(values, lookups);
    default:
      return { action: "skip", key: "", label: entity, message: "Import is not offered." };
  }
}

function previewLead(values: CsvRow, lookups: ImportLookups) {
  const first = cell(values, "first_name");
  const last = cell(values, "last_name");
  const email = normalizeEmail(cell(values, "email"));
  const id = cell(values, "id");
  if (!first || !last) {
    return { action: "error" as const, key: email || id, label: `${first} ${last}`.trim(), message: "first_name and last_name are required." };
  }
  const existing = findLead(lookups, email, isUuid(id) ? id : undefined);
  const label = `${first} ${last}`.trim();
  if (existing && (isAnaLeadId(existing.id) || isAnaEmail(existing.email) || isAnaName(existing.firstName, existing.lastName))) {
    return { action: "skip" as const, key: existing.id, label, message: ANA_PROTECTED_MESSAGE };
  }
  if (existing) {
    return { action: "update" as const, key: existing.id, label, message: `Update lead ${existing.email ?? existing.id}` };
  }
  if (!email) {
    return { action: "error" as const, key: "", label, message: "email is required to create a lead." };
  }
  return { action: "create" as const, key: email, label, message: "Create lead" };
}

function previewContact(values: CsvRow, lookups: ImportLookups) {
  const first = cell(values, "first_name");
  const last = cell(values, "last_name");
  const email = normalizeEmail(cell(values, "email"));
  const id = cell(values, "id");
  if (!first || !last) {
    return { action: "error" as const, key: email || id, label: `${first} ${last}`.trim(), message: "first_name and last_name are required." };
  }
  const existing = findContact(lookups, email, isUuid(id) ? id : undefined);
  const label = `${first} ${last}`.trim();
  if (
    existing &&
    (isAnaContactId(existing.id) || isAnaEmail(existing.email) || isAnaName(existing.firstName, existing.lastName))
  ) {
    return { action: "skip" as const, key: existing.id, label, message: ANA_PROTECTED_MESSAGE };
  }
  if (isAnaName(first, last) || isAnaEmail(email)) {
    return { action: "skip" as const, key: email || label, label, message: ANA_PROTECTED_MESSAGE };
  }
  if (existing) {
    return { action: "update" as const, key: existing.id, label, message: `Update contact ${existing.email ?? existing.id}` };
  }
  if (!email) {
    return { action: "error" as const, key: "", label, message: "email is required to create a contact." };
  }
  return { action: "create" as const, key: email, label, message: "Create contact" };
}

function previewBusiness(values: CsvRow, lookups: ImportLookups) {
  const name = cell(values, "name");
  const email = normalizeEmail(cell(values, "email"));
  const id = cell(values, "id");
  if (!name) {
    return { action: "error" as const, key: email || id, label: name, message: "name is required." };
  }
  const existing = findAccount(lookups, email, name, isUuid(id) ? id : undefined);
  if (existing) {
    return { action: "update" as const, key: existing.id, label: name, message: `Update business ${existing.name}` };
  }
  return { action: "create" as const, key: email || name, label: name, message: "Create business" };
}

function previewDeal(values: CsvRow, lookups: ImportLookups) {
  const title = cell(values, "title");
  const contactEmail = normalizeEmail(cell(values, "contact_email"));
  const id = cell(values, "id");
  const stage = cell(values, "pipeline_stage");
  if (!title) {
    return { action: "error" as const, key: id, label: title, message: "title is required." };
  }
  const existing = findDeal(lookups, isUuid(id) ? id : "", title, contactEmail);
  const bindStage = ["closed_won", "bound"].includes(stage.toLowerCase());
  if (existing && (isAnaDealId(existing.id) || refersToAna({ dealId: existing.id, contactId: existing.contactId, contactEmail }))) {
    if (bindStage) {
      return { action: "error" as const, key: existing.id, label: title, message: ANA_PROTECTED_MESSAGE };
    }
    return { action: "skip" as const, key: existing.id, label: title, message: ANA_PROTECTED_MESSAGE };
  }
  if (isAnaEmail(contactEmail) && bindStage) {
    return { action: "error" as const, key: title, label: title, message: ANA_PROTECTED_MESSAGE };
  }
  if (existing) {
    return { action: "update" as const, key: existing.id, label: title, message: `Update deal ${existing.title}` };
  }
  return { action: "create" as const, key: `${title}|${contactEmail}`, label: title, message: "Create deal" };
}

function previewPolicy(values: CsvRow, lookups: ImportLookups) {
  const number = cell(values, "policy_number");
  const id = cell(values, "id");
  const contactEmail = normalizeEmail(cell(values, "contact_email"));
  const contact = findContact(lookups, contactEmail);
  const existing = findPolicy(lookups, number, isUuid(id) ? id : undefined);
  if (!number) {
    return { action: "error" as const, key: "", label: "", message: "policy_number is required." };
  }
  const blocked = anaPolicyBlocked({
    contactId: contact?.id ?? existing?.contactId,
    dealId: existing?.dealId,
    contactEmail,
    firstName: contact?.firstName,
    lastName: contact?.lastName,
  });
  if (blocked || isAnaEmail(contactEmail) || (contact && isAnaContactId(contact.id))) {
    return { action: "error" as const, key: number, label: number, message: ANA_PROTECTED_MESSAGE };
  }
  if (existing && (isAnaContactId(existing.contactId) || isAnaDealId(existing.dealId))) {
    return { action: "error" as const, key: existing.policyNumber, label: number, message: ANA_PROTECTED_MESSAGE };
  }
  const covA = parseIntCell(cell(values, "coverage_a"));
  if (existing && anaCoverageOverwrite(covA) && isAnaDealId(existing.dealId)) {
    return { action: "error" as const, key: number, label: number, message: ANA_PROTECTED_MESSAGE };
  }
  if (!existing && !cell(values, "effective_date")) {
    return { action: "error" as const, key: number, label: number, message: "effective_date is required to create a policy." };
  }
  if (!existing && !cell(values, "expiration_date")) {
    return { action: "error" as const, key: number, label: number, message: "expiration_date is required to create a policy." };
  }
  if (!existing && !cell(values, "line_of_business")) {
    return { action: "error" as const, key: number, label: number, message: "line_of_business is required to create a policy." };
  }
  if (existing) {
    return { action: "update" as const, key: existing.id, label: number, message: `Update policy ${existing.policyNumber}` };
  }
  return { action: "create" as const, key: number, label: number, message: "Create policy" };
}

function previewCarrier(values: CsvRow, lookups: ImportLookups) {
  const name = cell(values, "name");
  const code = cell(values, "agency_code");
  const naic = cell(values, "naic");
  const id = cell(values, "id");
  if (!name && !code && !naic) {
    return { action: "error" as const, key: "", label: "", message: "name, agency_code, or naic is required." };
  }
  const existing = findCarrier(lookups, code, name, naic, isUuid(id) ? id : undefined);
  const label = name || code || naic;
  if (existing) {
    return { action: "update" as const, key: existing.id, label, message: `Update carrier ${existing.name}` };
  }
  if (!name) {
    return { action: "error" as const, key: code || naic, label, message: "name is required to create a carrier." };
  }
  return { action: "create" as const, key: code || name, label, message: "Create carrier" };
}

function previewActivity(values: CsvRow, lookups: ImportLookups) {
  const title = cell(values, "title");
  const kind = cell(values, "kind") || "task";
  if (!title) {
    return { action: "error" as const, key: "", label: "", message: "title is required." };
  }
  const id = cell(values, "id");
  if (isUuid(id)) {
    return { action: "skip" as const, key: id, label: title, message: "Existing activity ids are not updated. Import creates new rows only." };
  }
  void lookups;
  return { action: "create" as const, key: `${kind}|${title}`, label: title, message: `Create ${kind}` };
}

function previewNote(values: CsvRow, lookups: ImportLookups) {
  const body = cell(values, "body");
  if (!body) {
    return { action: "error" as const, key: "", label: "", message: "body is required." };
  }
  const contactEmail = normalizeEmail(cell(values, "contact_email"));
  if (contactEmail && !findContact(lookups, contactEmail)) {
    return { action: "error" as const, key: contactEmail, label: body.slice(0, 40), message: `Contact not found: ${contactEmail}` };
  }
  return { action: "create" as const, key: body.slice(0, 48), label: body.slice(0, 40), message: "Create note (client history stub)" };
}

function previewCommission(values: CsvRow, lookups: ImportLookups) {
  const id = cell(values, "id");
  const policyNumber = cell(values, "policy_number");
  const period = cell(values, "period");
  const policy = findPolicy(lookups, policyNumber);
  if (policy && (isAnaContactId(policy.contactId) || isAnaDealId(policy.dealId))) {
    return { action: "error" as const, key: policyNumber, label: policyNumber, message: ANA_PROTECTED_MESSAGE };
  }
  if (isUuid(id)) {
    return { action: "update" as const, key: id, label: policyNumber || id, message: "Update commission by id" };
  }
  if (!policyNumber) {
    return { action: "error" as const, key: "", label: "", message: "policy_number or id is required." };
  }
  if (!policy) {
    return { action: "error" as const, key: policyNumber, label: policyNumber, message: `Policy not found: ${policyNumber}` };
  }
  return { action: "create" as const, key: `${policyNumber}|${period}`, label: policyNumber, message: "Create commission" };
}

function previewUser(values: CsvRow, lookups: ImportLookups) {
  const email = normalizeEmail(cell(values, "email"));
  const name = cell(values, "name");
  if (!email) {
    return { action: "error" as const, key: "", label: name, message: "email is required." };
  }
  if (!name) {
    return { action: "error" as const, key: email, label: name, message: "name is required." };
  }
  const existing = findUser(lookups, email, isUuid(cell(values, "id")) ? cell(values, "id") : undefined);
  if (existing) {
    return { action: "skip" as const, key: existing.id, label: name, message: "Existing roster rows are not overwritten. Re-invite from People / Agents." };
  }
  return { action: "create" as const, key: email, label: name, message: "Create invite stub" };
}

function previewPipeline(values: CsvRow, lookups: ImportLookups) {
  const pipelineId = cell(values, "pipeline_id");
  const slug = cell(values, "pipeline_slug");
  const stageSlug = cell(values, "stage_slug");
  const stageName = cell(values, "stage_name") || stageSlug;
  const pipeline = findPipeline(lookups, slug, isUuid(pipelineId) ? pipelineId : undefined);
  if (!pipeline && !slug && !pipelineId) {
    return { action: "error" as const, key: "", label: "", message: "pipeline_id or pipeline_slug is required. Stages never import without a pipeline." };
  }
  if (!stageSlug && !stageName) {
    return { action: "error" as const, key: slug || pipelineId, label: slug, message: "stage_slug or stage_name is required." };
  }
  if (pipeline) {
    return { action: "update" as const, key: `${pipeline.id}|${stageSlug || stageName}`, label: `${pipeline.name} / ${stageName}`, message: "Upsert stage on existing pipeline" };
  }
  return { action: "create" as const, key: `${slug}|${stageSlug || stageName}`, label: `${slug} / ${stageName}`, message: "Create pipeline + stage" };
}

export async function previewImport(entity: ImportEntity, text: string): Promise<PreviewResult> {
  const lookups = await loadImportLookups();
  return previewFromCsv(entity, text, lookups);
}

export async function commitImport(entity: ImportEntity, text: string, actor: JobActor, filename?: string): Promise<CommitResult> {
  const lookups = await loadImportLookups();
  const preview = previewFromCsv(entity, text, lookups);
  const pack = packFor(entity);
  if (!pack || !canImport(pack)) {
    const job = await recordJob({
      actor,
      entity,
      action: "import",
      status: "skipped",
      filename,
      rowsSkip: preview.rows.length,
      notes: pack?.coming ?? "Import is not offered.",
    });
    return {
      entity,
      jobId: job?.id ?? "",
      rowsOk: 0,
      rowsError: 0,
      rowsCreate: 0,
      rowsUpdate: 0,
      rowsSkip: preview.rows.length,
      errorCsv: null,
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ line: number; key: string; message: string }> = [];

  for (const item of preview.rows) {
    if (item.action === "skip") {
      skipped += 1;
      continue;
    }
    if (item.action === "error") {
      errors.push({ line: item.line, key: item.key, message: item.message });
      continue;
    }
    try {
      await applyRow(entity, item, lookups, actor);
      if (item.action === "create") created += 1;
      else updated += 1;
    } catch (err) {
      errors.push({
        line: item.line,
        key: item.key,
        message: err instanceof Error ? err.message : "Commit failed.",
      });
    }
  }

  const errorCsv = errors.length ? errorCsvFrom(errors) : null;
  const job = await recordJob({
    actor,
    entity,
    action: "import",
    status: errors.length && created + updated === 0 ? "error" : errors.length ? "partial" : "ok",
    filename,
    rowsOk: created + updated,
    rowsError: errors.length,
    rowsCreate: created,
    rowsUpdate: updated,
    rowsSkip: skipped,
    errorCsv,
  });

  return {
    entity,
    jobId: job?.id ?? "",
    rowsOk: created + updated,
    rowsError: errors.length,
    rowsCreate: created,
    rowsUpdate: updated,
    rowsSkip: skipped,
    errorCsv,
  };
}

async function applyRow(entity: ImportEntity, item: PreviewRow, lookups: ImportLookups, actor: JobActor) {
  switch (entity) {
    case "leads":
      return applyLead(item, lookups, actor);
    case "contacts":
      return applyContact(item, lookups, actor);
    case "businesses":
      return applyBusiness(item);
    case "deals":
      return applyDeal(item, lookups, actor);
    case "policies":
      return applyPolicy(item, lookups, actor);
    case "carriers":
      return applyCarrier(item);
    case "activities":
      return applyActivity(item, lookups);
    case "notes":
      return applyNote(item, lookups);
    case "commissions":
      return applyCommission(item, lookups);
    case "users":
      return applyUser(item);
    case "pipelines":
      return applyPipeline(item, lookups);
    default:
      throw new Error("Import is not offered.");
  }
}

function ownerFrom(lookups: ImportLookups, email: string, actor: JobActor): string | null {
  return findUser(lookups, email)?.id ?? actor.id;
}

async function applyLead(item: PreviewRow, lookups: ImportLookups, actor: JobActor) {
  const values = item.values;
  const email = normalizeEmail(cell(values, "email"));
  const existing = findLead(lookups, email, isUuid(cell(values, "id")) ? cell(values, "id") : undefined);
  const payload = {
    firstName: cell(values, "first_name"),
    lastName: cell(values, "last_name"),
    email: email || null,
    phone: cell(values, "phone") || null,
    source: cell(values, "source") || null,
    status: cell(values, "status") || "new",
    notes: cell(values, "notes") || null,
    mailingAddress: cell(values, "mailing_address") || null,
    city: cell(values, "city") || null,
    state: cell(values, "state") || null,
    zip: cell(values, "zip") || null,
    dateOfBirth: cell(values, "date_of_birth") || null,
    insuranceTypeDesired: cell(values, "insurance_type_desired") || null,
    preferredLanguage: cell(values, "preferred_language") || null,
    ownerId: ownerFrom(lookups, cell(values, "owner_email"), actor),
    updatedAt: new Date(),
  };
  if (existing) {
    if (isAnaLeadId(existing.id) || isAnaEmail(existing.email)) {
      throw new Error(ANA_PROTECTED_MESSAGE);
    }
    await db.update(leads).set(payload).where(and(eq(leads.tenantId, tenant()), eq(leads.id, existing.id)));
    return;
  }
  const [created] = await db
    .insert(leads)
    .values({ tenantId: tenant(), ...payload })
    .returning();
  if (created) lookups.leads.push(created);
}

async function applyContact(item: PreviewRow, lookups: ImportLookups, actor: JobActor) {
  const values = item.values;
  const email = normalizeEmail(cell(values, "email"));
  const existing = findContact(lookups, email, isUuid(cell(values, "id")) ? cell(values, "id") : undefined);
  if (existing && (isAnaContactId(existing.id) || isAnaEmail(existing.email))) {
    throw new Error(ANA_PROTECTED_MESSAGE);
  }
  if (isAnaName(cell(values, "first_name"), cell(values, "last_name")) || isAnaEmail(email)) {
    throw new Error(ANA_PROTECTED_MESSAGE);
  }
  const payload = {
    firstName: cell(values, "first_name"),
    lastName: cell(values, "last_name"),
    email: email || null,
    phone: cell(values, "phone") || null,
    mailingAddress: cell(values, "mailing_address") || null,
    city: cell(values, "city") || null,
    state: cell(values, "state") || null,
    zip: cell(values, "zip") || null,
    dateOfBirth: cell(values, "date_of_birth") || null,
    language: cell(values, "language") || null,
    maritalStatus: cell(values, "marital_status") || null,
    source: cell(values, "source") || null,
    notes: cell(values, "notes") || null,
    clientStatus: cell(values, "client_status") || null,
    status: cell(values, "status") || "active",
    sourceId: cell(values, "external_key") || null,
    ownerId: ownerFrom(lookups, cell(values, "owner_email"), actor),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(contacts).set(payload).where(and(eq(contacts.tenantId, tenant()), eq(contacts.id, existing.id)));
    return;
  }
  const [created] = await db
    .insert(contacts)
    .values({ tenantId: tenant(), ...payload })
    .returning();
  if (created) lookups.contacts.push(created);
}

async function applyBusiness(item: PreviewRow) {
  const values = item.values;
  const lookups = await loadImportLookups();
  const email = normalizeEmail(cell(values, "email"));
  const name = cell(values, "name");
  const existing = findAccount(lookups, email, name, isUuid(cell(values, "id")) ? cell(values, "id") : undefined);
  const payload = {
    name,
    legalName: cell(values, "legal_name") || null,
    dba: cell(values, "dba") || null,
    email: email || null,
    phone: cell(values, "phone") || null,
    mailingAddress: cell(values, "mailing_address") || null,
    city: cell(values, "city") || null,
    state: cell(values, "state") || null,
    zip: cell(values, "zip") || null,
    entityType: cell(values, "entity_type") || null,
    naics: cell(values, "naics") || null,
    website: cell(values, "website") || null,
    notes: cell(values, "notes") || null,
    einLast4: cell(values, "ein_last4") || null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(accounts).set(payload).where(and(eq(accounts.tenantId, tenant()), eq(accounts.id, existing.id)));
    return;
  }
  await db.insert(accounts).values({ tenantId: tenant(), ...payload });
}

async function applyDeal(item: PreviewRow, lookups: ImportLookups, actor: JobActor) {
  const values = item.values;
  const title = cell(values, "title");
  const contactEmail = normalizeEmail(cell(values, "contact_email"));
  const existing = findDeal(lookups, isUuid(cell(values, "id")) ? cell(values, "id") : "", title, contactEmail);
  const contact = findContact(lookups, contactEmail);
  const account = findAccount(lookups, "", cell(values, "account_name"));
  const lead = findLead(lookups, normalizeEmail(cell(values, "lead_email")));
  const stage = cell(values, "pipeline_stage") || "shopping";
  if (existing && (isAnaDealId(existing.id) || refersToAna({ dealId: existing.id, contactId: existing.contactId, contactEmail }))) {
    throw new Error(ANA_PROTECTED_MESSAGE);
  }
  if (["closed_won", "bound"].includes(stage.toLowerCase()) && (isAnaEmail(contactEmail) || isAnaContactId(contact?.id))) {
    throw new Error(ANA_PROTECTED_MESSAGE);
  }
  const resolvedTitle =
    buildDealTitle({
      contact,
      account,
      lead,
      primaryNamedInsured: existing?.primaryNamedInsured,
    }) ||
    clientNameFromStoredTitle(title) ||
    "Untitled deal";
  const payload = {
    title: resolvedTitle,
    pipelineStage: stage,
    lineOfBusiness: cell(values, "line_of_business") || "HO",
    state: cell(values, "state") || "FL",
    notes: cell(values, "notes") || null,
    source: cell(values, "source") || lead?.source || existing?.source || null,
    contactId: contact?.id ?? existing?.contactId ?? null,
    accountId: account?.id ?? existing?.accountId ?? null,
    leadId: lead?.id ?? existing?.leadId ?? null,
    accountKind: cell(values, "account_kind") || "personal",
    bindTarget: cell(values, "bind_target") || "contact",
    coverageAmount: parseIntCell(cell(values, "coverage_amount")),
    currentCarrier: cell(values, "current_carrier") || null,
    ownerId: ownerFrom(lookups, cell(values, "owner_email"), actor),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(deals).set(payload).where(and(eq(deals.tenantId, tenant()), eq(deals.id, existing.id)));
    await ensureDealRisk({
      tenantId: tenant(),
      dealId: existing.id,
      lineOfBusiness: payload.lineOfBusiness,
      state: payload.state,
      contactId: payload.contactId,
    });
    return;
  }
  const [created] = await db
    .insert(deals)
    .values({ tenantId: tenant(), ...payload })
    .returning();
  if (!created) throw new Error("Deal import failed: could not insert a deal row.");
  await ensureDealRisk({
    tenantId: tenant(),
    dealId: created.id,
    lineOfBusiness: payload.lineOfBusiness,
    state: payload.state,
    contactId: payload.contactId,
  });
  lookups.deals.push(created);
}

async function applyPolicy(item: PreviewRow, lookups: ImportLookups, actor: JobActor) {
  const values = item.values;
  const number = cell(values, "policy_number");
  const contactEmail = normalizeEmail(cell(values, "contact_email"));
  const contact = findContact(lookups, contactEmail);
  const existing = findPolicy(lookups, number, isUuid(cell(values, "id")) ? cell(values, "id") : undefined);
  if (
    anaPolicyBlocked({
      contactId: contact?.id ?? existing?.contactId,
      dealId: existing?.dealId,
      contactEmail,
      firstName: contact?.firstName,
      lastName: contact?.lastName,
    })
  ) {
    throw new Error(ANA_PROTECTED_MESSAGE);
  }
  const account = findAccount(lookups, "", cell(values, "account_name"));
  const carrier = findCarrier(lookups, cell(values, "carrier_code"), cell(values, "carrier_name"));
  const effective = parseDate(cell(values, "effective_date"));
  const expiration = parseDate(cell(values, "expiration_date"));
  const payload = {
    policyNumber: number,
    lineOfBusiness: cell(values, "line_of_business") || existing?.lineOfBusiness || "HO",
    status: cell(values, "status") || existing?.status || "active",
    premium: cell(values, "premium") || existing?.premium || null,
    effectiveDate: effective ?? existing?.effectiveDate ?? new Date(),
    expirationDate: expiration ?? existing?.expirationDate ?? new Date(),
    contactId: contact?.id ?? existing?.contactId ?? null,
    accountId: account?.id ?? existing?.accountId ?? null,
    carrierId: carrier?.id ?? existing?.carrierId ?? null,
    producer: cell(values, "producer") || existing?.producer || null,
    coverageA: parseIntCell(cell(values, "coverage_a")) ?? existing?.coverageA ?? null,
    formType: cell(values, "form_type") || existing?.formType || null,
    sourceId: cell(values, "external_key") || existing?.sourceId || null,
    ownerId: ownerFrom(lookups, cell(values, "owner_email"), actor),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(policies).set(payload).where(and(eq(policies.tenantId, tenant()), eq(policies.id, existing.id)));
    return;
  }
  const [created] = await db
    .insert(policies)
    .values({ tenantId: tenant(), ...payload })
    .returning();
  if (created) lookups.policies.push(created);
}

async function applyCarrier(item: PreviewRow) {
  const values = item.values;
  const lookups = await loadImportLookups();
  const existing = findCarrier(
    lookups,
    cell(values, "agency_code"),
    cell(values, "name"),
    cell(values, "naic"),
    isUuid(cell(values, "id")) ? cell(values, "id") : undefined,
  );
  const written = cell(values, "written_lines")
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const payload = {
    name: cell(values, "name") || existing?.name || "",
    naic: cell(values, "naic") || null,
    agencyCode: cell(values, "agency_code") || null,
    writtenLines: written.length ? written : existing?.writtenLines ?? [],
    portalUrl: cell(values, "portal_url") || null,
    website: cell(values, "website") || null,
    amBestRating: cell(values, "am_best_rating") || null,
    territory: cell(values, "territory") || null,
    bindingAuthority: cell(values, "binding_authority") || null,
    appetiteNotes: cell(values, "appetite_notes") || null,
    active: parseBool(cell(values, "active"), true),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(carriers).set(payload).where(and(eq(carriers.tenantId, tenant()), eq(carriers.id, existing.id)));
    return;
  }
  await db.insert(carriers).values({ tenantId: tenant(), ...payload });
}

async function applyActivity(item: PreviewRow, lookups: ImportLookups) {
  const values = item.values;
  const contact = findContact(lookups, normalizeEmail(cell(values, "contact_email")));
  const account = findAccount(lookups, "", cell(values, "account_name"));
  const lead = findLead(lookups, normalizeEmail(cell(values, "lead_email")));
  const deal = findDeal(lookups, "", cell(values, "deal_title"), cell(values, "contact_email"));
  const policy = findPolicy(lookups, cell(values, "policy_number"));
  await db.insert(activities).values({
    tenantId: tenant(),
    kind: cell(values, "kind") || "task",
    title: cell(values, "title"),
    notes: cell(values, "notes") || null,
    status: cell(values, "status") || "open",
    dueAt: parseDate(cell(values, "due_at")),
    startAt: parseDate(cell(values, "start_at")),
    endAt: parseDate(cell(values, "end_at")),
    assignee: cell(values, "assignee") || null,
    contactId: contact?.id ?? null,
    accountId: account?.id ?? null,
    dealId: deal?.id ?? null,
    policyId: policy?.id ?? null,
    leadId: lead?.id ?? null,
    phoneNumber: cell(values, "phone_number") || null,
    direction: cell(values, "direction") || null,
    meetingType: cell(values, "meeting_type") || null,
    outcome: cell(values, "outcome") || null,
  });
}

async function applyNote(item: PreviewRow, lookups: ImportLookups) {
  const values = item.values;
  const contact = findContact(lookups, normalizeEmail(cell(values, "contact_email")));
  const account = findAccount(lookups, "", cell(values, "account_name"));
  const deal = findDeal(lookups, "", cell(values, "deal_title"), cell(values, "contact_email"));
  const policy = findPolicy(lookups, cell(values, "policy_number"));
  await db.insert(clientHistory).values({
    tenantId: tenant(),
    contactId: contact?.id ?? null,
    accountId: account?.id ?? null,
    dealId: deal?.id ?? null,
    policyId: policy?.id ?? null,
    eventType: cell(values, "event_type") || "note",
    body: cell(values, "body"),
    occurredAt: parseDate(cell(values, "occurred_at")) ?? new Date(),
  });
}

async function applyCommission(item: PreviewRow, lookups: ImportLookups) {
  const values = item.values;
  const policy = findPolicy(lookups, cell(values, "policy_number"));
  if (policy && (isAnaContactId(policy.contactId) || isAnaDealId(policy.dealId))) {
    throw new Error(ANA_PROTECTED_MESSAGE);
  }
  const carrier = findCarrier(lookups, "", cell(values, "carrier_name"));
  const agent = findUser(lookups, normalizeEmail(cell(values, "agent_email")));
  const id = cell(values, "id");
  const payload = {
    policyId: policy?.id ?? null,
    carrierId: carrier?.id ?? policy?.carrierId ?? null,
    lineOfBusiness: cell(values, "line_of_business") || policy?.lineOfBusiness || null,
    premium: cell(values, "premium") || policy?.premium || null,
    ratePct: cell(values, "rate_pct") || null,
    amount: cell(values, "amount") || null,
    status: cell(values, "status") || "pending",
    dueDate: parseDate(cell(values, "due_date")),
    paidDate: parseDate(cell(values, "paid_date")),
    period: cell(values, "period") || null,
    agentId: agent?.id ?? null,
    updatedAt: new Date(),
  };
  if (isUuid(id)) {
    await db.update(commissions).set(payload).where(and(eq(commissions.tenantId, tenant()), eq(commissions.id, id)));
    return;
  }
  await db.insert(commissions).values({ tenantId: tenant(), ...payload });
}

async function applyUser(item: PreviewRow) {
  const values = item.values;
  const email = normalizeEmail(cell(values, "email"));
  const name = cell(values, "name");
  const username = cell(values, "username") || usernameFromEmail(email);
  const role = cell(values, "role") === "admin" ? "admin" : "agent";
  const token = newDeskToken();
  const [created] = await db
    .insert(users)
    .values({
      tenantId: tenant(),
      name,
      email,
      username,
      role,
      passwordHash: null,
      ...flagsForStatus("active"),
      officeLabel: cell(values, "office_label") || null,
      territoryLabel: cell(values, "territory_label") || null,
      mustSetPassword: true,
      mustEnrollMfa: true,
      mfaEnrolled: false,
      inviteToken: token,
      inviteExpiresAt: tokenExpiresAt(),
    })
    .returning();
  if (created) {
    await ensureDeskAgentRow({
      id: created.id,
      slug: slugFor(username, created.id),
      displayName: name,
      role,
    });
  }
}

async function applyPipeline(item: PreviewRow, lookups: ImportLookups) {
  const values = item.values;
  const pipelineId = cell(values, "pipeline_id");
  const slug = cell(values, "pipeline_slug");
  const stageSlug = cell(values, "stage_slug") || cell(values, "stage_name").toLowerCase().replace(/\s+/g, "-");
  const stageName = cell(values, "stage_name") || stageSlug;
  if (!pipelineId && !slug) {
    throw new Error("pipeline_id or pipeline_slug is required.");
  }
  let pipeline = findPipeline(lookups, slug, isUuid(pipelineId) ? pipelineId : undefined);
  if (!pipeline) {
    const [created] = await db
      .insert(pipelines)
      .values({
        tenantId: tenant(),
        name: cell(values, "pipeline_name") || slug || "Imported",
        slug: slug || (cell(values, "pipeline_name") || "imported").toLowerCase().replace(/\s+/g, "-"),
        kind: cell(values, "pipeline_kind") || "shopping",
        sortOrder: parseIntCell(cell(values, "pipeline_sort")) ?? 99,
        seeded: false,
      })
      .returning();
    if (!created) throw new Error("Could not create pipeline.");
    lookups.pipelines.push(created);
    pipeline = created;
  } else if (cell(values, "pipeline_name") || cell(values, "pipeline_kind")) {
    await db
      .update(pipelines)
      .set({
        name: cell(values, "pipeline_name") || pipeline.name,
        kind: cell(values, "pipeline_kind") || pipeline.kind,
        sortOrder: parseIntCell(cell(values, "pipeline_sort")) ?? pipeline.sortOrder,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelines.tenantId, tenant()), eq(pipelines.id, pipeline.id)));
  }

  const [existingStage] = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.tenantId, tenant()),
        eq(pipelineStages.pipelineId, pipeline.id),
        eq(pipelineStages.slug, stageSlug),
      ),
    );
  if (existingStage) {
    await db
      .update(pipelineStages)
      .set({
        name: stageName,
        sortOrder: parseIntCell(cell(values, "stage_sort")) ?? existingStage.sortOrder,
      })
      .where(eq(pipelineStages.id, existingStage.id));
    return;
  }
  await db.insert(pipelineStages).values({
    tenantId: tenant(),
    pipelineId: pipeline.id,
    name: stageName,
    slug: stageSlug,
    sortOrder: parseIntCell(cell(values, "stage_sort")) ?? 0,
    seeded: false,
  });
}
