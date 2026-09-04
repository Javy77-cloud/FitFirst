"use server";

import { and, desc, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { quoteHandoffReadiness } from "@/lib/carriers/secrets";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carrierSecretRevealLogs, carriers } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/secrets/vault";

export type CarrierSecretField = "username" | "password";

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

async function writeRevealLog(input: {
  carrierId: string;
  actorId: string | null;
  actorName: string;
  fieldKey: string;
}) {
  await db.insert(carrierSecretRevealLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    carrierId: input.carrierId,
    actorId: input.actorId,
    actorName: input.actorName,
    fieldKey: input.fieldKey,
  });
}

export async function revealCarrierPortalSecret(input: {
  carrierId: string;
  field: CarrierSecretField;
}): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.isAdmin) return { ok: false, error: "Admin only." };

  const [row] = await db
    .select({
      portalUsernameEnc: carriers.portalUsernameEnc,
      portalUsernameIv: carriers.portalUsernameIv,
      portalPasswordEnc: carriers.portalPasswordEnc,
      portalPasswordIv: carriers.portalPasswordIv,
    })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, input.carrierId)));

  if (!row) return { ok: false, error: "Carrier not found." };

  let plaintext: string | null = null;
  if (input.field === "username") {
    if (!row.portalUsernameEnc || !row.portalUsernameIv) {
      return { ok: false, error: "No portal username on file." };
    }
    plaintext = decryptSecret(row.portalUsernameEnc, row.portalUsernameIv);
  } else if (input.field === "password") {
    if (!row.portalPasswordEnc || !row.portalPasswordIv) {
      return { ok: false, error: "No portal password on file." };
    }
    plaintext = decryptSecret(row.portalPasswordEnc, row.portalPasswordIv);
  } else {
    return { ok: false, error: "Unknown field." };
  }

  await writeRevealLog({
    carrierId: input.carrierId,
    actorId: session.userId,
    actorName: session.name,
    fieldKey: input.field,
  });

  return { ok: true, value: plaintext };
}

export async function logQuoteHandoffCheck(carrierId: string): Promise<{
  ok: true;
  ready: boolean;
  missing: string[];
} | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.isAdmin) return { ok: false, error: "Admin only." };

  const [row] = await db
    .select({
      portalUrl: carriers.portalUrl,
      agencyCode: carriers.agencyCode,
      portalUsernameEnc: carriers.portalUsernameEnc,
      portalPasswordEnc: carriers.portalPasswordEnc,
    })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));

  if (!row) return { ok: false, error: "Carrier not found." };

  const readiness = quoteHandoffReadiness({
    portalUrl: row.portalUrl,
    agencyCode: row.agencyCode,
    hasPortalUsername: Boolean(row.portalUsernameEnc),
    hasPortalPassword: Boolean(row.portalPasswordEnc),
  });

  await writeRevealLog({
    carrierId,
    actorId: session.userId,
    actorName: session.name,
    fieldKey: "handoff_check",
  });

  return { ok: true, ready: readiness.ready, missing: readiness.missing };
}

export async function listCarrierSecretAudits(carrierId: string) {
  await assertAdmin();
  return db
    .select({
      id: carrierSecretRevealLogs.id,
      fieldKey: carrierSecretRevealLogs.fieldKey,
      actorName: carrierSecretRevealLogs.actorName,
      createdAt: carrierSecretRevealLogs.createdAt,
    })
    .from(carrierSecretRevealLogs)
    .where(
      and(
        eq(carrierSecretRevealLogs.tenantId, DEFAULT_TENANT_ID),
        eq(carrierSecretRevealLogs.carrierId, carrierId),
      ),
    )
    .orderBy(desc(carrierSecretRevealLogs.createdAt))
    .limit(8);
}
