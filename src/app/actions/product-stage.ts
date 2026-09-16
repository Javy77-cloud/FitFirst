"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { moveDealToStage } from "@/app/actions/pipeline";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deals, quoteAttemptLogs, quotes, reviewTasks } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  inferDealProducts,
  parseDealProduct,
  splitHomeProducts,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { sheetLineForProduct } from "@/lib/deals/deal-products";
import {
  noticeCompleteLogBody,
  noticePicklistNamesForFamily,
  noticeTypeLabel,
  parseNoticeType,
} from "@/lib/deals/notices";
import {
  createFieldPicklist,
  getFieldPicklist,
  listFieldPicklists,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import {
  STARTER_PICKLIST_DEAL_NOTICES_HEALTH,
  STARTER_PICKLIST_DEAL_NOTICES_LIFE,
  STARTER_PICKLIST_DEAL_NOTICES_PC,
} from "@/lib/custom-fields/starter-picklists";
import {
  canonicalizeProductStage,
  findProductNoticeForTask,
  isProductLostReason,
  lateStageNeedsQuoteSelection,
  liveSelectedQuoteIds,
  appendNoticeNoteLog,
  joinProductListNotes,
  listProductNotes,
  parseProductStages,
  productStageFor,
  setProductStage,
  shouldAutoAdvanceStage,
} from "@/lib/deals/product-stages";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { issuePolicyFromDeclaration } from "@/app/actions/policy-mint";
import { isPolicyIssuedStage, quotesOnlyStageBlocked } from "@/lib/policy/mint-gate";
import { parseShopFlow, quoteMatchesDealProduct } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { flashAction, flashStay } from "@/lib/flash-action";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  return deal ?? null;
}

function productsOnDeal(deal: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): DealProductId[] {
  return inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
}

async function liveQuoteIdsForProduct(
  dealId: string,
  product: DealProductId,
  deal: {
    shopFlow?: unknown;
    shopProducts?: string[] | null;
    shopLines?: string[] | null;
    lineOfBusiness?: string | null;
    quotingLine?: string | null;
    quotingForm?: string | null;
    policySubType?: string | null;
  },
): Promise<string[]> {
  const [quoteRows, logRows] = await Promise.all([
    db
      .select({
        id: quotes.id,
        shopLine: quotes.shopLine,
        notes: quotes.notes,
        quoteAttemptLogId: quotes.quoteAttemptLogId,
        quoteRunId: quotes.quoteRunId,
        stub: quotes.stub,
      })
      .from(quotes)
      .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId))),
    db
      .select({ id: quoteAttemptLogs.id, lineOfBusiness: quoteAttemptLogs.lineOfBusiness })
      .from(quoteAttemptLogs)
      .where(and(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID), eq(quoteAttemptLogs.dealId, dealId))),
  ]);
  const products = productsOnDeal(deal);
  const shopFlow = parseShopFlow(deal.shopFlow);
  return quoteRows
    .filter((row) => row.stub !== true)
    .filter((row) =>
      quoteMatchesDealProduct(
        {
          shopLine: row.shopLine,
          notes: row.notes,
          quoteAttemptLogId: row.quoteAttemptLogId,
          quoteRunId: row.quoteRunId,
          quoteRuns: shopFlow.quoteRuns,
          logs: logRows,
        },
        product,
        {
          multiLine: products.length > 1,
          isPrimaryLine: products[0] === product,
          splitHomeProducts: splitHomeProducts(products),
        },
      ),
    )
    .map((row) => row.id);
}

