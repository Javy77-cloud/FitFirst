"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { moveDealToStage } from "@/app/actions/pipeline";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { alerts, contacts, deals, leads, quoteAttemptLogs, quotes, reviewTasks } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  dealProductDef,
  parseDealProduct,
  sheetLineForProduct,
  splitHomeProducts,
} from "@/lib/deals/deal-products";
import {
  parseProductInstanceToken,
  productIdFromInstanceKey,
  resolveVisibleProductInstances,
  storageLineForInstance,
} from "@/lib/deals/product-instances";
import {
  noticeCompleteLogBody,
  noticeDeleteLogBody,
  noticePicklistForFamily,
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
  starterPicklistByName,
} from "@/lib/custom-fields/starter-picklists";
import {
  canonicalizeProductStage,
  findProductNoticeForTask,
  isProductLostReason,
  lateStageNeedsQuoteSelection,
  liveSelectedQuoteIds,
  appendNoticeNoteLog,
  joinProductListNotes,
  parseProductStages,
  syncProductListNotes,
  productStageFor,
  setProductStage,
  shouldAutoAdvanceStage,
} from "@/lib/deals/product-stages";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { issuePolicyFromDeclaration } from "@/app/actions/policy-mint";
import { isPolicyIssuedStage, quotesOnlyStageBlocked } from "@/lib/policy/mint-gate";
import { parseShopFlow, quoteMatchesDealProduct } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { maybeArchiveDealWhenAllProductsTerminal } from "@/lib/deals/archive-when-terminal";
import { flashAction, flashStay } from "@/lib/flash-action";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import {
  buildOutsideStageOverride,
  hasActiveOutsideOverride,
  outsideOverrideActivityBody,
  outsideOverrideActivityTitle,
  outsideOverrideStageLabel,
} from "@/lib/deals/outside-stage-override";
import {
  CLIENT_SEND_REQUIRED_MESSAGE,
  hasProviderMessageId,
  isClientFacingLateStage,
  lateStageSendBlocked,
} from "@/lib/deals/client-send-gate";
import { deliverClientQuoteEmail } from "@/lib/comms/quote-delivery-store";

function reusableClientSendId(state: {
  clientSendMessageId?: string | null;
  clientSendFlag?: string | null;
}): string | null {
  if (state.clientSendFlag === "bounce" || state.clientSendFlag === "complaint") return null;
  const id = state.clientSendMessageId ?? "";
  return hasProviderMessageId(id) ? id.trim() : null;
}

async function clientParty(deal: {
  contactId?: string | null;
  leadId?: string | null;
  primaryNamedInsured?: string | null;
}): Promise<{ email: string | null; name: string | null }> {
  let email: string | null = null;
  let name = (deal.primaryNamedInsured ?? "").trim() || null;
  if (deal.contactId) {
    const [contact] = await db
      .select({ email: contacts.email, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts)
      .where(and(eq(contacts.id, deal.contactId), eq(contacts.tenantId, DEFAULT_TENANT_ID)));
    if (contact?.email?.trim()) email = contact.email.trim();
    if (!name && contact) name = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || null;
  }
  if (!email && deal.leadId) {
    const [lead] = await db
      .select({ email: leads.email, firstName: leads.firstName, lastName: leads.lastName })
      .from(leads)
      .where(and(eq(leads.id, deal.leadId), eq(leads.tenantId, DEFAULT_TENANT_ID)));
    if (lead?.email?.trim()) email = lead.email.trim();
    if (!name && lead) name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || null;
  }
  return { email, name };
}

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  return deal ?? null;
}

function stageProductKey(raw: string | null | undefined): string | null {
  return parseProductInstanceToken(raw)?.key ?? null;
}

