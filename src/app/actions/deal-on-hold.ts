"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { clientHistory, deals, deskModuleTags } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  dealHasOnHoldTag,
  ON_HOLD_EVENT,
  ON_HOLD_LABEL,
  ON_HOLD_RESTORED_EVENT,
  ON_HOLD_TAG,
  onHoldHistoryBody,
  onHoldRestoredHistoryBody,
  withOnHoldTag,
  withoutOnHoldTag,
} from "@/lib/deals/on-hold";
import { normalizeTags } from "@/lib/tags/module-tags";
import { writeRecordTags } from "@/app/actions/record-tags";

async function ensureOnHoldCatalogTag() {
  const actor = await getActor().catch(() => null);
  await db
    .insert(deskModuleTags)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      module: "deals",
      name: ON_HOLD_TAG,
      color: null,
      createdBy: actor?.id ?? null,
    })
    .onConflictDoNothing({
      target: [deskModuleTags.tenantId, deskModuleTags.module, deskModuleTags.name],
    });
}

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)))
    .limit(1);
  return deal ?? null;
}

async function writeHistory(input: {
  dealId: string;
  contactId: string | null;
  eventType: string;
  body: string;
}) {
  if (!input.contactId) return;
  await db.insert(clientHistory).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId: input.contactId,
    dealId: input.dealId,
    eventType: input.eventType,
    body: input.body,
  });
}

function revalidateDeal(dealId: string, contactId: string | null) {
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function holdDeal(input: {
  dealId: string;
  note?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const dealId = String(input.dealId ?? "").trim();
  if (!dealId) return { ok: false, error: "Deal required" };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false, error: "Deal not found" };
  if (deal.archivedAt) return { ok: false, error: "Archived deals stay archived — not On hold" };

  await ensureOnHoldCatalogTag();
  const next = withOnHoldTag(normalizeTags(deal.tags));
  await writeRecordTags("deals", dealId, next);
  await writeHistory({
    dealId,
    contactId: deal.contactId,
    eventType: ON_HOLD_EVENT,
    body: onHoldHistoryBody(input.note),
  });
  // Stage / product state intentionally untouched.
  revalidateDeal(dealId, deal.contactId);
  return { ok: true };
}

export async function restoreDealFromHold(input: {
  dealId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const dealId = String(input.dealId ?? "").trim();
  if (!dealId) return { ok: false, error: "Deal required" };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false, error: "Deal not found" };
  if (!dealHasOnHoldTag(deal.tags)) {
    return { ok: false, error: `Deal is not ${ON_HOLD_LABEL}` };
  }

  const next = withoutOnHoldTag(normalizeTags(deal.tags));
  await writeRecordTags("deals", dealId, next);
  await writeHistory({
    dealId,
    contactId: deal.contactId,
    eventType: ON_HOLD_RESTORED_EVENT,
    body: onHoldRestoredHistoryBody(),
  });
  revalidateDeal(dealId, deal.contactId);
  return { ok: true };
}
