"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { normalizeRecordSource } from "@/lib/crm/sources";
import { parseNumericInput } from "@/lib/custom-fields/format";
import { listDealFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { formatDealTitle } from "@/lib/deals/deal-title";
import { isPipelineGridEditable } from "@/lib/deals/pipeline-sheet";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads, risks, users } from "@/lib/db/schema";
import { moveDealToStage } from "@/app/actions/pipeline";

export type SaveDealPipelineCellInput = {
  dealId: string;
  columnId: string;
  value: string;
  pipelineSlug?: string;
};

export type SaveDealPipelineCellResult =
  | { ok: true }
  | { ok: false; error: string };

async function resolveLineCode(value: string): Promise<string | null> {
  const { loadAgencyLines } = await import("@/lib/db/agency-lines");
  const { resolveAgencyLine } = await import("@/lib/desk/agency-lines");
  const lines = await loadAgencyLines();
  return resolveAgencyLine(value, lines)?.code ?? null;
}

export async function saveDealPipelineCell(
  input: SaveDealPipelineCellInput,
): Promise<SaveDealPipelineCellResult> {
  const dealId = input.dealId.trim();
  const columnId = input.columnId.trim();
  const value = input.value;
  if (!dealId || !columnId) return { ok: false, error: "Missing deal or field." };

  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  if (!deal) return { ok: false, error: "Deal not found." };

  const fields = await listDealFieldDefs().catch(() => []);
  const field = fields.find((item) => item.key === columnId) ?? null;
  if (!isPipelineGridEditable(columnId, field)) {
    return { ok: false, error: "That column is read-only." };
  }

  if (columnId === "stage") {
    await moveDealToStage({
      dealId,
      pipelineSlug: input.pipelineSlug || "p-c",
      stageSlug: value,
    });
    return { ok: true };
  }

  if (columnId === "line") {
    const resolvedLine = await resolveLineCode(value);
    if (!resolvedLine) return { ok: false, error: "Unknown line of business." };
    const [contact] = deal.contactId
      ? await db.select().from(contacts).where(eq(contacts.id, deal.contactId))
      : [null];
    const [lead] = deal.leadId ? await db.select().from(leads).where(eq(leads.id, deal.leadId)) : [null];
    const [account] = deal.accountId
      ? await db.select().from(accounts).where(eq(accounts.id, deal.accountId))
      : [null];
    const title = formatDealTitle({
      contact,
      lead,
      accountName: account?.name,
      primaryNamedInsured: deal.primaryNamedInsured,
      existingTitle: deal.title,
      line: resolvedLine,
    });
    await db
      .update(deals)
      .set({ lineOfBusiness: resolvedLine, title, updatedAt: new Date() })
      .where(eq(deals.id, dealId));
    return finish(dealId);
  }

  if (columnId === "source") {
    await db
      .update(deals)
      .set({ source: normalizeRecordSource(value, deal.source), updatedAt: new Date() })
      .where(eq(deals.id, dealId));
    return finish(dealId);
  }

  if (columnId === "assigned") {
    if (value) {
      const [owner] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, value)));
      if (!owner) return { ok: false, error: "Unknown owner." };
    }
    await db
      .update(deals)
      .set({ ownerId: value || null, updatedAt: new Date() })
      .where(eq(deals.id, dealId));
    return finish(dealId);
  }

  if (columnId === "value" || columnId === "premium") {
    const amount = parseNumericInput(value);
    await db
      .update(deals)
      .set({
        coverageAmount: amount ? Math.round(Number(amount)) : null,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId));
    return finish(dealId);
  }

  if (columnId === "subType") {
    await db
      .update(deals)
      .set({ policySubType: value.trim() || null, updatedAt: new Date() })
      .where(eq(deals.id, dealId));
    return finish(dealId);
  }

  if (!field) return { ok: false, error: "Unknown field." };

  const stored = field.type === "checkbox" ? (value === "true" || value === "1" || value === "on" ? "true" : "") : value;
  await writeRecordValues(dealId, { [field.key]: stored });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (field.systemKey === "primaryNamedInsured") patch.primaryNamedInsured = stored || null;
  if (field.systemKey === "notes") patch.notes = stored;
  if (field.systemKey === "state") patch.state = stored || null;
  if (field.systemKey === "source") patch.source = normalizeRecordSource(stored, deal.source);
  await db.update(deals).set(patch).where(eq(deals.id, dealId));

  if (
    field.systemKey === "mailingAddress" ||
    field.systemKey === "city" ||
    field.systemKey === "state" ||
    field.systemKey === "zip"
  ) {
    const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
    if (risk) {
      await db
        .update(risks)
        .set({
          address1: field.systemKey === "mailingAddress" ? stored || risk.address1 : risk.address1,
          city: field.systemKey === "city" ? stored || risk.city : risk.city,
          state: field.systemKey === "state" ? stored || risk.state : risk.state,
          zip: field.systemKey === "zip" ? stored || risk.zip : risk.zip,
          updatedAt: new Date(),
        })
        .where(eq(risks.id, risk.id));
    }
  }

  return finish(dealId);
}

function finish(dealId: string): SaveDealPipelineCellResult {
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}
