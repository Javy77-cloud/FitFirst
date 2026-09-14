"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import {
  sessionCanRevealPortal,
  sessionCanWritePortal,
} from "@/lib/policy/agent-policy-access-prefs";
import {
  quoteHandoffReadiness,
  replacePortalPassword,
  replacePortalUsername,
} from "@/lib/carriers/secrets";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carrierActivityEvents, carrierSecretRevealLogs, carriers } from "@/lib/db/schema";
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


async function recordCredentialFailure(input: {
  carrierId: string;
  actorId: string | null;
  actorName: string;
  title: string;
  reason: string;
}) {
  await db.insert(carrierActivityEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    carrierId: input.carrierId,
    kind: "credential",
    title: input.title,
    detail: input.reason.slice(0, 200),
    actorId: input.actorId,
    actorName: input.actorName,
    occurredAt: new Date(),
  });
}

export async function revealCarrierPortalSecret(input: {
  carrierId: string;
  field: CarrierSecretField;
}): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!(await sessionCanRevealPortal(session))) {
    return { ok: false, error: "Portal credentials are off for agents." };
  }

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
      const error = "No portal username on file.";
      await recordCredentialFailure({
        carrierId: input.carrierId,
        actorId: session.userId,
        actorName: session.name,
        title: "Credential reveal failed",
        reason: error,
      });
      return { ok: false, error };
    }
    plaintext = decryptSecret(row.portalUsernameEnc, row.portalUsernameIv);
  } else if (input.field === "password") {
    if (!row.portalPasswordEnc || !row.portalPasswordIv) {
      const error = "No portal password on file.";
      await recordCredentialFailure({
        carrierId: input.carrierId,
        actorId: session.userId,
        actorName: session.name,
        title: "Credential reveal failed",
        reason: error,
      });
      return { ok: false, error };
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
  reachable: boolean;
  statusCode: number | null;
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

  const { pingPortalUrl } = await import("@/lib/carriers/secrets");
  const ping = await pingPortalUrl(row.portalUrl);

  await writeRevealLog({
    carrierId,
    actorId: session.userId,
    actorName: session.name,
    fieldKey: ping.reachable ? "readiness_check_ok" : "readiness_check_fail",
  });

  if (!ping.reachable) {
    const bits = [
      ping.error?.trim() || "Portal URL unreachable or returned an error.",
      ping.statusCode != null ? `HTTP ${ping.statusCode}` : null,
    ].filter(Boolean);
    await db.insert(carrierActivityEvents).values({
      tenantId: DEFAULT_TENANT_ID,
      carrierId,
      kind: "credential",
      title: "Readiness check failed",
      detail: bits.join(" · ").slice(0, 200),
      actorId: session.userId,
      actorName: session.name,
      occurredAt: new Date(),
    });
  }

  await writeRevealLog({
    carrierId,
    actorId: session.userId,
    actorName: session.name,
    fieldKey: "handoff_check",
  });

  return {
    ok: true,
    ready: readiness.ready,
    missing: readiness.missing,
    reachable: ping.reachable,
    statusCode: ping.statusCode,
  };
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
    .limit(40);
}


export async function saveCarrierPortalCredentials(input: {
  carrierId: string;
  username?: string | null;
  password?: string | null;
  agencyCode?: string | null;
}): Promise<
  | {
      ok: true;
      hasUsername: boolean;
      hasPassword: boolean;
      usernameHint: string | null;
      agencyCode: string | null;
      ready: boolean;
      missing: string[];
    }
  | { ok: false; error: string }
> {
  const session = await currentDeskSession();
  if (!(await sessionCanWritePortal(session))) {
    return { ok: false, error: "Portal write is off for agents." };
  }

  const carrierId = (input.carrierId ?? "").trim();
  if (!carrierId) return { ok: false, error: "Carrier required." };

  const [row] = await db
    .select({
      id: carriers.id,
      portalUrl: carriers.portalUrl,
      agencyCode: carriers.agencyCode,
      portalUsernameEnc: carriers.portalUsernameEnc,
      portalUsernameIv: carriers.portalUsernameIv,
      portalUsernameHint: carriers.portalUsernameHint,
      portalPasswordEnc: carriers.portalPasswordEnc,
      portalPasswordIv: carriers.portalPasswordIv,
    })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));

  if (!row) return { ok: false, error: "Carrier not found." };

  const usernameIn = (input.username ?? "").trim();
  const passwordIn = (input.password ?? "").trim();
  const agencyCodeProvided = Object.prototype.hasOwnProperty.call(input, "agencyCode");
  const nextAgencyCode = agencyCodeProvided
    ? (input.agencyCode ?? "").trim() || null
    : row.agencyCode;
  const usernameTouched = Boolean(usernameIn);
  const passwordTouched = Boolean(passwordIn);
  const agencyTouched =
    agencyCodeProvided && (nextAgencyCode ?? "") !== (row.agencyCode ?? "");

  const usernamePatch = usernameTouched
    ? replacePortalUsername(usernameIn, row)
    : {
        portalUsernameEnc: row.portalUsernameEnc,
        portalUsernameIv: row.portalUsernameIv,
        portalUsernameHint: row.portalUsernameHint,
      };
  const passwordPatch = passwordTouched
    ? replacePortalPassword(passwordIn, row)
    : {
        portalPasswordEnc: row.portalPasswordEnc,
        portalPasswordIv: row.portalPasswordIv,
      };

  if (!usernameTouched && !passwordTouched && !agencyTouched && !agencyCodeProvided) {
    return { ok: false, error: "Enter a username, password, and/or agency code to save." };
  }
  // If only agencyCode was provided (even same value), allow save when drafts empty after first fill
  if (!usernameTouched && !passwordTouched && agencyCodeProvided && !agencyTouched && !usernameIn && !passwordIn) {
    // still ok to re-save agency code field explicitly
  }

  const now = new Date();
  await db
    .update(carriers)
    .set({
      ...usernamePatch,
      ...passwordPatch,
      ...(agencyCodeProvided ? { agencyCode: nextAgencyCode } : {}),
      portalSecretsUpdatedAt: now,
      updatedAt: now,
    })
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));

  await writeRevealLog({
    carrierId,
    actorId: session.userId,
    actorName: session.name,
    fieldKey: "credentials_saved",
  });

  const hasUsername = Boolean(usernamePatch.portalUsernameEnc && usernamePatch.portalUsernameIv);
  const hasPassword = Boolean(passwordPatch.portalPasswordEnc && passwordPatch.portalPasswordIv);
  const readiness = quoteHandoffReadiness({
    portalUrl: row.portalUrl,
    agencyCode: agencyCodeProvided ? nextAgencyCode : row.agencyCode,
    hasPortalUsername: hasUsername,
    hasPortalPassword: hasPassword,
  });

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);

  return {
    ok: true,
    hasUsername,
    hasPassword,
    usernameHint: usernamePatch.portalUsernameHint,
    agencyCode: agencyCodeProvided ? nextAgencyCode : row.agencyCode,
    ready: readiness.ready,
    missing: readiness.missing,
  };
}
