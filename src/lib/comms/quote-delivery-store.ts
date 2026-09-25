import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deals, quoteDeliveryEvents } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { GMAIL_NOT_CONNECTED_MESSAGE } from "@/lib/desk/desk-email-delivery";
import { resolveOutboundEmailSignature } from "@/lib/desk/outbound-email-signature";
import { mergeTemplate } from "@/lib/templates/merge";
import { resolveTemplateText } from "@/lib/templates/revision";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { gmailIsReady, sendGmailMessage } from "@/lib/integrations/gmail";
import {
  CLIENT_SEND_NO_ADDRESS_MESSAGE,
  CLIENT_SEND_REQUIRED_MESSAGE,
  hasProviderMessageId,
} from "@/lib/deals/client-send-gate";
import { parseProductStages, setProductStage } from "@/lib/deals/product-stages";
import { parseShopFlow } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { parseDealProduct } from "@/lib/deals/deal-products";
import {
  openPixelUrl,
  quoteEmailHtml,
  quoteEmailText,
  stageAfterDeliveryFailure,
  type DeliveryKind,
  type MailProviderEvent,
} from "@/lib/comms/quote-delivery";

export async function recordQuoteDelivery(input: {
  dealId: string;
  product?: string | null;
  quoteId?: string | null;
  messageId: string;
  kind: DeliveryKind;
  stageSlug?: string | null;
  detail?: string | null;
  token?: string | null;
}) {
  const messageId = input.messageId.trim();
  if (!input.dealId.trim() || !hasProviderMessageId(messageId)) return null;
  const [row] = await db
    .insert(quoteDeliveryEvents)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: input.dealId,
      product: input.product ?? null,
      quoteId: input.quoteId ?? null,
      messageId,
      kind: input.kind,
      stageSlug: input.stageSlug ?? null,
      detail: input.detail ?? null,
      token: input.token ?? null,
    })
    .returning({ id: quoteDeliveryEvents.id });
  return row ?? null;
}

