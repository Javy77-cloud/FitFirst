"use server";

import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, drivers, piiRevealLogs, policies } from "@/lib/db/schema";
import { decryptPii } from "@/lib/pii/vault";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";

export type PiiEntityType = "contact" | "account" | "driver";
export type PiiFieldKey = "ssn" | "ein" | "license_number";

function canReveal(isAdmin: boolean, ownerId: string | null | undefined, userId: string | null): boolean {
  if (isAdmin) return true;
  if (!userId) return false;
  if (!ownerId) return true;
  return ownerId === userId;
}

export async function revealPiiField(input: {
  entityType: PiiEntityType;
  entityId: string;
  field: PiiFieldKey;
}): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, error: "Sign in required." };

  let plaintext: string | null = null;
  let allowed = session.isAdmin;

  if (input.entityType === "contact" && input.field === "ssn") {
    const [row] = await db
      .select({
        ownerId: contacts.ownerId,
        ssnEnc: contacts.ssnEnc,
        ssnIv: contacts.ssnIv,
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, input.entityId)));
    if (!row?.ssnEnc || !row.ssnIv) return { ok: false, error: "No SSN on file." };
    allowed = canReveal(session.isAdmin, row.ownerId, session.userId);
    if (allowed) plaintext = decryptPii(row.ssnEnc, row.ssnIv);
  } else if (input.entityType === "account" && input.field === "ein") {
    const [row] = await db
      .select({ einEnc: accounts.einEnc, einIv: accounts.einIv })
      .from(accounts)
      .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, input.entityId)));
    if (!row?.einEnc || !row.einIv) return { ok: false, error: "No EIN on file." };
    if (!session.isAdmin) {
      const owned = await db
        .select({ id: policies.id })
        .from(policies)
        .where(
          and(
            eq(policies.tenantId, DEFAULT_TENANT_ID),
            eq(policies.accountId, input.entityId),
            eq(policies.ownerId, session.userId ?? ""),
          ),
        );
      const linked = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, DEFAULT_TENANT_ID),
            eq(contacts.accountId, input.entityId),
            eq(contacts.ownerId, session.userId ?? ""),
          ),
        );
      allowed = owned.length > 0 || linked.length > 0 || session.isAdmin;
    }
    if (allowed) plaintext = decryptPii(row.einEnc, row.einIv);
  } else if (input.entityType === "contact" && input.field === "license_number") {
    const [row] = await db
      .select({
        ownerId: contacts.ownerId,
        licenseNumberEnc: contacts.licenseNumberEnc,
        licenseNumberIv: contacts.licenseNumberIv,
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, input.entityId)));
    if (!row?.licenseNumberEnc || !row.licenseNumberIv) {
      return { ok: false, error: "No license on file." };
    }
    allowed = canReveal(session.isAdmin, row.ownerId, session.userId);
    if (allowed) plaintext = decryptPii(row.licenseNumberEnc, row.licenseNumberIv);
  } else if (input.entityType === "driver" && input.field === "license_number") {
    const [row] = await db
      .select({
        contactId: drivers.contactId,
        policyId: drivers.policyId,
        licenseNumberEnc: drivers.licenseNumberEnc,
        licenseNumberIv: drivers.licenseNumberIv,
      })
      .from(drivers)
      .where(and(eq(drivers.tenantId, DEFAULT_TENANT_ID), eq(drivers.id, input.entityId)));
    if (!row?.licenseNumberEnc || !row.licenseNumberIv) {
      return { ok: false, error: "No license on file." };
    }
    if (!session.isAdmin) {
      let ownerId: string | null = null;
      if (row.contactId) {
        const [contact] = await db
          .select({ ownerId: contacts.ownerId })
          .from(contacts)
          .where(eq(contacts.id, row.contactId));
        ownerId = contact?.ownerId ?? null;
      }
      if (!ownerId && row.policyId) {
        const [policy] = await db
          .select({ ownerId: policies.ownerId })
          .from(policies)
          .where(eq(policies.id, row.policyId));
        ownerId = policy?.ownerId ?? null;
      }
      allowed = canReveal(false, ownerId, session.userId);
    }
    if (allowed) plaintext = decryptPii(row.licenseNumberEnc, row.licenseNumberIv);
  } else {
    return { ok: false, error: "Unknown field." };
  }

  if (!allowed || !plaintext) return { ok: false, error: "Not authorized to reveal." };

  await db.insert(piiRevealLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    actorId: session.userId,
    actorName: session.name,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldKey: input.field,
  });

  await writeEoAuditSafe({
    action: "reveal_pii",
    summary: `Revealed ${input.field.replaceAll("_", " ")} on ${input.entityType}`,
    actorId: session.userId,
    actorName: session.name,
    entityType: input.entityType,
    entityId: input.entityId,
    contactId: input.entityType === "contact" ? input.entityId : null,
    accountId: input.entityType === "account" ? input.entityId : null,
    meta: { fieldKey: input.field },
  });

  return { ok: true, value: plaintext };
}
