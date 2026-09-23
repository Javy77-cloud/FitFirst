"use server";

import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { listEmailTemplates } from "@/lib/db/template-queries";
import { resolveOutboundEmailSignature } from "@/lib/desk/outbound-email-signature";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts } from "@/lib/db/schema";

export type QuickCommsEmailTemplateOption = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export type ComposeRecipientHit = {
  kind: "contact" | "account";
  id: string;
  name: string;
  email: string | null;
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

/** Live To typeahead for shared compose: contacts + accounts (businesses). */
export async function searchComposeRecipients(query: string): Promise<ComposeRecipientHit[]> {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q.replace(/[%_]/g, "")}%`;

  const contactRows = await db
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
    .limit(12);

  const accountRows = await db
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
    .limit(12);

  const contactsHits: ComposeRecipientHit[] = contactRows.map((row) => ({
    kind: "contact",
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim() || "Contact",
    email: row.email,
  }));
  const accountHits: ComposeRecipientHit[] = accountRows.map((row) => ({
    kind: "account",
    id: row.id,
    name: row.name || row.dba || "Business",
    email: row.email,
  }));

  return [...contactsHits, ...accountHits].slice(0, 20);
}
