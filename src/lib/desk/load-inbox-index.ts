import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, policies } from "@/lib/db/schema";
import { isInForceStatus } from "@/lib/policy/status";
import { daysUntilExpiration, expirationDay } from "@/lib/ams/renewals";
import { deskNow } from "@/lib/home/as-of";
import { partyLabel } from "@/lib/desk/policy-name";
import { gmailAccountEmail, gmailIsReady } from "@/lib/integrations/gmail";
import {
  dealClosedForInbox,
  type InboxContactHit,
  type InboxDealHit,
  type InboxMatchIndex,
  type InboxRenewalHit,
} from "@/lib/desk/inbox-match";

export async function loadInboxMatchIndex(asOf = deskNow()): Promise<InboxMatchIndex> {
  const ready = await gmailIsReady().catch(() => false);
  const agencyEmail = ready ? await gmailAccountEmail().catch(() => null) : null;
  const [contactRows, dealRows, policyRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
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
        expirationDate: policies.expirationDate,
        status: policies.status,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(policies)
      .leftJoin(contacts, eq(policies.contactId, contacts.id))
      .where(eq(policies.tenantId, DEFAULT_TENANT_ID)),
  ]);

  const contactHits: InboxContactHit[] = contactRows
    .filter((row) => (row.email ?? "").trim())
    .map((row) => ({
      id: row.id,
      name: partyLabel({ firstName: row.firstName, lastName: row.lastName }, null) || "Contact",
      email: row.email ?? "",
    }));

  const dealHits: InboxDealHit[] = dealRows.map((row) => ({
    id: row.id,
    title: row.title,
    contactId: row.contactId,
    closed: dealClosedForInbox(row),
  }));

  const renewalHits: InboxRenewalHit[] = [];
  for (const row of policyRows) {
    if (!isInForceStatus(row.status)) continue;
    const exp = expirationDay(row.expirationDate);
    if (!exp) continue;
    const days = daysUntilExpiration(exp, asOf);
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
    });
  }

  return { agencyEmail, contacts: contactHits, deals: dealHits, renewals: renewalHits };
}
