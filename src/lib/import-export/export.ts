import { and, asc, desc, eq } from "drizzle-orm";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  activityLogs,
  appetiteRules,
  carriers,
  clientHistory,
  commissions,
  contacts,
  deals,
  documents,
  leads,
  pipelineStages,
  pipelines,
  policies,
  quoteAttemptLogs,
  quoteSheets,
  quotes,
  users,
} from "@/lib/db/schema";
import { packFor, templateCsv } from "./catalog";
import { day, iso, objectsToCsv, rowsToCsv } from "./csv";
import type { CsvRow, ImportEntity } from "./types";

const tenant = () => DEFAULT_TENANT_ID;

function emailOf(row: { email?: string | null } | null | undefined): string {
  return row?.email ?? "";
}

function nameOf(contact: { firstName: string; lastName: string } | null | undefined): string {
  if (!contact) return "";
  return `${contact.firstName} ${contact.lastName}`.trim();
}

export function templateFor(entity: ImportEntity): string {
  const pack = packFor(entity);
  if (!pack) throw new Error(`Unknown entity: ${entity}`);
  return templateCsv(pack.headers);
}

export async function exportRows(entity: ImportEntity): Promise<CsvRow[]> {
  switch (entity) {
    case "leads":
      return exportLeads();
    case "contacts":
      return exportContacts();
    case "businesses":
      return exportBusinesses();
    case "deals":
      return exportDeals();
    case "policies":
      return exportPolicies();
    case "carriers":
      return exportCarriers();
    case "activities":
      return exportActivities();
    case "notes":
      return exportNotes();
    case "documents":
      return exportDocuments();
    case "commissions":
      return exportCommissions();
    case "quotes":
      return exportQuotes();
    case "users":
      return exportUsers();
    case "pipelines":
      return exportPipelines();
    case "appetite":
      return exportAppetite();
    case "declines":
      return exportDeclines();
  }
}

export async function exportCsv(entity: ImportEntity): Promise<string> {
  const pack = packFor(entity);
  if (!pack) throw new Error(`Unknown entity: ${entity}`);
  const rows = await exportRows(entity);
  return objectsToCsv(pack.headers, rows);
}

export async function exportQuotesJson(): Promise<string> {
  const [quoteRows, sheets] = await Promise.all([
    exportQuotes(),
    db
      .select({
        sheet: quoteSheets,
        deal: deals,
      })
      .from(quoteSheets)
      .leftJoin(deals, eq(quoteSheets.dealId, deals.id))
      .where(eq(quoteSheets.tenantId, tenant()))
      .orderBy(asc(quoteSheets.createdAt)),
  ]);
  return JSON.stringify(
    {
      quotes: quoteRows,
      quote_sheets: sheets.map(({ sheet, deal }) => ({
        id: sheet.id,
        deal_id: sheet.dealId,
        deal_title: deal?.title ?? "",
        line: sheet.line,
        values: sheet.values,
        approved_at: iso(sheet.approvedAt),
        quoting_unlocked: sheet.quotingUnlocked,
      })),
    },
    null,
    2,
  );
}

async function exportLeads(): Promise<CsvRow[]> {
  const rows = await db
    .select({ lead: leads, owner: users })
    .from(leads)
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(eq(leads.tenantId, tenant()))
    .orderBy(asc(leads.lastName), asc(leads.firstName));
  return rows.map(({ lead, owner }) => ({
    id: lead.id,
    external_key: "",
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: lead.source ?? "",
    status: lead.status,
    notes: lead.notes ?? "",
    mailing_address: lead.mailingAddress ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    zip: lead.zip ?? "",
    date_of_birth: lead.dateOfBirth ?? "",
    insurance_type_desired: lead.insuranceTypeDesired ?? "",
    preferred_language: lead.preferredLanguage ?? "",
    owner_email: owner?.email ?? "",
  }));
}

async function exportContacts(): Promise<CsvRow[]> {
  const rows = await db
    .select({ contact: contacts, owner: users })
    .from(contacts)
    .leftJoin(users, eq(contacts.ownerId, users.id))
    .where(eq(contacts.tenantId, tenant()))
    .orderBy(asc(contacts.lastName), asc(contacts.firstName));
  return rows.map(({ contact, owner }) => ({
    id: contact.id,
    external_key: contact.sourceId ?? contact.zohoId ?? "",
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mailing_address: contact.mailingAddress ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    zip: contact.zip ?? "",
    date_of_birth: contact.dateOfBirth ?? "",
    language: contact.language ?? contact.preferredLanguage ?? "",
    marital_status: contact.maritalStatus ?? "",
    source: contact.source ?? "",
    notes: contact.notes ?? "",
    client_status: contact.clientStatus ?? "",
    status: contact.status,
    owner_email: owner?.email ?? "",
  }));
}

