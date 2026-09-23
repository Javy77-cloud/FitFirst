"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentDeskSession } from "@/lib/auth/session";
import { createContactPopup } from "@/app/actions/contacts-ops";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { parseEmailFrom } from "@/lib/home/lead-offers";
import { activeInboxMail, mailThreadKey } from "@/lib/integrations/mail-provider";
import { writeRecordValues, loadRecordValues } from "@/lib/custom-fields/store";
import {
  INBOX_EMAIL_ALIAS_KEY,
  inboxThreadHref,
  normalizeInboxEmail,
  parseInboxAliasEmails,
} from "@/lib/desk/inbox-match";
import {
  INBOX_ASSIGNED_KIND,
  encodePanelHref,
  inboxAssignNotification,
  inboxAssignedKey,
} from "@/lib/desk/inbox-assign";
import {
  ensureMatchedThreadLogged,
  mailMessageOccurredAt,
  mailMessageSourceId,
  resolveEmailThreadAssignee,
  stampThreadEmailAssignee,
} from "@/lib/desk/inbox-autolog";
import { decodeMailText } from "@/lib/desk/mail-text";
import { loadInboxMatchIndex } from "@/lib/desk/load-inbox-index";
import { presentInboxThread } from "@/lib/desk/inbox-desk";
import { inboxSenderLabel } from "@/lib/desk/inbox";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isDeskUuid } from "@/lib/desk-id";
import { db } from "@/lib/db";
import { alerts, contacts, deals, policies, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshInbox(threadId?: string) {
  revalidatePath("/inbox");
  revalidatePath("/notifications");
  revalidatePath("/deals");
  revalidatePath("/contacts");
  revalidatePath("/renewals");
  if (threadId) revalidatePath(inboxThreadHref(threadId));
}

async function matchForThread(threadId: string) {
  const mail = await activeInboxMail();
  if (!mail) return null;
  const loaded = await mail.getThread(threadId).catch(() => null);
  if (!loaded) return null;
  const index = await loadInboxMatchIndex();
  const desk = presentInboxThread(loaded.preview, index);
  return { mail, loaded, match: desk.match, threadKey: mailThreadKey(mail.id, threadId) };
}

async function logOutboundSend(input: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  messageId?: string;
  actorId: string;
}) {
  const ctx = await matchForThread(input.threadId);
  if (!ctx) return;
  const { mail, match, threadKey, loaded } = ctx;
  if (!match.contact && !match.deal && !match.renewal) return;
  const occurredAt = new Date();
  const subject = decodeMailText(input.subject) || "Email sent";
  const sourceId = input.messageId ? mailMessageSourceId(mail.id, input.messageId) : undefined;
  await writeDeskComms({
    kind: "email",
    title: subject,
    body: input.body,
    subject,
    fromAddress: (await mail.accountEmail().catch(() => null)) || undefined,
    toAddress: input.to,
    direction: "outbound",
    eventType: "sent",
    contactId: match.contact?.id ?? null,
    dealId: match.deal?.id ?? null,
    policyId: match.renewal?.policyId ?? null,
    threadKey,
    occurredAt,
    startAt: occurredAt,
    assignee: input.actorId,
    actorId: input.actorId,
    sourceId,
    logEmailJob: false,
  });
  // Also backfill any inbound replies already on the thread.
  await ensureMatchedThreadLogged({
    providerId: mail.id,
    threadId: input.threadId,
    messages: loaded.messages,
    match,
    sessionUserId: input.actorId,
    inboundOnly: true,
  }).catch(() => null);
}

export async function replyInboxThread(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return;
  const threadId = str(formData, "threadId");
  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!threadId || !to || !body) {
    flashAction(threadId ? inboxThreadHref(threadId) : "/inbox", "inbox-need-reply", "error");
  }
  const mail = await activeInboxMail();
  if (!mail) flashAction("/inbox", "inbox-need-reply", "error");
  const sent = await mail.reply({
    threadId,
    to,
    subject: subject || "Re:",
    body,
    inReplyTo: str(formData, "inReplyTo") || null,
    references: str(formData, "references") || null,
  });
  await logOutboundSend({
    threadId,
    to,
    subject: subject || "Re:",
    body,
    messageId: sent?.id,
    actorId: session.userId,
  }).catch(() => null);
  refreshInbox(threadId);
  flashAction(inboxThreadHref(threadId), "inbox-sent");
}

