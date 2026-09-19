"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentDeskSession } from "@/lib/auth/session";
import { createContactPopup } from "@/app/actions/contacts-ops";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { parseEmailFrom } from "@/lib/home/lead-offers";
import { getGmailThread, replyGmailThread, sendGmailMessage } from "@/lib/integrations/gmail";
import { inboxThreadHref } from "@/lib/desk/inbox-match";
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

export async function replyInboxThread(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const threadId = str(formData, "threadId");
  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!threadId || !to || !body) {
    flashAction(threadId ? inboxThreadHref(threadId) : "/inbox", "inbox-need-reply", "error");
  }
  await replyGmailThread({
    threadId,
    to,
    subject: subject || "Re:",
    body,
    inReplyTo: str(formData, "inReplyTo") || null,
    references: str(formData, "references") || null,
  });
  refreshInbox(threadId);
  flashAction(inboxThreadHref(threadId), "inbox-sent");
}

export async function sendInboxMessage(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const to = str(formData, "to");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!to || !body) flashAction("/inbox", "inbox-need-send", "error");
  await sendGmailMessage({ to, subject: subject || "(no subject)", body });
  refreshInbox();
  flashAction("/inbox", "inbox-sent");
}

export async function logInboxThread(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  const threadId = str(formData, "threadId");
  const contactId = str(formData, "contactId") || null;
  const dealId = str(formData, "dealId") || null;
  const policyId = str(formData, "policyId") || null;
  if (!threadId) redirect("/inbox");
  const loaded = await getGmailThread(threadId);
  const last = loaded?.messages[loaded.messages.length - 1];
  const subject = loaded?.preview.subject || str(formData, "subject") || "Inbox thread";
  if (!contactId && !dealId && !policyId) {
    flashAction(inboxThreadHref(threadId), "inbox-need-record", "error");
  }
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
    threadKey: `gmail:${threadId}`,
    actorId: session.userId,
  });
  refreshInbox(threadId);
  flashAction(inboxThreadHref(threadId), "inbox-logged");
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