async function exportBusinesses(): Promise<CsvRow[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.tenantId, tenant()))
    .orderBy(asc(accounts.name));
  return rows.map((account) => ({
    id: account.id,
    external_key: account.sourceId ?? account.zohoId ?? "",
    name: account.name,
    legal_name: account.legalName ?? "",
    dba: account.dba ?? "",
    email: account.email ?? "",
    phone: account.phone ?? "",
    mailing_address: account.mailingAddress ?? "",
    city: account.city ?? "",
    state: account.state ?? "",
    zip: account.zip ?? "",
    entity_type: account.entityType ?? "",
    naics: account.naics ?? "",
    website: account.website ?? "",
    notes: account.notes ?? "",
    ein_last4: account.einLast4 ?? "",
  }));
}

async function exportDeals(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      deal: deals,
      contact: contacts,
      account: accounts,
      lead: leads,
      owner: users,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(users, eq(deals.ownerId, users.id))
    .where(eq(deals.tenantId, tenant()))
    .orderBy(desc(deals.updatedAt));
  return rows.map(({ deal, contact, account, lead, owner }) => ({
    id: deal.id,
    external_key: "",
    title: deal.title,
    pipeline_stage: deal.pipelineStage,
    line_of_business: deal.lineOfBusiness,
    state: deal.state,
    notes: deal.notes ?? "",
    source: deal.source ?? "",
    contact_email: emailOf(contact),
    account_name: account?.name ?? "",
    lead_email: emailOf(lead),
    account_kind: deal.accountKind,
    bind_target: deal.bindTarget,
    coverage_amount: deal.coverageAmount == null ? "" : String(deal.coverageAmount),
    current_carrier: deal.currentCarrier ?? "",
    owner_email: owner?.email ?? "",
  }));
}

async function exportPolicies(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
      owner: users,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(users, eq(policies.ownerId, users.id))
    .where(eq(policies.tenantId, tenant()))
    .orderBy(asc(policies.expirationDate));
  return rows.map(({ policy, contact, account, carrier, owner }) => ({
    id: policy.id,
    external_key: policy.sourceId ?? policy.zohoId ?? "",
    policy_number: policy.policyNumber,
    line_of_business: policy.lineOfBusiness,
    status: policy.status,
    premium: policy.premium ?? "",
    effective_date: day(policy.effectiveDate),
    expiration_date: day(policy.expirationDate),
    contact_email: emailOf(contact),
    account_name: account?.name ?? "",
    carrier_code: carrier?.agencyCode ?? "",
    carrier_name: carrier?.name ?? "",
    producer: policy.producer ?? "",
    coverage_a: policy.coverageA == null ? "" : String(policy.coverageA),
    form_type: policy.formType ?? "",
    owner_email: owner?.email ?? "",
  }));
}

async function exportCarriers(): Promise<CsvRow[]> {
  const rows = await db
    .select()
    .from(carriers)
    .where(eq(carriers.tenantId, tenant()))
    .orderBy(asc(carriers.name));
  return rows.map((carrier) => ({
    id: carrier.id,
    name: carrier.name,
    naic: carrier.naic ?? "",
    agency_code: carrier.agencyCode ?? "",
    written_lines: (carrier.writtenLines ?? []).join("|"),
    portal_url: carrier.portalUrl ?? carrier.agentPortalUrl ?? "",
    website: carrier.website ?? "",
    am_best_rating: carrier.amBestRating ?? "",
    territory: carrier.territory ?? "",
    binding_authority: carrier.bindingAuthority ?? "",
    appetite_notes: carrier.appetiteNotes ?? "",
    active: carrier.active ? "true" : "false",
  }));
}