export async function setDealProductStage(input: {
  dealId: string;
  product: string;
  stageSlug: string;
  pipelineSlug: string;
  selectedQuoteIds?: string[];
  lostReason?: string | null;
  surface?: "quotes" | "header" | "chip";
}) {
  const dealId = input.dealId.trim();
  const product = parseDealProduct(input.product);
  const stageSlug = canonicalizeProductStage(input.stageSlug);
  if (!dealId || !product || !stageSlug) return { ok: false as const, reason: "invalid" };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false as const, reason: "missing" };

  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const liveQuoteIds = await liveQuoteIdsForProduct(dealId, product, deal);
  const selectedQuoteIds = liveSelectedQuoteIds(
    input.selectedQuoteIds ?? current.selectedQuoteIds,
    liveQuoteIds,
  );
  if (lateStageNeedsQuoteSelection({ stage: stageSlug, selectedQuoteIds, liveQuoteIds })) {
    return { ok: false as const, reason: "need_quote" };
  }
  if (quotesOnlyStageBlocked(stageSlug, input.surface)) {
    return { ok: false as const, reason: "quotes_only" };
  }
  if (stageSlug === "closed_lost" && input.lostReason && !isProductLostReason(input.lostReason)) {
    return { ok: false as const, reason: "need_lost_reason" };
  }
  if (isPolicyIssuedStage(stageSlug)) {
    const minted = await issuePolicyFromDeclaration({
      dealId,
      product,
      pipelineSlug: input.pipelineSlug,
      selectedQuoteIds,
      surface: input.surface ?? "quotes",
    });
    if (!minted.ok) return minted;
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
    return { ok: true as const, policyId: minted.policyId };
  }

  const nextStages = setProductStage(stages, product, {
    stage: stageSlug,
    selectedQuoteIds,
    lostReason: stageSlug === "closed_lost" ? input.lostReason ?? current.lostReason : null,
  });
  await persistDealShopFlow(dealId, { ...saved, productStages: nextStages });

  const products = productsOnDeal(deal);
  if (products.length <= 1) {
    await moveDealToStage({
      dealId,
      pipelineSlug: input.pipelineSlug,
      stageSlug,
      allowLate: true,
    });
  } else {
    await writeCrmSignalsSafe({
      kind: "stage_moved",
      title: `Stage · ${product} · ${stageSlug} · ${deal.title}`,
      body: `${product} moved to ${stageSlug}. Other products keep their own stage.`,
      entityType: "deal",
      entityId: dealId,
      dealId,
      createTask: false,
    });
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { ok: true as const };
}

export async function selectDealProductQuotes(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const productRaw = String(formData.get("product") ?? "").trim();
  const product = parseDealProduct(productRaw);
  const quoteIds = formData
    .getAll("quoteId")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (!dealId || !product) throw new Error("Deal and product are required.");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, { selectedQuoteIds: quoteIds });
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
  revalidatePath(`/deals/${dealId}`);
  flashAction(`/deals/${dealId}?tab=quotes&product=${product}`, "Quote selected");
}

export async function toggleDealProductQuote(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!dealId || !product || !quoteId) throw new Error("Deal, product, and quote are required.");
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const selected = new Set(current.selectedQuoteIds);
  if (selected.has(quoteId)) selected.delete(quoteId);
  else selected.add(quoteId);
  const next = setProductStage(stages, product, { selectedQuoteIds: [...selected] });
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
  revalidatePath(`/deals/${dealId}`);
}

export async function markDealProductLost(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const reason = String(formData.get("lostReason") ?? "").trim();
  const pipelineSlug = String(formData.get("pipelineSlug") ?? "p-c").trim() || "p-c";
  if (!dealId || !product) throw new Error("Deal and product are required.");
  if (!isProductLostReason(reason)) throw new Error("Pick a lost reason.");
  const session = await currentDeskSession();
  const result = await setDealProductStage({
    dealId,
    product,
    stageSlug: "closed_lost",
    pipelineSlug,
    lostReason: reason,
  });
  if (!result.ok) throw new Error("Could not mark product lost.");
  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: `Lost · ${product} · ${reason}`,
    body: `${session.name || "Agent"} closed ${product}: ${reason}.`,
    entityType: "deal",
    entityId: dealId,
    dealId,
    createTask: false,
  });
  flashAction(`/deals/${dealId}?product=${product}`, "Product marked lost");
}

