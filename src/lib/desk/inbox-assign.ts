/** Agency Inbox → assign / forward a thread to an agent (Inbox-lane ping). */

import { inboxThreadHref, type InboxMatch } from "@/lib/desk/inbox-match";
import type { PanelUrgency } from "@/lib/notifications/panel";

export const INBOX_ASSIGNED_KIND = "inbox_assigned" as const;

export type InboxAssignAgent = { id: string; name: string };

/**
 * Manual Assign dialog default.
 * Prefer the agent already stamped on the email thread, then deal / policy owners.
 * Contact owner is last — names can collide with agent users.
 */
export function suggestedInboxAssignee(input: {
  threadAgentId?: string | null;
  dealOwnerId?: string | null;
  policyOwnerId?: string | null;
  contactOwnerId?: string | null;
}): string | null {
  return (
    input.threadAgentId?.trim() ||
    input.dealOwnerId?.trim() ||
    input.policyOwnerId?.trim() ||
    input.contactOwnerId?.trim() ||
    null
  );
}

export function suggestedAssigneeFromMatch(
  match: InboxMatch,
  threadAgentId?: string | null,
): string | null {
  return suggestedInboxAssignee({
    threadAgentId,
    dealOwnerId: match.deal?.ownerId,
    policyOwnerId: match.renewal?.ownerId,
    contactOwnerId: match.contact?.ownerId,
  });
}

export function inboxAssignedKey(threadId: string, agentId: string): string {
  return `${INBOX_ASSIGNED_KIND}:${threadId.trim()}:${agentId.trim()}`;
}

export function inboxAssignConfirmCopy(agentName: string): string {
  const target = agentName.trim() || "this agent";
  return `Assign this thread to ${target}? They get an Inbox ping with a link back here.`;
}

export function inboxAssignNotification(input: {
  subject: string;
  fromLabel: string;
  assignerName: string;
  threadId: string;
}): { title: string; why: string; href: string; urgency: PanelUrgency } {
  const subject = input.subject.trim() || "(no subject)";
  const from = input.fromLabel.trim() || "Sender";
  const assigner = input.assignerName.trim() || "A teammate";
  return {
    title: subject,
    why: `${assigner} assigned agency mail from ${from}`,
    href: inboxThreadHref(input.threadId),
    urgency: "high",
  };
}

/** Machine line stored under the panel key block (hidden by displayNoticeBody). */
export function encodePanelHref(href: string): string {
  return `<!--ff-href:${href.trim()}-->`;
}

export function parsePanelHref(body: string | null | undefined): string | null {
  const match = (body ?? "").match(/<!--ff-href:([^>]+)-->/);
  const href = match?.[1]?.trim() ?? "";
  return href.startsWith("/") ? href : null;
}

/** Thread id from inbox_mail:threadId or inbox_assigned:threadId:agentId keys. */
export function threadIdFromPanelKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("inbox_mail:")) {
    const id = key.slice("inbox_mail:".length).trim();
    return id || null;
  }
  if (key.startsWith(`${INBOX_ASSIGNED_KIND}:`)) {
    const rest = key.slice(`${INBOX_ASSIGNED_KIND}:`.length);
    const cut = rest.lastIndexOf(":");
    const id = (cut > 0 ? rest.slice(0, cut) : rest).trim();
    return id || null;
  }
  return null;
}

export function inboxMailDeepLink(input: {
  body: string;
  entityType: string | null;
  entityId: string | null;
}): string {
  const fromMeta = parsePanelHref(input.body);
  if (fromMeta) return fromMeta;
  const key = input.body.match(/<!--ff-panel:([^>]+)-->/)?.[1] ?? null;
  const threadId = threadIdFromPanelKey(key);
  if (threadId) return inboxThreadHref(threadId);
  if (input.entityType === "deal" && input.entityId) return `/deals/${input.entityId}`;
  if (input.entityType === "contact" && input.entityId) return `/contacts/${input.entityId}`;
  if (input.entityType === "policy" && input.entityId) return `/policies/${input.entityId}`;
  return "/inbox";
}