async function exportActivities(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      activity: activities,
      contact: contacts,
      account: accounts,
      deal: deals,
      policy: policies,
      lead: leads,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .leftJoin(accounts, eq(activities.accountId, accounts.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(policies, eq(activities.policyId, policies.id))
    .leftJoin(leads, eq(activities.leadId, leads.id))
    .where(eq(activities.tenantId, tenant()))
    .orderBy(desc(activities.updatedAt));
  return rows.map(({ activity, contact, account, deal, policy, lead }) => ({
    id: activity.id,
    kind: activity.kind,
    title: activity.title,
    notes: activity.notes ?? "",
    status: activity.status,
    due_at: iso(activity.dueAt),
    start_at: iso(activity.startAt),
    end_at: iso(activity.endAt),
    assignee: activity.assignee ?? "",
    contact_email: emailOf(contact),
    account_name: account?.name ?? "",
    deal_title: deal?.title ?? "",
    policy_number: policy?.policyNumber ?? "",
    lead_email: emailOf(lead),
    phone_number: activity.phoneNumber ?? "",
    direction: activity.direction ?? "",
    meeting_type: activity.meetingType ?? "",
    outcome: activity.outcome ?? "",
  }));
}

async function exportNotes(): Promise<CsvRow[]> {
  const [logs, history] = await Promise.all([
    db
      .select({
        log: activityLogs,
        contact: contacts,
        account: accounts,
        deal: deals,
        policy: policies,
        lead: leads,
      })
      .from(activityLogs)
      .leftJoin(contacts, eq(activityLogs.contactId, contacts.id))
      .leftJoin(accounts, eq(activityLogs.accountId, accounts.id))
      .leftJoin(deals, eq(activityLogs.dealId, deals.id))
      .leftJoin(policies, eq(activityLogs.policyId, policies.id))
      .leftJoin(leads, eq(activityLogs.leadId, leads.id))
      .where(eq(activityLogs.tenantId, tenant()))
      .orderBy(desc(activityLogs.occurredAt)),
    db
      .select({
        note: clientHistory,
        contact: contacts,
        account: accounts,
        deal: deals,
        policy: policies,
      })
      .from(clientHistory)
      .leftJoin(contacts, eq(clientHistory.contactId, contacts.id))
      .leftJoin(accounts, eq(clientHistory.accountId, accounts.id))
      .leftJoin(deals, eq(clientHistory.dealId, deals.id))
      .leftJoin(policies, eq(clientHistory.policyId, policies.id))
      .where(eq(clientHistory.tenantId, tenant()))
      .orderBy(desc(clientHistory.occurredAt)),
  ]);
  const fromLogs = logs.map(({ log, contact, account, deal, policy, lead }) => ({
    id: log.id,
    source: "activity_log",
    body: log.body,
    event_type: log.eventType,
    occurred_at: iso(log.occurredAt),
    contact_email: emailOf(contact),
    account_name: account?.name ?? "",
    deal_title: deal?.title ?? "",
    policy_number: policy?.policyNumber ?? "",
    lead_email: emailOf(lead),
  }));
  const fromHistory = history.map(({ note, contact, account, deal, policy }) => ({
    id: note.id,
    source: "client_history",
    body: note.body,
    event_type: note.eventType,
    occurred_at: iso(note.occurredAt),
    contact_email: emailOf(contact),
    account_name: account?.name ?? "",
    deal_title: deal?.title ?? "",
    policy_number: policy?.policyNumber ?? "",
    lead_email: "",
  }));
  return [...fromLogs, ...fromHistory];
}

async function exportDocuments(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      doc: documents,
      contact: contacts,
      account: accounts,
      deal: deals,
      policy: policies,
    })
    .from(documents)
    .leftJoin(contacts, eq(documents.contactId, contacts.id))
    .leftJoin(accounts, eq(documents.accountId, accounts.id))
    .leftJoin(deals, eq(documents.dealId, deals.id))
    .leftJoin(policies, eq(documents.policyId, policies.id))
    .where(and(eq(documents.tenantId, tenant()), notHiddenDocument()))
    .orderBy(desc(documents.createdAt));
  return rows.map(({ doc, contact, account, deal, policy }) => ({
    id: doc.id,
    filename: doc.filename,
    mime_type: doc.mimeType,
    doc_type: doc.docType,
    slot: doc.slot,
    status: doc.status,
    library: doc.library,
    contact_email: emailOf(contact),
    account_name: account?.name ?? "",
    deal_title: deal?.title ?? "",
    policy_number: policy?.policyNumber ?? "",
    created_at: iso(doc.createdAt),
  }));
}

async function exportCommissions(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      commission: commissions,
      policy: policies,
      carrier: carriers,
      agent: users,
    })
    .from(commissions)
    .leftJoin(policies, eq(commissions.policyId, policies.id))
    .leftJoin(carriers, eq(commissions.carrierId, carriers.id))
    .leftJoin(users, eq(commissions.agentId, users.id))
    .where(eq(commissions.tenantId, tenant()))
    .orderBy(desc(commissions.updatedAt));
  return rows.map(({ commission, policy, carrier, agent }) => ({
    id: commission.id,
    policy_number: policy?.policyNumber ?? "",
    carrier_name: carrier?.name ?? "",
    line_of_business: commission.lineOfBusiness ?? "",
    premium: commission.premium ?? "",
    rate_pct: commission.ratePct ?? "",
    amount: commission.amount ?? "",
    status: commission.status,
    due_date: day(commission.dueDate),
    paid_date: day(commission.paidDate),
    period: commission.period ?? "",
    agent_email: agent?.email ?? "",
  }));
}

