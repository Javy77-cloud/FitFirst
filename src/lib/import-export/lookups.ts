import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  carriers,
  contacts,
  deals,
  leads,
  pipelines,
  policies,
  users,
} from "@/lib/db/schema";
import { normalizeEmail, normalizeName } from "./csv";

const tenant = () => DEFAULT_TENANT_ID;

export async function loadImportLookups() {
  const [
    contactRows,
    leadRows,
    accountRows,
    dealRows,
    policyRows,
    carrierRows,
    userRows,
    pipelineRows,
  ] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.tenantId, tenant())),
    db.select().from(leads).where(eq(leads.tenantId, tenant())),
    db.select().from(accounts).where(eq(accounts.tenantId, tenant())),
    db.select().from(deals).where(eq(deals.tenantId, tenant())),
    db.select().from(policies).where(eq(policies.tenantId, tenant())),
    db.select().from(carriers).where(eq(carriers.tenantId, tenant())),
    db.select().from(users).where(eq(users.tenantId, tenant())),
    db.select().from(pipelines).where(eq(pipelines.tenantId, tenant())),
  ]);

  return {
    contacts: contactRows,
    leads: leadRows,
    accounts: accountRows,
    deals: dealRows,
    policies: policyRows,
    carriers: carrierRows,
    users: userRows,
    pipelines: pipelineRows,
  };
}

export type ImportLookups = Awaited<ReturnType<typeof loadImportLookups>>;

export function findContact(lookups: ImportLookups, email: string, id?: string) {
  if (id) {
    const byId = lookups.contacts.find((row) => row.id === id);
    if (byId) return byId;
  }
  const key = normalizeEmail(email);
  if (!key) return undefined;
  return lookups.contacts.find((row) => normalizeEmail(row.email) === key);
}

export function findLead(lookups: ImportLookups, email: string, id?: string) {
  if (id) {
    const byId = lookups.leads.find((row) => row.id === id);
    if (byId) return byId;
  }
  const key = normalizeEmail(email);
  if (!key) return undefined;
  return lookups.leads.find((row) => normalizeEmail(row.email) === key);
}

export function findAccount(lookups: ImportLookups, email: string, name: string, id?: string) {
  if (id) {
    const byId = lookups.accounts.find((row) => row.id === id);
    if (byId) return byId;
  }
  const emailKey = normalizeEmail(email);
  if (emailKey) {
    const byEmail = lookups.accounts.find((row) => normalizeEmail(row.email) === emailKey);
    if (byEmail) return byEmail;
  }
  const nameKey = normalizeName(name);
  if (!nameKey) return undefined;
  return lookups.accounts.find((row) => normalizeName(row.name) === nameKey);
}

export function findDeal(lookups: ImportLookups, id: string, title: string, contactEmail: string) {
  if (id) {
    const byId = lookups.deals.find((row) => row.id === id);
    if (byId) return byId;
  }
  const titleKey = normalizeName(title);
  const emailKey = normalizeEmail(contactEmail);
  if (!titleKey) return undefined;
  return lookups.deals.find((deal) => {
    if (normalizeName(deal.title) !== titleKey) return false;
    if (!emailKey) return true;
    const contact = lookups.contacts.find((row) => row.id === deal.contactId);
    return normalizeEmail(contact?.email) === emailKey;
  });
}

export function findPolicy(lookups: ImportLookups, policyNumber: string, id?: string) {
  if (id) {
    const byId = lookups.policies.find((row) => row.id === id);
    if (byId) return byId;
  }
  const key = policyNumber.trim().toLowerCase();
  if (!key) return undefined;
  return lookups.policies.find((row) => row.policyNumber.trim().toLowerCase() === key);
}

export function findCarrier(lookups: ImportLookups, code: string, name: string, naic?: string, id?: string) {
  if (id) {
    const byId = lookups.carriers.find((row) => row.id === id);
    if (byId) return byId;
  }
  const codeKey = code.trim().toLowerCase();
  if (codeKey) {
    const byCode = lookups.carriers.find((row) => (row.agencyCode ?? "").trim().toLowerCase() === codeKey);
    if (byCode) return byCode;
  }
  const naicKey = (naic ?? "").trim();
  if (naicKey) {
    const byNaic = lookups.carriers.find((row) => (row.naic ?? "").trim() === naicKey);
    if (byNaic) return byNaic;
  }
  const nameKey = normalizeName(name);
  if (!nameKey) return undefined;
  return lookups.carriers.find((row) => normalizeName(row.name) === nameKey);
}

export function findUser(lookups: ImportLookups, email: string, id?: string) {
  if (id) {
    const byId = lookups.users.find((row) => row.id === id);
    if (byId) return byId;
  }
  const key = normalizeEmail(email);
  if (!key) return undefined;
  return lookups.users.find((row) => normalizeEmail(row.email) === key || normalizeEmail(row.username) === key);
}

export function findPipeline(lookups: ImportLookups, slug: string, id?: string) {
  if (id) {
    const byId = lookups.pipelines.find((row) => row.id === id);
    if (byId) return byId;
  }
  const key = slug.trim().toLowerCase();
  if (!key) return undefined;
  return lookups.pipelines.find((row) => row.slug.toLowerCase() === key);
}