export async function sendInboxMessage(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return;
  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!to || !body) flashAction("/inbox", "inbox-need-send", "error");
  const mail = await activeInboxMail();
  if (!mail) flashAction("/inbox", "inbox-need-send", "error");
  const sent = await mail.send({ to, subject: subject || "(no subject)", body });
  if (sent?.threadId) {
    await logOutboundSend({
      threadId: sent.threadId,
      to,
      subject: subject || "(no subject)",
      body,
      messageId: sent.id,
      actorId: session.userId,
    }).catch(() => null);
  }
  refreshInbox(sent?.threadId);
  flashAction(sent?.threadId ? inboxThreadHref(sent.threadId) : "/inbox", "inbox-sent");
}

export async function logInboxThread(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const threadId = str(formData, "threadId");
  const contactId = str(formData, "contactId") || null;
  const dealId = str(formData, "dealId") || null;
  const policyId = str(formData, "policyId") || null;
  if (!threadId) redirect("/inbox");
  const mail = await activeInboxMail();
  if (!mail) flashAction("/inbox", "inbox-need-record", "error");
  const loaded = await mail.getThread(threadId);
  const last = loaded?.messages[loaded.messages.length - 1];
  const subject =
    decodeMailText(loaded?.preview.subject) ||
    decodeMailText(str(formData, "subject")) ||
    "Inbox thread";
  if (!contactId && !dealId && !policyId) {
    flashAction(inboxThreadHref(threadId), "inbox-need-record", "error");
  }
  const match = {
    emails: [] as string[],
    contact: contactId ? { id: contactId, name: "", email: "" } : null,
    deal: dealId ? { id: dealId, title: "", contactId, closed: false } : null,
    renewal: policyId
      ? { policyId, contactId, clientName: "", daysUntil: 0 }
      : null,
    unmatched: false,
  };
  // Idempotent: log every message with real Gmail times; skip ones already on the thread.
  if (loaded?.messages?.length) {
    await ensureMatchedThreadLogged({
      providerId: mail.id,
      threadId,
      messages: loaded.messages,
      match,
      sessionUserId: session.userId,
      inboundOnly: false,
    });
  } else {
    const threadKey = mailThreadKey(mail.id, threadId);
    const occurredAt = last ? mailMessageOccurredAt(last) : new Date();
    const assignee = await resolveEmailThreadAssignee({
      threadKey,
      providerId: mail.id,
      sessionUserId: session.userId,
    });
    await writeDeskComms({
      kind: "email",
      title: subject,
      body: last?.body || loaded?.preview.snippet || "",
      subject,
      fromAddress: last?.from || loaded?.preview.from,
      toAddress: last?.to || loaded?.preview.to,
      direction: last?.inbound ? "inbound" : "outbound",
      eventType: last?.inbound ? "received" : "logged",
      contactId,
      dealId,
      policyId,
      threadKey,
      occurredAt,
      startAt: occurredAt,
      assignee,
      actorId: session.userId,
      sourceId: last?.id ? mailMessageSourceId(mail.id, last.id) : undefined,
    });
  }
  refreshInbox(threadId);
  flashAction(inboxThreadHref(threadId), "inbox-logged");
}

/** Attach this thread's address to an existing contact without leaving Inbox. */
export async function linkInboxContact(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, error: "Sign in to link a contact." };
  const contactId = str(formData, "contactId");
  const email = normalizeInboxEmail(str(formData, "email") || str(formData, "from"));
  const threadId = str(formData, "threadId");
  if (!contactId || !email) return { ok: false, error: "Pick a contact and an email address." };
  const [contact] = await db
    .select({ id: contacts.id, email: contacts.email })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)))
    .limit(1);
  if (!contact) return { ok: false, error: "That contact is not on this desk." };
  const current = normalizeInboxEmail(contact.email);
  if (!current) {
    await db
      .update(contacts)
      .set({ email, updatedAt: new Date() })
      .where(eq(contacts.id, contactId));
  } else if (current !== email) {
    const stored = await loadRecordValues(contactId, "contacts").catch(() => ({} as Record<string, string>));
    const aliases = new Set(parseInboxAliasEmails(stored[INBOX_EMAIL_ALIAS_KEY]));
    aliases.add(email);
    await writeRecordValues(contactId, { [INBOX_EMAIL_ALIAS_KEY]: [...aliases].join(", ") }, "contacts");
  }
  // Linked → auto-log the thread onto the contact.
  if (threadId) {
    const ctx = await matchForThread(threadId).catch(() => null);
    if (ctx) {
      await ensureMatchedThreadLogged({
        providerId: ctx.mail.id,
        threadId,
        messages: ctx.loaded.messages,
        match: { ...ctx.match, contact: { id: contactId, name: "", email }, unmatched: false },
        sessionUserId: session.userId,
        inboundOnly: false,
      }).catch(() => null);
    }
  }
  refreshInbox(threadId);
  return { ok: true };
}

