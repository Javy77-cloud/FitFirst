import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, deskCustomFieldValues, policies } from "@/lib/db/schema";
import { daysUntilExpiration, expirationDay } from "@/lib/ams/renewals";
import { resolveCurrentTerm } from "@/lib/policies/current-term";
import { deskNow } from "@/lib/home/as-of";
import { partyLabel } from "@/lib/desk/policy-name";
import { activeInboxMail } from "@/lib/integrations/mail-provider";
import {
  dealClosedForInbox,
  INBOX_EMAIL_ALIAS_KEY,
  parseInboxAliasEmails,
  type InboxContactHit,
  type InboxDealHit,
  type InboxMatchIndex,
  type InboxRenewalHit,
} from "@/lib/desk/inbox-match";

export async function loadInboxMatchIndex(asOf = deskNow()): Promise<InboxMatchIndex> {
  const mail = await activeInboxMail();
  const agencyEmail = mail ? await mail.accountEmail().catch(() => null) : null;
  const [contactRows, dealRows, policyRows, aliasRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        ownerId: contacts.ownerId,
      })
      .from(contacts)
      .where(
        and(eq(contacts.tenantId, DEFAULT_TENANT_ID), isNull(contacts.archivedAt), isNull(contacts.mergedIntoId)),
      ),
    db
      .select({
        id: deals.id,
        title: deals.title,
        contactId: deals.contactId,
        ownerId: deals.ownerId,
        pipelineStage: deals.pipelineStage,
        pipelineStageSlug: deals.pipelineStageSlug,
        boundAt: deals.boundAt,
        archivedAt: deals.archivedAt,
      })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), isNull(deals.archivedAt))),
    db
      .select({
        id: policies.id,
        contactId: policies.contactId,
        ownerId: policies.ownerId,
        effectiveDate: policies.effectiveDate,
        expirationDate: policies.expirationDate,
        lineOfBusiness: policies.lineOfBusiness,
        policyNumber: policies.policyNumber,
        status: policies.status,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(policies)
      .leftJoin(contacts, eq(policies.contactId, contacts.id))
      .where(eq(policies.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({
        recordId: deskCustomFieldValues.recordId,
        value: deskCustomFieldValues.value,
      })
      .from(deskCustomFieldValues)
      .where(
        and(
          eq(deskCustomFieldValues.tenantId, DEFAULT_TENANT_ID),
          eq(deskCustomFieldValues.module, "contacts"),
          eq(deskCustomFieldValues.fieldKey, INBOX_EMAIL_ALIAS_KEY),
        ),
      )
      .then((rows) => rows)
      .catch(() => [] as { recordId: string; value: string | null }[]),
  ]);

  const aliasesByContact = new Map<string, string[]>();
  for (const row of aliasRows) {
    aliasesByContact.set(row.recordId, parseInboxAliasEmails(row.value));
  }
  const contactHits: InboxContactHit[] = [];
  for (const row of contactRows) {
    const name = partyLabel({ firstName: row.firstName, lastName: row.lastName }, null) || "Contact";
    const emails = new Set<string>();
    const primary = (row.email ?? "").trim();
    if (primary) emails.add(primary);
    for (const alias of aliasesByContact.get(row.id) ?? []) emails.add(alias);
    for (const email of emails) {
      contactHits.push({ id: row.id, name, email, ownerId: row.ownerId });
    }
  }

  const dealHits: InboxDealHit[] = dealRows.map((row) => ({
    id: row.id,
    title: row.title,
    contactId: row.contactId,
    closed: dealClosedForInbox(row),
    ownerId: row.ownerId,
  }));

  const renewalHits: InboxRenewalHit[] = [];
  for (const row of policyRows) {
    const resolved = resolveCurrentTerm(
      {
        status: row.status,
        lineOfBusiness: row.lineOfBusiness,
        policyNumber: row.policyNumber,
        effectiveDate: row.effectiveDate,
        expirationDate: row.expirationDate,
      },
      asOf,
    );
    if (!resolved.countsAsInForce && resolved.band !== "expired") continue;
    const exp = expirationDay(resolved.bookExpiration ?? row.expirationDate);
    if (!exp) continue;
    const days = resolved.daysLeft ?? daysUntilExpiration(exp, asOf);
    if (days > 90 || days < -7) continue;
    renewalHits.push({
      policyId: row.id,
      contactId: row.contactId,
      clientName:
        partyLabel(
          row.firstName || row.lastName ? { firstName: row.firstName ?? "", lastName: row.lastName ?? "" } : null,
          null,
        ) || "Client",
      daysUntil: days,
      ownerId: row.ownerId,
    });
  }

  return { agencyEmail, contacts: contactHits, deals: dealHits, renewals: renewalHits };
}
