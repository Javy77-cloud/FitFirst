/**
 * One-shot: merge duplicate Progressive carriers into the Connected survivor.
 * Survivor: 33333333-3333-4333-8333-333333333322 (portal URL + user + pass)
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  appetiteEngineRules,
  appetiteRules,
  appetiteShadowPredictions,
  carrierActivityEvents,
  carrierAmBestHistory,
  carrierAppointments,
  carrierGoals,
  carrierSecretRevealLogs,
  carriers,
  commissions,
  fillFeedbackLogs,
  fillLearningLogs,
  policies,
  quoteAttemptLogs,
  quotes,
} from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

const KEEP = "33333333-3333-4333-8333-333333333322";
const DROPS = [
  "a0a00000-0000-4000-8000-000000000007",
  "1d29f707-67e5-4e64-8528-2a0f58ad92a4",
];

function fillText(a: string | null | undefined, b: string | null | undefined): string | null {
  const left = (a ?? "").trim();
  if (left) return a ?? null;
  const right = (b ?? "").trim();
  return right ? (b ?? null) : null;
}

async function mergeOne(keepId: string, dropId: string) {
  const [keep] = await db
    .select()
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, keepId)));
  const [drop] = await db
    .select()
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, dropId)));
  if (!keep || !drop) {
    console.log("skip missing", keepId, dropId);
    return;
  }

  const keepHasUser = Boolean(keep.portalUsernameEnc && keep.portalUsernameIv);
  const keepHasPass = Boolean(keep.portalPasswordEnc && keep.portalPasswordIv);

  await db
    .update(carriers)
    .set({
      agencyCode: fillText(keep.agencyCode, drop.agencyCode),
      website: fillText(keep.website, drop.website),
      phone: fillText(keep.phone, drop.phone),
      email: fillText(keep.email, drop.email),
      mailingAddress: fillText(keep.mailingAddress, drop.mailingAddress),
      portalUrl: fillText(keep.portalUrl, drop.portalUrl),
      agentPortalUrl: fillText(keep.agentPortalUrl, drop.agentPortalUrl),
      portalLogin: fillText(keep.portalLogin, drop.portalLogin),
      portalUsernameEnc: keepHasUser ? keep.portalUsernameEnc : drop.portalUsernameEnc,
      portalUsernameIv: keepHasUser ? keep.portalUsernameIv : drop.portalUsernameIv,
      portalUsernameHint: keepHasUser ? keep.portalUsernameHint : drop.portalUsernameHint,
      portalPasswordEnc: keepHasPass ? keep.portalPasswordEnc : drop.portalPasswordEnc,
      portalPasswordIv: keepHasPass ? keep.portalPasswordIv : drop.portalPasswordIv,
      writtenLines: (keep.writtenLines?.length ?? 0) > 0 ? keep.writtenLines : drop.writtenLines,
      active: true,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, keepId));

  await db.update(policies).set({ carrierId: keepId }).where(eq(policies.carrierId, dropId));
  await db.update(quotes).set({ carrierId: keepId }).where(eq(quotes.carrierId, dropId));
  await db.update(quoteAttemptLogs).set({ carrierId: keepId }).where(eq(quoteAttemptLogs.carrierId, dropId));
  await db.update(commissions).set({ carrierId: keepId }).where(eq(commissions.carrierId, dropId));
  await db.update(fillFeedbackLogs).set({ carrierId: keepId }).where(eq(fillFeedbackLogs.carrierId, dropId));
  await db.update(fillLearningLogs).set({ carrierId: keepId }).where(eq(fillLearningLogs.carrierId, dropId));
  await db.update(carrierSecretRevealLogs).set({ carrierId: keepId }).where(eq(carrierSecretRevealLogs.carrierId, dropId));
  await db.update(carrierAmBestHistory).set({ carrierId: keepId }).where(eq(carrierAmBestHistory.carrierId, dropId));
  await db.update(carrierActivityEvents).set({ carrierId: keepId }).where(eq(carrierActivityEvents.carrierId, dropId));
  await db.update(carrierAppointments).set({ carrierId: keepId }).where(eq(carrierAppointments.carrierId, dropId));
  await db.update(carrierGoals).set({ carrierId: keepId }).where(eq(carrierGoals.carrierId, dropId));
  await db.update(appetiteEngineRules).set({ carrierId: keepId }).where(eq(appetiteEngineRules.carrierId, dropId));
  await db.update(appetiteShadowPredictions).set({ carrierId: keepId }).where(eq(appetiteShadowPredictions.carrierId, dropId));

  const keepRules = await db
    .select({ id: appetiteRules.id })
    .from(appetiteRules)
    .where(and(eq(appetiteRules.tenantId, DEFAULT_TENANT_ID), eq(appetiteRules.carrierId, keepId)))
    .limit(1);
  if (keepRules.length === 0) {
    await db.update(appetiteRules).set({ carrierId: keepId }).where(eq(appetiteRules.carrierId, dropId));
  } else {
    await db.delete(appetiteRules).where(eq(appetiteRules.carrierId, dropId));
  }

  await db
    .update(carriers)
    .set({
      active: false,
      deskStatus: "inactive",
      name: `${drop.name} (merged)`,
      carrierInfo: sql`coalesce(${carriers.carrierInfo}, '') || ${"\n[Merged into " + keepId + "]"}`,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, dropId));

  console.log("merged", dropId, "->", keepId);
}

async function main() {
  for (const dropId of DROPS) {
    await mergeOne(KEEP, dropId);
  }
  const left = await db
    .select({ id: carriers.id, name: carriers.name, active: carriers.active })
    .from(carriers)
    .where(sql`lower(trim(${carriers.name})) like 'progressive%'`);
  console.log("progressive rows after:", left);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
