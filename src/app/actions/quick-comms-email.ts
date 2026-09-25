"use server";

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { listEmailTemplates } from "@/lib/db/template-queries";
import { deskFallbackCopy } from "@/lib/templates/revision";
import { resolveOutboundEmailSignature } from "@/lib/desk/outbound-email-signature";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads } from "@/lib/db/schema";
import { resolvePartyEmail } from "@/lib/comms/resolve-party-email";
import { loadRecordValuesForIds } from "@/lib/custom-fields/store";
import type { ComposeOpenPrefill } from "@/lib/comms/compose-open-prefill";
import {
  composeOpenHasRecordContext,
  composeOpenPrefillFromParty,
} from "@/lib/comms/compose-open-prefill";

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
  return rows.flatMap((row) => {
    const resolved = deskFallbackCopy(row.slug, row);
    if (!resolved.send) return [];
    return [
      {
        id: row.id,
        name: row.name,
        subject: resolved.subject || row.name,
        body: resolved.body,
      },
    ];
  });
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

/** Open Compose prefill: contact → lead → account → deal CF. Blank when no record ids (Inbox). */
export async function resolveComposeOpenPrefill(related: {
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
}): Promise<ComposeOpenPrefill> {
  if (!composeOpenHasRecordContext(related)) {
    return { email: null, name: null };
  }

  const [contactRow, leadRow, accountRow, dealRow, dealStoredMap] = await Promise.all([
    related.contactId
      ? db
          .select({
            email: contacts.email,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
          })
          .from(contacts)
          .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, related.contactId)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    related.leadId
      ? db
          .select({
            email: leads.email,
            firstName: leads.firstName,
            lastName: leads.lastName,
          })
          .from(leads)
          .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, related.leadId)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    related.accountId
      ? db
          .select({
            email: accounts.email,
            name: accounts.name,
            dba: accounts.dba,
          })
          .from(accounts)
          .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, related.accountId)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    related.dealId
      ? db
          .select({
            title: deals.title,
            primaryNamedInsured: deals.primaryNamedInsured,
            contactId: deals.contactId,
            leadId: deals.leadId,
            accountId: deals.accountId,
          })
          .from(deals)
          .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, related.dealId)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    related.dealId
      ? loadRecordValuesForIds([related.dealId], "deals")
      : Promise.resolve(new Map<string, Record<string, string>>()),
  ]);

  let contact = contactRow;
  let lead = leadRow;
  let account = accountRow;
  if (dealRow && (!contact || !lead || !account)) {
    const [linkedContact, linkedLead, linkedAccount] = await Promise.all([
      !contact && dealRow.contactId
        ? db
            .select({
              email: contacts.email,
              firstName: contacts.firstName,
              lastName: contacts.lastName,
            })
            .from(contacts)
            .where(
              and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, dealRow.contactId)),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(contact),
      !lead && dealRow.leadId
        ? db
            .select({
              email: leads.email,
              firstName: leads.firstName,
              lastName: leads.lastName,
            })
            .from(leads)
            .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, dealRow.leadId)))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(lead),
      !account && dealRow.accountId
        ? db
            .select({
              email: accounts.email,
              name: accounts.name,
              dba: accounts.dba,
            })
            .from(accounts)
            .where(
              and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, dealRow.accountId)),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(account),
    ]);
    contact = linkedContact;
    lead = linkedLead;
    account = linkedAccount;
  }

  return composeOpenPrefillFromParty({
    contact,
    lead,
    account,
    deal: dealRow,
    dealStored: related.dealId ? (dealStoredMap.get(related.dealId) ?? {}) : {},
  });
}