async function exportQuotes(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      quote: quotes,
      deal: deals,
      carrier: carriers,
    })
    .from(quotes)
    .leftJoin(deals, eq(quotes.dealId, deals.id))
    .leftJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(eq(quotes.tenantId, tenant()))
    .orderBy(desc(quotes.createdAt));
  return rows.map(({ quote, deal, carrier }) => ({
    id: quote.id,
    deal_id: quote.dealId,
    deal_title: deal?.title ?? "",
    carrier_name: carrier?.name ?? "",
    quote_number: quote.quoteNumber ?? "",
    premium: quote.premium ?? "",
    coverage_a: quote.coverageA == null ? "" : String(quote.coverageA),
    bindable: quote.bindable ? "true" : "false",
    lost_reason: quote.lostReason ?? "",
    notes: quote.notes ?? "",
    created_at: iso(quote.createdAt),
  }));
}

async function exportUsers(): Promise<CsvRow[]> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.tenantId, tenant()))
    .orderBy(asc(users.name));
  return rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username ?? "",
    role: user.role,
    access_status: user.accessStatus,
    office_label: user.officeLabel ?? "",
    territory_label: user.territoryLabel ?? "",
    active: user.active ? "true" : "false",
  }));
}

async function exportPipelines(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      pipeline: pipelines,
      stage: pipelineStages,
    })
    .from(pipelineStages)
    .innerJoin(pipelines, eq(pipelineStages.pipelineId, pipelines.id))
    .where(and(eq(pipelineStages.tenantId, tenant()), eq(pipelines.tenantId, tenant())))
    .orderBy(asc(pipelines.sortOrder), asc(pipelineStages.sortOrder));
  return rows.map(({ pipeline, stage }) => ({
    pipeline_id: pipeline.id,
    pipeline_slug: pipeline.slug,
    pipeline_name: pipeline.name,
    pipeline_kind: pipeline.kind,
    pipeline_sort: String(pipeline.sortOrder),
    stage_id: stage.id,
    stage_slug: stage.slug,
    stage_name: stage.name,
    stage_sort: String(stage.sortOrder),
  }));
}

async function exportAppetite(): Promise<CsvRow[]> {
  const rows = await db
    .select({ rule: appetiteRules, carrier: carriers })
    .from(appetiteRules)
    .leftJoin(carriers, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(appetiteRules.tenantId, tenant()))
    .orderBy(asc(carriers.name));
  return rows.map(({ rule, carrier }) => ({
    id: rule.id,
    carrier_name: carrier?.name ?? "",
    carrier_code: carrier?.agencyCode ?? "",
    line_of_business: rule.lineOfBusiness,
    min_cov_a: rule.minCovA == null ? "" : String(rule.minCovA),
    max_cov_a: rule.maxCovA == null ? "" : String(rule.maxCovA),
    max_roof_age: rule.maxRoofAge == null ? "" : String(rule.maxRoofAge),
    coastal_allowed: rule.coastalAllowed ? "true" : "false",
    mobile_allowed: rule.mobileAllowed ? "true" : "false",
    notes: rule.notes ?? "",
  }));
}

async function exportDeclines(): Promise<CsvRow[]> {
  const rows = await db
    .select({
      log: quoteAttemptLogs,
      deal: deals,
      carrier: carriers,
    })
    .from(quoteAttemptLogs)
    .leftJoin(deals, eq(quoteAttemptLogs.dealId, deals.id))
    .leftJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
    .where(eq(quoteAttemptLogs.tenantId, tenant()))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));
  return rows.map(({ log, deal, carrier }) => ({
    id: log.id,
    deal_title: deal?.title ?? "",
    carrier_name: carrier?.name ?? "",
    result: log.result,
    bindable: log.bindable ? "true" : "false",
    quote_number: log.quoteNumber ?? "",
    premium: log.premium ?? "",
    cov_a_tried: log.covATried == null ? "" : String(log.covATried),
    why: log.why ?? "",
    lost_reason: log.lostReason ?? "",
    attempted_at: iso(log.attemptedAt),
  }));
}

export { rowsToCsv, nameOf };
