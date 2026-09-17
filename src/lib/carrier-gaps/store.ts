import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carrierMissingQuestions, type CarrierMissingQuestion } from "@/lib/db/schema";
import { draftGapFromQuoteNeed } from "@/lib/carrier-gaps/promote";
import {
  gapDedupeKey,
  parseGapStatus,
  parseGapSurface,
  productLineLabel,
  type GapStatus,
  type GapSurface,
} from "@/lib/carrier-gaps/types";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export type MissingQuestionInput = {
  note: string;
  productLine: string;
  carrier?: string | null;
  suggestedSurface?: GapSurface | string | null;
  sourceQuoteNoteId?: string | null;
  createdBy?: string | null;
};

function normalizeInput(input: MissingQuestionInput) {
  const note = input.note.trim();
  const productLine = productLineLabel(input.productLine);
  const carrier = input.carrier?.trim() || null;
  const suggestedSurface = parseGapSurface(input.suggestedSurface);
  return { note, productLine, carrier, suggestedSurface };
}

export async function listMissingQuestions(status: GapStatus | "all" = "all") {
  const rows = await db
    .select()
    .from(carrierMissingQuestions)
    .where(
      status === "all"
        ? eq(carrierMissingQuestions.tenantId, tenant())
        : and(
            eq(carrierMissingQuestions.tenantId, tenant()),
            eq(carrierMissingQuestions.status, status),
          ),
    )
    .orderBy(desc(carrierMissingQuestions.createdAt));
  return rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return 0;
  });
}

export async function countOpenMissingQuestions(): Promise<number> {
  const rows = await listMissingQuestions("open");
  return rows.length;
}

async function findOpenDuplicate(input: ReturnType<typeof normalizeInput>) {
  const open = await db
    .select()
    .from(carrierMissingQuestions)
    .where(
      and(
        eq(carrierMissingQuestions.tenantId, tenant()),
        eq(carrierMissingQuestions.status, "open"),
        eq(carrierMissingQuestions.note, input.note),
      ),
    );
  const key = gapDedupeKey(input);
  return (
    open.find((row) =>
      gapDedupeKey({
        note: row.note,
        productLine: row.productLine,
        carrier: row.carrier,
      }) === key,
    ) ?? null
  );
}

async function findBySourceNote(sourceQuoteNoteId: string) {
  const [row] = await db
    .select()
    .from(carrierMissingQuestions)
    .where(
      and(
        eq(carrierMissingQuestions.tenantId, tenant()),
        eq(carrierMissingQuestions.sourceQuoteNoteId, sourceQuoteNoteId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createMissingQuestion(
  input: MissingQuestionInput,
): Promise<{ row: CarrierMissingQuestion; created: boolean }> {
  const next = normalizeInput(input);
  if (!next.note) throw new Error("Note is required.");
  if (!next.productLine) throw new Error("Product line is required.");

  const sourceId = input.sourceQuoteNoteId?.trim() || null;
  if (sourceId) {
    const existing = await findBySourceNote(sourceId);
    if (existing) return { row: existing, created: false };
  }

  const duplicate = await findOpenDuplicate(next);
  if (duplicate) return { row: duplicate, created: false };

  const [row] = await db
    .insert(carrierMissingQuestions)
    .values({
      tenantId: tenant(),
      note: next.note,
      productLine: next.productLine,
      carrier: next.carrier,
      suggestedSurface: next.suggestedSurface,
      status: "open",
      sourceQuoteNoteId: sourceId,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  if (!row) throw new Error("Could not save the missing question.");
  return { row, created: true };
}

export async function updateMissingQuestion(input: {
  id: string;
  note: string;
  productLine: string;
  carrier?: string | null;
  suggestedSurface?: string | null;
  status?: string | null;
}): Promise<CarrierMissingQuestion> {
  const next = normalizeInput(input);
  if (!next.note) throw new Error("Note is required.");
  if (!next.productLine) throw new Error("Product line is required.");
  const status = parseGapStatus(input.status);
  const [row] = await db
    .update(carrierMissingQuestions)
    .set({
      note: next.note,
      productLine: next.productLine,
      carrier: next.carrier,
      suggestedSurface: next.suggestedSurface,
      status,
      resolvedAt: status === "added" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(carrierMissingQuestions.tenantId, tenant()), eq(carrierMissingQuestions.id, input.id)),
    )
    .returning();
  if (!row) throw new Error("Missing question not found.");
  return row;
}

export async function setMissingQuestionStatus(id: string, status: GapStatus) {
  const [row] = await db
    .update(carrierMissingQuestions)
    .set({
      status,
      resolvedAt: status === "added" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(carrierMissingQuestions.tenantId, tenant()), eq(carrierMissingQuestions.id, id)))
    .returning();
  if (!row) throw new Error("Missing question not found.");
  return row;
}

export async function promoteQuoteNeed(input: {
  body: string;
  carrier?: string | null;
  productLine?: string | null;
  sourceQuoteNoteId?: string | null;
  suggestedSurface?: string | null;
  createdBy?: string | null;
}): Promise<{ row: CarrierMissingQuestion; created: boolean } | null> {
  const draft = draftGapFromQuoteNeed(input);
  if (!draft) return null;
  if (!draft.productLine) {
    throw new Error("Pick a product line before logging this gap.");
  }
  return createMissingQuestion({
    ...draft,
    sourceQuoteNoteId: input.sourceQuoteNoteId,
    createdBy: input.createdBy,
  });
}