export async function createContactFromInbox(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const from = str(formData, "from");
  const parsed = parseEmailFrom(from || str(formData, "email"));
  const create = new FormData();
  create.set("firstName", parsed.firstName);
  create.set("lastName", parsed.lastName);
  if (parsed.email) create.set("email", parsed.email);
  create.set("source", "inbox");
  const result = await createContactPopup(create);
  const threadId = str(formData, "threadId");
  refreshInbox(threadId);
  if (result.ok) redirect(`/contacts/${result.id}`);
  if ("existingId" in result && result.existingId) redirect(`/contacts/${result.existingId}`);
  redirect(threadId ? `${inboxThreadHref(threadId)}&notice=inbox-need-record` : "/contacts");
}


/** Assign / forward an agency Inbox thread to an agent — Inbox-lane ping + optional ownership. */
export async function assignInboxThread(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn || !session.userId) return;
  const threadId = str(formData, "threadId");
  const agentId = str(formData, "agentId");
  const contactId = str(formData, "contactId");
  const dealId = str(formData, "dealId");
  const policyId = str(formData, "policyId");
  const subject = decodeMailText(str(formData, "subject"));
  const from = str(formData, "from");
  if (!threadId || !isDeskUuid(agentId)) {
    flashAction(threadId ? inboxThreadHref(threadId) : "/inbox", "inbox-need-agent", "error");
  }

  const [agent] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, agentId)))
    .limit(1);
  if (!agent || agent.role === "developer") {
    flashAction(inboxThreadHref(threadId), "inbox-need-agent", "error");
  }

  const patch = { ownerId: agent.id, updatedAt: new Date() };
  if (isDeskUuid(dealId)) {
    await db
      .update(deals)
      .set(patch)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  }
  if (isDeskUuid(policyId)) {
    await db
      .update(policies)
      .set(patch)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  }
  if (isDeskUuid(contactId)) {
    await db
      .update(contacts)
      .set(patch)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  }

  const fromLabel = inboxSenderLabel(from) || from || "Sender";
  const ping = inboxAssignNotification({
    subject,
    fromLabel,
    assignerName: session.name || "Teammate",
    threadId,
  });
  const key = inboxAssignedKey(threadId, agent.id);
  const body = `<!--ff-panel:${key}-->\n${encodePanelHref(ping.href)}\n\n${ping.why}`;
  const entityType = isDeskUuid(dealId)
    ? "deal"
    : isDeskUuid(policyId)
      ? "policy"
      : isDeskUuid(contactId)
        ? "contact"
        : null;
  const entityId = isDeskUuid(dealId)
    ? dealId
    : isDeskUuid(policyId)
      ? policyId
      : isDeskUuid(contactId)
        ? contactId
        : null;

  const open = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, INBOX_ASSIGNED_KIND),
        eq(alerts.recipientUserId, agent.id),
        isNull(alerts.readAt),
      ),
    );
  const same = open.find((row) => row.body.includes(`<!--ff-panel:${key}-->`));
  if (same) {
    await db
      .update(alerts)
      .set({
        title: ping.title,
        body,
        severity: "critical",
        entityType,
        entityId,
      })
      .where(eq(alerts.id, same.id));
  } else {
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: INBOX_ASSIGNED_KIND,
      title: ping.title,
      body,
      severity: "critical",
      entityType,
      entityId,
      userId: agent.id,
      recipientUserId: agent.id,
    });
  }

  const mail = await activeInboxMail();
  if (mail) {
    const threadKey = mailThreadKey(mail.id, threadId);
    await stampThreadEmailAssignee(threadKey, agent.id).catch(() => null);
    if (isDeskUuid(contactId) || isDeskUuid(dealId) || isDeskUuid(policyId)) {
      await writeDeskComms({
        kind: "email",
        title: `Assigned to ${agent.name}: ${subject || "Inbox thread"}`,
        body: `${session.name || "Teammate"} assigned this agency thread to ${agent.name}.`,
        subject: subject || "Inbox thread",
        fromAddress: from || undefined,
        direction: "inbound",
        eventType: "logged",
        contactId: isDeskUuid(contactId) ? contactId : null,
        dealId: isDeskUuid(dealId) ? dealId : null,
        policyId: isDeskUuid(policyId) ? policyId : null,
        threadKey,
        assignee: agent.id,
        actorId: session.userId,
      }).catch(() => null);
    }
  }

  refreshInbox(threadId);
  flashAction(inboxThreadHref(threadId), "inbox-assigned");
}
