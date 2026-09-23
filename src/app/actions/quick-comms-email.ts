"use server";

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { listEmailTemplates } from "@/lib/db/template-queries";
import { resolveOutboundEmailSignature } from "@/lib/desk/outbound-email-signature";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads } from "@/lib/db/schema";
import { resolvePartyEmail } from "@/lib/comms/resolve-party-email";
import { loadRecordValuesForIds } from "@/lib/custom-fields/store";

export type QuickCommsEmailTemplateOption = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export type ComposeRecipientHit = {
  kind: "contact" | "account" | "deal" | "lead";
  id: string;
  name: string;
  email: string | null;
  /** Linked ids when the hit is a deal (for activity linking). */
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
};

export async function loadQuickCommsEmailTemplates(): Promise<QuickCommsEmailTemplateOption[]> {
  const rows = await listEmailTemplates();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: (row.subjectEn ?? row.subject ?? "").trim() || row.name,
    body: (row.bodyEn ?? row.body ?? "").trim(),
  }));
}

export async function loadQuickCommsEmailSignature(): Promise<string> {
  return resolveOutboundEmailSignature();
}

/** Live To typeahead for shared compose: contacts, accounts, deals, leads. */
export async function searchComposeRecipients(query: string): Promise<ComposeRecipientHit[]> {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q.replace(/[%_]/g, "")}%`;

  const [contactRows, accountRows, leadRows, dealRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, DEFAULT_TENANT_ID),
          isNull(contacts.archivedAt),
          isNull(contacts.mergedIntoId),
          or(
            ilike(contacts.firstName, like),
            ilike(contacts.lastName, like),
            ilike(contacts.email, like),
            sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${like}`,
            sql`(${contacts.lastName} || ', ' || ${contacts.firstName}) ilike ${like}`,
          )!,
        ),
      )
      .orderBy(asc(contacts.lastName), asc(contacts.firstName))
      .limit(10),
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        email: accounts.email,
        dba: accounts.dba,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, DEFAULT_TENANT_ID),
          isNull(accounts.archivedAt),
          isNull(accounts.mergedIntoId),
          or(ilike(accounts.name, like), ilike(accounts.dba, like), ilike(accounts.email, like))!,
        ),
      )
      .orderBy(asc(accounts.name))
      .limit(10),
    db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, DEFAULT_TENANT_ID),
          isNull(leads.archivedAt),
          isNull(leads.mergedIntoId),
          or(
            ilike(leads.firstName, like),
            ilike(leads.lastName, like),
            ilike(leads.email, like),
            sql`(${leads.firstName} || ' ' || ${leads.lastName}) ilike ${like}`,
            sql`(${leads.lastName} || ', ' || ${leads.firstName}) ilike ${like}`,
          )!,
        ),
      )
      .orderBy(asc(leads.lastName), asc(leads.firstName))
      .limit(10),
    db
      .select({
        id: deals.id,
        title: deals.title,
        primaryNamedInsured: deals.primaryNamedInsured,
        contactId: deals.contactId,
        leadId: deals.leadId,
        accountId: deals.accountId,
        contactEmail: contacts.email,
        leadEmail: leads.email,
        accountEmail: accounts.email,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(leads, eq(deals.leadId, leads.id))
      .leftJoin(accounts, eq(deals.accountId, accounts.id))
      .where(
        and(
          eq(deals.tenantId, DEFAULT_TENANT_ID),
          isNull(deals.archivedAt),
          or(
            ilike(deals.title, like),
            ilike(deals.primaryNamedInsured, like),
            ilike(deals.secondaryNamedInsured, like),
            sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${like}`,
            sql`(${leads.firstName} || ' ' || ${leads.lastName}) ilike ${like}`,
            ilike(accounts.name, like),
          )!,
        ),
      )
      .orderBy(asc(deals.title))
      .limit(10),
  ]);

  const contactsHits: ComposeRecipientHit[] = contactRows.map((row) => ({
    kind: "contact",
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim() || "Contact",
    email: row.email,
    contactId: row.id,
  }));
  const accountHits: ComposeRecipientHit[] = accountRows.map((row) => ({
    kind: "account",
    id: row.id,
    name: row.name || row.dba || "Business",
    email: row.email,
    accountId: row.id,
  }));
  const leadHits: ComposeRecipientHit[] = leadRows.map((row) => ({
    kind: "lead",
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim() || "Lead",
    email: row.email,
    leadId: row.id,
  }));
  const dealStoredById = await loadRecordValuesForIds(
    dealRows.map((row) => row.id),
    "deals",
  );

  const dealHits: ComposeRecipientHit[] = dealRows.map((row) => ({
    kind: "deal",
    id: row.id,
    name: row.title || row.primaryNamedInsured || "Deal",
    email: resolvePartyEmail({
      contact: { email: row.contactEmail },
      lead: { email: row.leadEmail },
      account: { email: row.accountEmail },
      dealStored: dealStoredById.get(row.id) ?? {},
    }),
    dealId: row.id,
    contactId: row.contactId,
    leadId: row.leadId,
    accountId: row.accountId,
  }));

  return [...contactsHits, ...leadHits, ...dealHits, ...accountHits].slice(0, 24);
}
