import { and, desc, eq, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "./index";
import {
  accounts,
  claimActivity,
  claimAttachments,
  claimNotes,
  claims,
  contacts,
  policies,
  users,
} from "./schema";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export type DeskClaimRow = {
  claim: typeof claims.$inferSelect;
  policy: typeof policies.$inferSelect | null;
  contact: typeof contacts.$inferSelect | null;
  producer: { id: string; name: string } | null;
};

export async function listDeskClaims(): Promise<DeskClaimRow[]> {
  const rows = await db
    .select({
      claim: claims,
      policy: policies,
      contact: contacts,
      producerId: users.id,
      producerName: users.name,
    })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(claims.contactId, contacts.id))
    .leftJoin(users, eq(claims.producerId, users.id))
    .where(eq(claims.tenantId, tenant()))
    .orderBy(desc(claims.dateReported), desc(claims.createdAt));

  return rows.map((row) => ({
    claim: row.claim,
    policy: row.policy,
    contact: row.contact,
    producer: row.producerId && row.producerName ? { id: row.producerId, name: row.producerName } : null,
  }));
}

export async function getClaimWorkspace(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      claim: claims,
      policy: policies,
      contact: contacts,
      account: accounts,
      producerId: users.id,
      producerName: users.name,
    })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(claims.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(users, eq(claims.producerId, users.id))
    .where(and(eq(claims.tenantId, tenant()), eq(claims.id, id)));
  if (!row) return null;

  const [notes, files, activity] = await Promise.all([
    db
      .select()
      .from(claimNotes)
      .where(and(eq(claimNotes.tenantId, tenant()), eq(claimNotes.claimId, id)))
      .orderBy(desc(claimNotes.createdAt)),
    db
      .select()
      .from(claimAttachments)
      .where(and(eq(claimAttachments.tenantId, tenant()), eq(claimAttachments.claimId, id)))
      .orderBy(desc(claimAttachments.createdAt)),
    db
      .select()
      .from(claimActivity)
      .where(and(eq(claimActivity.tenantId, tenant()), eq(claimActivity.claimId, id)))
      .orderBy(desc(claimActivity.createdAt)),
  ]);

  return {
    claim: row.claim,
    policy: row.policy,
    contact: row.contact,
    account: row.account,
    producer: row.producerId && row.producerName ? { id: row.producerId, name: row.producerName } : null,
    notes,
    files,
    activity,
  };
}

export async function listClaimsForContact(contactId: string) {
  if (!isUuid(contactId)) return [];
  return db
    .select({ claim: claims, policy: policies, contact: contacts })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(claims.contactId, contacts.id))
    .where(
      and(
        eq(claims.tenantId, tenant()),
        or(eq(claims.contactId, contactId), eq(policies.contactId, contactId)),
      ),
    )
    .orderBy(desc(claims.dateReported));
}

export async function listClaimsForPolicy(policyId: string) {
  if (!isUuid(policyId)) return [];
  return db
    .select({ claim: claims, policy: policies, contact: contacts })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(claims.contactId, contacts.id))
    .where(and(eq(claims.tenantId, tenant()), eq(claims.policyId, policyId)))
    .orderBy(desc(claims.dateReported));
}

export async function listClaimPartyOptions() {
  const [policyRows, contactRows] = await Promise.all([
    db
      .select({
        policy: policies,
        contact: contacts,
        account: accounts,
      })
      .from(policies)
      .leftJoin(contacts, eq(policies.contactId, contacts.id))
      .leftJoin(accounts, eq(policies.accountId, accounts.id))
      .where(eq(policies.tenantId, tenant()))
      .orderBy(policies.policyNumber),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        ownerId: contacts.ownerId,
      })
      .from(contacts)
      .where(eq(contacts.tenantId, tenant()))
      .orderBy(contacts.lastName, contacts.firstName),
  ]);

  return {
    policies: policyRows.map(({ policy, contact, account }) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      lineOfBusiness: policy.lineOfBusiness,
      contactId: policy.contactId,
      ownerId: policy.ownerId,
      party: contact
        ? `${contact.lastName}, ${contact.firstName}`
        : account?.name ?? null,
    })),
    contacts: contactRows.map((row) => ({
      id: row.id,
      label: `${row.lastName}, ${row.firstName}`,
      ownerId: row.ownerId,
    })),
  };
}