export async function deliverClientQuoteEmail(input: {
  dealId: string;
  product: string;
  stageSlug: string;
  to: string | null;
  clientName?: string | null;
  quoteId?: string | null;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const to = (input.to ?? "").trim();
  if (!to) return { ok: false, error: CLIENT_SEND_NO_ADDRESS_MESSAGE };
  if (!(await gmailIsReady())) return { ok: false, error: GMAIL_NOT_CONNECTED_MESSAGE };
  const token = randomUUID();
  const who = (input.clientName ?? "").trim() || "there";
  const currentSubject = "Your FitFirst quote";
  const currentBody = `Hi ${who},\n\nYour quote is ready to review. Reply to this email if you want to walk through it.`;
  const resolved = resolveTemplateText("client-quote", "en", {
    subject: currentSubject,
    body: currentBody,
  });
  if (!resolved.send) return { ok: false, error: CLIENT_SEND_REQUIRED_MESSAGE };
  let subject = resolved.subject;
  let text = resolved.body;
  if (subject.includes("{{") || text.includes("{{")) {
    const signature =
      subject.includes("{{signature}}") || text.includes("{{signature}}")
        ? await resolveOutboundEmailSignature()
        : "";
    const values = {
      contactFirstName: who.split(/\s+/)[0] || "there",
      policyType: input.product,
      wonDate: null,
      signature,
    };
    subject = mergeTemplate(subject, values);
    text = mergeTemplate(text, values);
  }
  try {
    const sent = await sendGmailMessage({
      to,
      subject,
      body: quoteEmailText(text),
      htmlBody: quoteEmailHtml({ text, pixelUrl: openPixelUrl(token) }),
    });
    if (!hasProviderMessageId(sent.id)) {
      return { ok: false, error: CLIENT_SEND_REQUIRED_MESSAGE };
    }
    await recordQuoteDelivery({
      dealId: input.dealId,
      product: input.product,
      quoteId: input.quoteId ?? null,
      messageId: sent.id,
      kind: "sent",
      stageSlug: input.stageSlug,
      detail: `to=${to}`,
      token,
    }).catch((error) => {
      console.error("quote delivery log failed", error);
    });
    return { ok: true, messageId: sent.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : CLIENT_SEND_REQUIRED_MESSAGE;
    return { ok: false, error: message || CLIENT_SEND_REQUIRED_MESSAGE };
  }
}

export async function logQuoteOpen(token: string): Promise<boolean> {
  const key = token.trim();
  if (!key) return false;
  const [sent] = await db
    .select()
    .from(quoteDeliveryEvents)
    .where(and(eq(quoteDeliveryEvents.tenantId, DEFAULT_TENANT_ID), eq(quoteDeliveryEvents.token, key)))
    .limit(1);
  if (!sent?.dealId || !hasProviderMessageId(sent.messageId)) return false;
  await recordQuoteDelivery({
    dealId: sent.dealId,
    product: sent.product,
    quoteId: sent.quoteId,
    messageId: sent.messageId,
    kind: "open",
    stageSlug: sent.stageSlug,
    detail: "pixel",
    token: key,
  });
  await writeDeskComms({
    kind: "note",
    title: "Quote email opened",
    body: `Open pixel loaded for message ${sent.messageId}. Some clients block images, so this is not the only way a client can read the quote.`,
    status: "completed",
    eventType: "logged",
    occurredAt: new Date(),
    dealId: sent.dealId,
  }).catch(() => null);
  return true;
}

async function revertLateStageForMessage(event: MailProviderEvent) {
  const rows = await db
    .select()
    .from(quoteDeliveryEvents)
    .where(
      and(
        eq(quoteDeliveryEvents.tenantId, DEFAULT_TENANT_ID),
        eq(quoteDeliveryEvents.messageId, event.messageId),
      ),
    );
  const sent = rows.find((row) => row.kind === "sent" && row.dealId);
  if (!sent?.dealId) return { reverted: false as const };
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, sent.dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  if (!deal) return { reverted: false as const };
  const product = parseDealProduct(sent.product ?? "");
  if (!product) return { reverted: false as const };
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = stages[product];
  const next = stageAfterDeliveryFailure({
    kind: event.kind,
    stage: current?.stage,
    messageId: event.messageId,
    unlockedByMessageId: current?.clientSendMessageId,
  });
  await recordQuoteDelivery({
    dealId: sent.dealId,
    product,
    quoteId: sent.quoteId,
    messageId: event.messageId,
    kind: event.kind,
    stageSlug: next.stage,
    detail: next.log,
    token: sent.token,
  });
  if (next.revert) {
    const patched = setProductStage(stages, product, {
      stage: next.stage,
      clientSendMessageId: null,
      clientSendFlag: next.clientSendFlag,
    });
    await persistDealShopFlow(sent.dealId, { ...saved, productStages: patched });
  }
  await writeDeskComms({
    kind: "note",
    title: next.revert ? `Quote send ${event.kind} · stage reverted` : `Quote send ${event.kind}`,
    body: next.log,
    status: "completed",
    eventType: "logged",
    occurredAt: new Date(),
    dealId: sent.dealId,
    contactId: deal.contactId,
    accountId: deal.accountId,
    leadId: deal.leadId,
  }).catch(() => null);
  return { reverted: next.revert };
}

export async function applyProviderDeliveryEvents(events: MailProviderEvent[]) {
  const results: { messageId: string; kind: string; reverted: boolean }[] = [];
  for (const event of events) {
    if (event.kind === "open") {
      const rows = await db
        .select({ dealId: quoteDeliveryEvents.dealId, product: quoteDeliveryEvents.product, quoteId: quoteDeliveryEvents.quoteId, stageSlug: quoteDeliveryEvents.stageSlug, token: quoteDeliveryEvents.token })
        .from(quoteDeliveryEvents)
        .where(
          and(
            eq(quoteDeliveryEvents.tenantId, DEFAULT_TENANT_ID),
            eq(quoteDeliveryEvents.messageId, event.messageId),
            eq(quoteDeliveryEvents.kind, "sent"),
          ),
        )
        .limit(1);
      const sent = rows[0];
      if (sent?.dealId) {
        await recordQuoteDelivery({
          dealId: sent.dealId,
          product: sent.product,
          quoteId: sent.quoteId,
          messageId: event.messageId,
          kind: "open",
          stageSlug: sent.stageSlug,
          token: sent.token,
        });
      }
      results.push({ messageId: event.messageId, kind: event.kind, reverted: false });
      continue;
    }
    if (event.kind === "delivered") {
      const rows = await db
        .select()
        .from(quoteDeliveryEvents)
        .where(
          and(
            eq(quoteDeliveryEvents.tenantId, DEFAULT_TENANT_ID),
            eq(quoteDeliveryEvents.messageId, event.messageId),
            eq(quoteDeliveryEvents.kind, "sent"),
          ),
        )
        .limit(1);
      const sent = rows[0];
      if (sent?.dealId) {
        await recordQuoteDelivery({
          dealId: sent.dealId,
          product: sent.product,
          quoteId: sent.quoteId,
          messageId: event.messageId,
          kind: "delivered",
          stageSlug: sent.stageSlug,
          token: sent.token,
        });
      }
      results.push({ messageId: event.messageId, kind: event.kind, reverted: false });
      continue;
    }
    const reverted = await revertLateStageForMessage(event);
    results.push({ messageId: event.messageId, kind: event.kind, reverted: reverted.reverted });
  }
  return results;
}