function productForLine(
  deal: {
    shopProducts?: string[] | null;
    shopLines?: string[] | null;
    lineOfBusiness?: string | null;
    quotingLine?: string | null;
    quotingForm?: string | null;
    policySubType?: string | null;
  },
  line?: string | null,
): DealProductId | null {
  const products = productsOnDeal(deal);
  if (line) {
    const match = products.find((id) => sheetLineForProduct(id) === line);
    if (match) return match;
    const fromLine = parseDealProduct(line);
    if (fromLine) return fromLine;
  }
  return products[0] ?? parseDealProduct(deal.quotingForm ?? deal.quotingLine ?? "") ?? "homeowners";
}

/** First confirm → Markets; request quotes → Quote review. Never moves backward. */
export async function autoAdvanceDealProductStage(input: {
  dealId: string;
  stageSlug: string;
  line?: string | null;
  product?: string | null;
  pipelineSlug?: string;
}) {
  const deal = await loadDeal(input.dealId);
  if (!deal) return { ok: false as const, reason: "missing" };
  const product =
    parseDealProduct(input.product ?? "") ?? productForLine(deal, input.line);
  if (!product) return { ok: false as const, reason: "invalid" };
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  if (!shouldAutoAdvanceStage(current.stage, input.stageSlug)) {
    return { ok: true as const, skipped: true as const };
  }
  return setDealProductStage({
    dealId: input.dealId,
    product,
    stageSlug: input.stageSlug,
    pipelineSlug: input.pipelineSlug ?? "p-c",
    selectedQuoteIds: current.selectedQuoteIds,
  });
}

function noticeReturnTo(formData: FormData, dealId: string, product: DealProductId) {
  const fromForm = String(formData.get("returnTo") ?? "").trim();
  if (fromForm.startsWith(`/deals/${dealId}`)) return fromForm;
  return `/deals/${dealId}?tab=quotes&product=${product}`;
}

function revalidateNotice(dealId: string, taskId?: string | null) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/tasks");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

async function persistProductNotice(
  dealId: string,
  product: DealProductId,
  patch: {
    noticeType?: string;
    noticeTaskId?: string | null;
    noticeNote?: string | null;
    noticeNotes?: ReturnType<typeof appendNoticeNoteLog>;
    listNote?: string | null;
  },
) {
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, {
    ...(patch.noticeType !== undefined
      ? { inspectionStatus: patch.noticeType, noticeType: patch.noticeType }
      : {}),
    ...(patch.noticeTaskId !== undefined ? { noticeTaskId: patch.noticeTaskId } : {}),
    ...(patch.noticeNote !== undefined ? { noticeNote: patch.noticeNote } : {}),
    ...(patch.noticeNotes !== undefined ? { noticeNotes: patch.noticeNotes } : {}),
    ...(patch.listNote !== undefined ? { listNote: patch.listNote } : {}),
  });
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
  return deal;
}

/** Persist the visible notice and link the desk task created by createDeskTask. */
export async function linkDealProductNoticeTask(input: {
  dealId: string;
  product: string;
  noticeType: string;
  taskId: string;
}) {
  const product = parseDealProduct(input.product);
  const noticeType = parseNoticeType(input.noticeType);
  const taskId = input.taskId.trim();
  if (!input.dealId || !product || noticeType === "none" || !taskId) return;
  await persistProductNotice(input.dealId, product, { noticeType, noticeTaskId: taskId });
  revalidateNotice(input.dealId, taskId);
}

/** Set or change a product notice chip. Reminder is createDeskTask — never a second engine. */
export async function setDealProductNotice(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const noticeType = parseNoticeType(
    formData.get("noticeType") ?? formData.get("inspectionStatus"),
  );
  if (!dealId || !product) throw new Error("Deal and product are required.");
  if (noticeType === "none") {
    throw new Error("Pick a notice type, or complete the notice to clear it.");
  }
  const taskId = String(formData.get("noticeTaskId") ?? formData.get("taskId") ?? "").trim();
  await persistProductNotice(dealId, product, {
    noticeType,
    noticeTaskId: taskId || undefined,
  });
  revalidateNotice(dealId, taskId || null);
  flashStay(formData, noticeReturnTo(formData, dealId, product), "Notice set");
}