function productsOnDeal(deal: {
  shopProducts?: string[] | null;
  shopLines?: string[] | null;
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): string[] {
  return resolveVisibleProductInstances({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  }).map((row) => row.key);
}

async function liveQuoteIdsForProduct(
  dealId: string,
  product: string,
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
  /** Confirmed outside-FitFirst override — skips quote gate; does not mint a policy. */
  outsideOverride?: { reason: string } | null;
}) {
  const dealId = input.dealId.trim();
  const product = stageProductKey(input.product);
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
  const outsideBuilt = input.outsideOverride
    ? buildOutsideStageOverride({
        stageSlug,
        reason: input.outsideOverride.reason,
      })
    : null;
  if (outsideBuilt && !outsideBuilt.ok) {
    return { ok: false as const, reason: "need_reason" as const, message: outsideBuilt.error };
  }
  const outsideOverride = outsideBuilt?.ok
    ? outsideBuilt.override
    : hasActiveOutsideOverride(current.outsideOverride)
      ? current.outsideOverride
      : null;
  if (
    lateStageNeedsQuoteSelection({
      stage: stageSlug,
      selectedQuoteIds,
      liveQuoteIds,
      outsideOverride,
    })
  ) {
    return { ok: false as const, reason: "need_quote" };
  }
  if (quotesOnlyStageBlocked(stageSlug, input.surface)) {
    return { ok: false as const, reason: "quotes_only" };
  }
  let clientSendMessageId = reusableClientSendId(current);
  if (
    lateStageSendBlocked({
      stage: stageSlug,
      messageId: clientSendMessageId,
      outsideOverride,
    })
  ) {
    const party = await clientParty(deal);
    const sent = await deliverClientQuoteEmail({
      dealId,
      product,
      stageSlug,
      to: party.email,
      clientName: party.name,
      quoteId: selectedQuoteIds[0] ?? null,
    });
    if (!sent.ok) {
      return {
        ok: false as const,
        reason: "need_send" as const,
        message: sent.error || CLIENT_SEND_REQUIRED_MESSAGE,
      };
    }
    if (!hasProviderMessageId(sent.messageId)) {
      return {
        ok: false as const,
        reason: "need_send" as const,
        message: CLIENT_SEND_REQUIRED_MESSAGE,
      };
    }
    clientSendMessageId = sent.messageId;
    await persistDealShopFlow(dealId, {
      ...saved,
      productStages: setProductStage(stages, product, {
        clientSendMessageId,
        clientSendFlag: null,
      }),
    });
  }
  if (stageSlug === "closed_lost" && input.lostReason && !isProductLostReason(input.lostReason)) {
    return { ok: false as const, reason: "need_lost_reason" };
  }
  // Policy issued with live quotes still mints. Outside FitFirst only advances stage —
  // agent uploads the Issued declaration next (Gemini → mint) without fake quote rows.
  if (isPolicyIssuedStage(stageSlug) && !hasActiveOutsideOverride(outsideOverride)) {
    const minted = await issuePolicyFromDeclaration({
      dealId,
      product,
      pipelineSlug: input.pipelineSlug,
      selectedQuoteIds,
      surface: input.surface ?? "quotes",
    });
    if (!minted.ok) return minted;
    await maybeArchiveDealWhenAllProductsTerminal(dealId);
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
    return { ok: true as const, policyId: minted.policyId };
  }

  const nextStages = setProductStage(stages, product, {
    stage: stageSlug,
    selectedQuoteIds,
    lostReason: stageSlug === "closed_lost" ? input.lostReason ?? current.lostReason : null,
    outsideOverride: hasActiveOutsideOverride(outsideOverride) ? outsideOverride : null,
    ...(isClientFacingLateStage(stageSlug)
      ? { clientSendMessageId, clientSendFlag: null }
      : {}),
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

  await maybeArchiveDealWhenAllProductsTerminal(dealId);

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { ok: true as const };
}


/** Stage stepper: outside-quote override OR Closed lost (went elsewhere) with Captain reason. */
export async function overrideDealProductStageOutside(input: {
  dealId: string;
  product: string;
  stageSlug: string;
  pipelineSlug: string;
  reason: string;
  lostReason?: string | null;
}) {
  const dealId = input.dealId.trim();
  const product = stageProductKey(input.product);
  if (!dealId || !product) return { ok: false as const, error: "Deal and product are required." };

  const stageSlug = canonicalizeProductStage(input.stageSlug);
  const session = await currentDeskSession();
  const label = dealProductDef(productIdFromInstanceKey(product) ?? "homeowners").label;

  // Closed lost — separate from outside-quote stamp. Captain reason required.
  if (stageSlug === "closed_lost") {
    const lostReason = (input.lostReason ?? "").trim();
    if (!isProductLostReason(lostReason)) {
      return { ok: false as const, error: "Pick a lost reason (e.g. Bound with competitor)." };
    }
    const result = await setDealProductStage({
      dealId,
      product,
      stageSlug: "closed_lost",
      pipelineSlug: input.pipelineSlug,
      selectedQuoteIds: [],
      lostReason,
      surface: "quotes",
    });
    if (!result.ok) {
      return { ok: false as const, error: "Could not mark product lost." };
    }
    const note = (input.reason ?? "").trim();
    const deal = await loadDeal(dealId);
    await writeDeskComms({
      kind: "note",
      title: `Lost · ${label} · ${lostReason}`,
      body: `${session.name || "Agent"} closed ${label}: ${lostReason}.${note ? ` ${note}` : ""}`,
      status: "completed",
      eventType: "logged",
      occurredAt: new Date(),
      dealId,
      contactId: deal?.contactId ?? null,
      accountId: deal?.accountId ?? null,
      leadId: deal?.leadId ?? null,
      assignee: session.name || null,
      actorId: session.userId,
      actorName: session.name || null,
    });
    await writeCrmSignalsSafe({
      kind: "stage_moved",
      title: `Lost · ${label} · ${lostReason}`,
      body: `${session.name || "Agent"} closed ${label}: ${lostReason}.${note ? ` ${note}` : ""}`,
      entityType: "deal",
      entityId: dealId,
      dealId,
      createTask: false,
    });
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
    return { ok: true as const, stage: "closed_lost" as const, label: "Closed lost" };
  }

  const built = buildOutsideStageOverride({
    stageSlug,
    reason: input.reason,
  });
  if (!built.ok) return { ok: false as const, error: built.error };

  const override = {
    ...built.override,
    agent: session.name || null,
  };
  const result = await setDealProductStage({
    dealId,
    product,
    stageSlug: override.toStage,
    pipelineSlug: input.pipelineSlug,
    selectedQuoteIds: [],
    surface: "quotes",
    outsideOverride: { reason: override.reason },
  });
  if (!result.ok) {
    if (result.reason === "need_reason" && "message" in result && result.message) {
      return { ok: false as const, error: String(result.message) };
    }
    if (result.reason === "need_send" && "message" in result && result.message) {
      return { ok: false as const, error: String(result.message) };
    }
    return { ok: false as const, error: "Could not apply the outside FitFirst override." };
  }

  // Persist agent name on the audit blob (setDealProductStage rebuilds without session).
  const deal = await loadDeal(dealId);
  if (deal) {
    const saved = parseShopFlow(deal.shopFlow);
    const stages = parseProductStages(saved.productStages);
    const next = setProductStage(stages, product, { outsideOverride: override });
    await persistDealShopFlow(dealId, { ...saved, productStages: next });
  }

  await writeDeskComms({
    kind: "note",
    title: outsideOverrideActivityTitle({
      productLabel: label,
      toStage: override.toStage,
    }),
    body: outsideOverrideActivityBody({
      agent: session.name || "Agent",
      productLabel: label,
      toStage: override.toStage,
      reason: override.reason,
    }),
    status: "completed",
    eventType: "logged",
    occurredAt: new Date(),
    dealId,
    contactId: deal?.contactId ?? null,
    accountId: deal?.accountId ?? null,
    leadId: deal?.leadId ?? null,
    assignee: session.name || null,
    actorId: session.userId,
    actorName: session.name || null,
  });
  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: outsideOverrideActivityTitle({
      productLabel: label,
      toStage: override.toStage,
    }),
    body: outsideOverrideActivityBody({
      agent: session.name || "Agent",
      productLabel: label,
      toStage: override.toStage,
      reason: override.reason,
    }),
    entityType: "deal",
    entityId: dealId,
    dealId,
    createTask: false,
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return {
    ok: true as const,
    stage: override.toStage,
    label: outsideOverrideStageLabel(override.toStage),
  };
}

export async function selectDealProductQuotes(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const productRaw = String(formData.get("product") ?? "").trim();
  const product = stageProductKey(productRaw);
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
  const product = stageProductKey(String(formData.get("product") ?? ""));
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
  const product = stageProductKey(String(formData.get("product") ?? ""));
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
): string | null {
  const products = productsOnDeal(deal);
  const instances = resolveVisibleProductInstances(deal);
  if (line) {
    const match = products.find((id) => {
      const parsed = parseProductInstanceToken(id);
      if (!parsed) return false;
      return (
        sheetLineForProduct(parsed.productId) === line ||
        storageLineForInstance(parsed, instances) === line
      );
    });
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
    stageProductKey(input.product ?? "") ?? productForLine(deal, input.line);
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

function noticeReturnTo(formData: FormData, dealId: string, product: string) {
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
  product: string,
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
  const product = stageProductKey(input.product);
  const noticeType = parseNoticeType(input.noticeType);
  const taskId = input.taskId.trim();
  if (!input.dealId || !product || noticeType === "none" || !taskId) return;
  await persistProductNotice(input.dealId, product, { noticeType, noticeTaskId: taskId });
  revalidateNotice(input.dealId, taskId);
}

/** Set or change a product notice chip. Reminder is createDeskTask — never a second engine. */
export async function setDealProductNotice(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = stageProductKey(String(formData.get("product") ?? ""));
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
  product: string;
  notes: string;
}) {
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

async function cancelLinkedNoticeTask(taskId: string | null | undefined) {
  const id = (taskId ?? "").trim();
  if (!id) return;
  const now = new Date();
  await db
    .update(reviewTasks)
    .set({ status: "cancelled", completedAt: now })
    .where(
      and(
        eq(reviewTasks.tenantId, DEFAULT_TENANT_ID),
        eq(reviewTasks.id, id),
        eq(reviewTasks.status, "open"),
      ),
    );
  await db
    .update(alerts)
    .set({ readAt: now })
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, "task_reminder"),
        eq(alerts.entityType, "review_task"),
        eq(alerts.entityId, id),
        isNull(alerts.readAt),
      ),
    );
}

/** Remove a junk / never-needed flag. Not Complete — no work-done log, cancel the reminder. */
export async function deleteDealProductNotice(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = stageProductKey(String(formData.get("product") ?? ""));
  if (!dealId || !product) throw new Error("Deal and product are required.");
  const session = await currentDeskSession();
  const deal = await loadDeal(dealId);
  if (!deal) throw new Error("Deal not found.");
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const noticeType = parseNoticeType(current.noticeType ?? current.inspectionStatus);
  if (noticeType === "none") throw new Error("No active notice to delete.");
  const occurredAt = new Date();
  await writeDeskComms({
    kind: "note",
    title: `Notice deleted · ${noticeTypeLabel(noticeType)}`,
    body: noticeDeleteLogBody({
      agent: session.name || "Agent",
      noticeType,
    }),
    status: "completed",
    eventType: "logged",
    occurredAt,
    dealId,
    contactId: deal.contactId,
    accountId: deal.accountId,
    leadId: deal.leadId,
    assignee: session.name || null,
    actorId: session.userId,
    actorName: session.name || null,
  });
  await cancelLinkedNoticeTask(current.noticeTaskId);
  await persistProductNotice(dealId, product, {
    noticeType: "none",
    noticeTaskId: null,
    noticeNote: null,
    noticeNotes: [],
  });
  revalidateNotice(dealId, current.noticeTaskId);
  revalidatePath("/alerts");
  revalidatePath("/");
  flashStay(formData, noticeReturnTo(formData, dealId, product), "Notice deleted");
}

export async function completeDealProductNotice(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = stageProductKey(String(formData.get("product") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  if (!dealId || !product) throw new Error("Deal and product are required.");
  await clearProductNoticeOnDeal({ dealId, product, notes });
  flashStay(formData, noticeReturnTo(formData, dealId, product), "Notice completed");
}

/** Completing a linked notice task can also clear the chip + activity log. Never automatic. */
export async function completeLinkedDealNoticeForTask(taskId: string, notes: string) {
  const id = taskId.trim();
  if (!id) return { cleared: false as const };
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
  const product = stageProductKey(found.product);
  if (!product) return { cleared: false as const };
  await clearProductNoticeOnDeal({ dealId: task.dealId, product, notes: notes.trim() });
  return { cleared: true as const };
}

/** Leftover Inspection dropdown — maps old slugs, does not create a task. */
export async function setDealProductInspection(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = stageProductKey(String(formData.get("product") ?? ""));
  const status = parseNoticeType(formData.get("inspectionStatus") ?? formData.get("noticeType"));
  if (!dealId || !product) throw new Error("Deal, product, and notice type are required.");
  await persistProductNotice(dealId, product, { noticeType: status });
  revalidatePath(`/deals/${dealId}`);
}

/** Speak/type complete-notes — appends the notice log and fills Complete notes. */
export async function saveDealNoticeNote(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = stageProductKey(String(formData.get("product") ?? ""));
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
  const product = stageProductKey(input.product);
  if (!dealId || !product) return { ok: false, error: "Deal and product are required." };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false, error: "Deal not found." };
  const saved = parseShopFlow(deal.shopFlow);
  const synced = syncProductListNotes({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
    shopFlow: saved,
    fallbackNote: deal.notes,
    product,
    note: input.note,
  });
  await persistDealShopFlow(dealId, { ...saved, productStages: synced.productStages });
  const columnId = (input.columnId ?? "").trim();
  if (columnId === "notes" || columnId === "new_field") {
    const { writeRecordValues } = await import("@/lib/custom-fields/store");
    const joined = joinProductListNotes(synced.notes);
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
  const fromOptions = formData
    .getAll("options")
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (fromOptions.length) return fromOptions;
  return formData
    .getAll("noticeTypeLabels")
    .map((item) => String(item).trim())
    .filter(Boolean);
}

/** Persist add/rename/delete types when a notice reminder is saved on first create. */
export async function persistNoticeTypesFromTaskForm(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const labels = noticeTypeLabelsFromForm(formData);
  if (!dealId || labels.length === 0) return;
  await persistNoticeTypeLabels({
    dealId,
    family: noticeFamilyFromForm(String(formData.get("noticeFamily") ?? formData.get("family") ?? "pc")),
    picklistId: String(formData.get("noticePicklistId") ?? formData.get("picklistId") ?? "").trim(),
    labels,
  });
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
    const matched = noticePicklistForFamily(lists, input.family);
    list = matched ? lists.find((row) => row.id === matched.id) ?? null : null;
  }
  if (!list) {
    await createFieldPicklist(NOTICE_FAMILY_CREATE_NAME[input.family], input.labels, {
      seedKey: starterPicklistByName(NOTICE_FAMILY_CREATE_NAME[input.family])?.seedKey,
    });
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
  const product = stageProductKey(String(formData.get("product") ?? "")) ?? "homeowners";
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