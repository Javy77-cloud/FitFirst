"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import {
  ROSA_ALARM_DOCUMENT_ID,
  ROSA_GATHERING_DEAL_ID,
  ROSA_WIND_MIT_DOCUMENT_ID,
  rosaGatheringRetagDecision,
} from "@/lib/deals/rosa-gathering-sources";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";

const ROSA_GATHERING_DOCUMENT_IDS = [ROSA_WIND_MIT_DOCUMENT_ID, ROSA_ALARM_DOCUMENT_ID];

/** Idempotent. Retags the two gathering-deal source docs that were saved as other. */
export async function ensureRosaGatheringSourceRetag() {
  const rows = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.tenantId, DEFAULT_TENANT_ID), inArray(documents.id, ROSA_GATHERING_DOCUMENT_IDS)),
    );
  const results: { id: string; action: string; docType?: string; reason?: string }[] = [];
  for (const id of ROSA_GATHERING_DOCUMENT_IDS) {
    const doc = rows.find((row) => row.id === id);
    if (!doc) {
      results.push({ id, action: "skip", reason: "missing" });
      continue;
    }
    const decision = rosaGatheringRetagDecision(doc);
    if (decision.action !== "retag") {
      results.push({ id, ...decision });
      continue;
    }
    await db
      .update(documents)
      .set({ docType: decision.docType, slot: "source_doc" })
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, id)));
    results.push({ id, action: "retag", docType: decision.docType });
  }
  revalidatePath(`/deals/${ROSA_GATHERING_DEAL_ID}`);
  return { ok: true as const, dealId: ROSA_GATHERING_DEAL_ID, results };
}