async function clearProductNoticeOnDeal(input: {
  dealId: string;
  product: DealProductId;
  notes: string;
}) {
  if (input.notes.length < 2) throw new Error("Add a short note to complete the notice.");
  const session = await currentDeskSession();
  const deal = await loadDeal(input.dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, input.product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const noticeType = parseNoticeType(current.noticeType ?? current.inspectionStatus);
  if (noticeType === "none") throw new Error("No active notice to complete.");
  const occurredAt = new Date();
  await writeDeskComms({
    kind: "note",
    title: `Notice completed · ${noticeTypeLabel(noticeType)}`,
    body: noticeCompleteLogBody({
      agent: session.name || "Agent",
      noticeType,
      notes: input.notes,
    }),
    status: "completed",
    eventType: "completed",
    occurredAt,
    dealId: input.dealId,
    contactId: deal.contactId,
    accountId: deal.accountId,
    leadId: deal.leadId,
    assignee: session.name || null,
    actorId: session.userId,
    actorName: session.name || null,
  });
  if (current.noticeTaskId) {
    await db
      .update(reviewTasks)
      .set({ status: "done", completedAt: occurredAt })
      .where(
        and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, current.noticeTaskId)),
      );
  }
  await persistDealShopFlow(input.dealId, {
    ...saved,
    productStages: setProductStage(stages, input.product, {
      inspectionStatus: "none",
      noticeType: "none",
      noticeTaskId: null,
      noticeNote: null,
    }),
  });
  revalidateNotice(input.dealId, current.noticeTaskId);
}

export async function completeDealProductNotice(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  if (!dealId || !product) throw new Error("Deal and product are required.");
  await clearProductNoticeOnDeal({ dealId, product, notes });
  flashStay(formData, noticeReturnTo(formData, dealId, product), "Notice completed");
}

/** Completing a linked notice task can also clear the chip + activity log. Never automatic. */
export async function completeLinkedDealNoticeForTask(taskId: string, notes: string) {
  const id = taskId.trim();
  if (!id || notes.trim().length < 2) return { cleared: false as const };
  const [task] = await db
    .select({ id: reviewTasks.id, dealId: reviewTasks.dealId })
    .from(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, id)))
    .limit(1);
  if (!task?.dealId) return { cleared: false as const };
  const deal = await loadDeal(task.dealId);
  if (!deal) return { cleared: false as const };
  const stages = parseProductStages(parseShopFlow(deal.shopFlow).productStages);
  const found = findProductNoticeForTask(stages, id);
  if (!found) return { cleared: false as const };
  const product = parseDealProduct(found.product);
  if (!product) return { cleared: false as const };
  await clearProductNoticeOnDeal({ dealId: task.dealId, product, notes: notes.trim() });
  return { cleared: true as const };
}

/** Leftover Inspection dropdown — maps old slugs, does not create a task. */
export async function setDealProductInspection(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const status = parseNoticeType(formData.get("inspectionStatus") ?? formData.get("noticeType"));
  if (!dealId || !product) throw new Error("Deal, product, and notice type are required.");
  await persistProductNotice(dealId, product, { noticeType: status });
  revalidatePath(`/deals/${dealId}`);
}

/** Speak/type complete-notes — appends the notice log and fills Complete notes. */
export async function saveDealNoticeNote(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = parseDealProduct(String(formData.get("product") ?? ""));
  const notes = String(formData.get("notes") ?? "");
  if (!dealId || !product) throw new Error("Deal and product are required.");
  const session = await currentDeskSession();
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const text = notes.trim();
  await persistProductNotice(dealId, product, {
    noticeNote: text || null,
    noticeNotes: appendNoticeNoteLog(current.noticeNotes, {
      body: text,
      agent: session.name || null,
    }),
  });
  revalidateNotice(dealId);
  flashStay(formData, noticeReturnTo(formData, dealId, product), "Notice note saved");
}

/** Per-product notes on the deals list (right-hand Notes column). */
export async function saveDealProductListNote(input: {
  dealId: string;
  product: string;
  note: string;
  columnId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const dealId = input.dealId.trim();
  const product = parseDealProduct(input.product);
  if (!dealId || !product) return { ok: false, error: "Deal and product are required." };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false, error: "Deal not found." };
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, { listNote: input.note.trim() || null });
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
  const columnId = (input.columnId ?? "").trim();
  if (columnId === "notes" || columnId === "new_field") {
    const { writeRecordValues } = await import("@/lib/custom-fields/store");
    const joined = joinProductListNotes(
      listProductNotes({
        shopProducts: deal.shopProducts,
        shopLines: deal.shopLines,
        lineOfBusiness: deal.lineOfBusiness,
        quotingForm: deal.quotingForm,
        policySubType: deal.policySubType,
        shopFlow: { ...saved, productStages: next },
        fallbackNote: deal.notes,
      }),
    );
    if (columnId === "notes") {
      await db.update(deals).set({ notes: joined, updatedAt: new Date() }).where(eq(deals.id, dealId));
    }
    await writeRecordValues(dealId, { [columnId]: joined }).catch(() => null);
  }
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

function noticeFamilyFromForm(value: string): "pc" | "life" | "health" {
  if (value === "life" || value === "health") return value;
  return "pc";
}

const NOTICE_FAMILY_CREATE_NAME = {
  pc: STARTER_PICKLIST_DEAL_NOTICES_PC,
  life: STARTER_PICKLIST_DEAL_NOTICES_LIFE,
  health: STARTER_PICKLIST_DEAL_NOTICES_HEALTH,
} as const;

function noticeTypeLabelsFromForm(formData: FormData): string[] {
  return formData
    .getAll("options")
    .map((item) => String(item).trim())
    .filter(Boolean);
}

/** Family-scoped picklist write from the deal — never bounce to Settings. */
async function persistNoticeTypeLabels(input: {
  dealId: string;
  family: "pc" | "life" | "health";
  picklistId?: string;
  labels: string[];
}) {
  const lists = await listFieldPicklists();
  let list = input.picklistId ? await getFieldPicklist(input.picklistId) : null;
  if (!list) {
    const names = noticePicklistNamesForFamily(input.family).map((name) => name.toLowerCase());
    list = lists.find((row) => names.includes(row.name.trim().toLowerCase())) ?? null;
  }
  if (!list) {
    await createFieldPicklist(NOTICE_FAMILY_CREATE_NAME[input.family], input.labels);
  } else {
    await updateFieldPicklist(list.id, { options: input.labels });
  }
  revalidatePath(`/deals/${input.dealId}`);
  revalidatePath("/deals");
  revalidatePath("/settings/picklists");
}

/** In-deal add / rename / delete — never bounce to Settings picklists. */
export async function saveDealNoticeTypes(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const family = noticeFamilyFromForm(String(formData.get("family") ?? "pc"));
  const picklistId = String(formData.get("picklistId") ?? "").trim();
  const labels = noticeTypeLabelsFromForm(formData);
  if (!dealId) throw new Error("Deal is required.");
  await persistNoticeTypeLabels({ dealId, family, picklistId, labels });
  const product = parseDealProduct(String(formData.get("product") ?? "")) ?? "homeowners";
  flashStay(formData, noticeReturnTo(formData, dealId, product), "Notice types saved");
}

/** Save family types (including a brand-new name) and set that type on the product. */
export async function applyDealNoticeType(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const family = noticeFamilyFromForm(String(formData.get("family") ?? "pc"));
  const picklistId = String(formData.get("picklistId") ?? "").trim();
  const labels = noticeTypeLabelsFromForm(formData);
  if (!dealId) throw new Error("Deal is required.");
  await persistNoticeTypeLabels({ dealId, family, picklistId, labels });
  await setDealProductNotice(formData);
}