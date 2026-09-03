import type { RelatedRecordIds } from "@/lib/lifecycle/activity";

export const COMMS_CHANNELS = ["email", "sms", "call", "meeting", "task"] as const;
export type CommsChannel = (typeof COMMS_CHANNELS)[number];

export const COMMS_DIRECTIONS = ["inbound", "outbound", "internal"] as const;
export type CommsDirection = (typeof COMMS_DIRECTIONS)[number];

export const ACTIVITY_COLORS: Record<string, string> = {
  task: "#2563eb",
  meeting: "#7c3aed",
  call: "#059669",
  email: "#d97706",
  sms: "#0d9488",
};

export function normalizeEmailSubject(subject: string | null | undefined): string {
  return (subject ?? "")
    .trim()
    .replace(/^(re|fwd|fw)\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    || "no-subject";
}

export function commsThreadKey(input: {
  channel: string;
  subject?: string | null;
  related: RelatedRecordIds;
}): string {
  const anchor =
    input.related.contactId ||
    input.related.accountId ||
    input.related.dealId ||
    input.related.policyId ||
    input.related.leadId ||
    "unbound";
  if (input.channel === "email") {
    return `email:${anchor}:${normalizeEmailSubject(input.subject)}`;
  }
  if (input.channel === "sms") {
    return `sms:${anchor}`;
  }
  return `${input.channel}:${anchor}`;
}

export function defaultCommsDirection(kind: string, eventType?: string | null): CommsDirection {
  if (eventType === "received") return "inbound";
  if (eventType === "sent" || eventType === "logged") {
    return kind === "email" || kind === "sms" || kind === "call" ? "outbound" : "internal";
  }
  if (kind === "email" || kind === "sms" || kind === "call") return "outbound";
  return "internal";
}

export function defaultCommsEventType(kind: string, direction: string): string {
  if (kind === "email" || kind === "sms") {
    return direction === "inbound" ? "received" : "sent";
  }
  if (kind === "call") return "logged";
  return "created";
}

export type CommsThread = {
  threadKey: string;
  channel: string;
  subject: string | null;
  messages: CommsMessageView[];
};

export type CommsMessageView = {
  id: string;
  kind: string;
  direction: string;
  eventType: string;
  subject: string | null;
  body: string;
  fromAddress: string | null;
  toAddress: string | null;
  occurredAt: Date;
  activityId: string | null;
  activityStatus: string | null;
  contactId: string | null;
  accountId: string | null;
  policyId: string | null;
  dealId: string | null;
  leadId: string | null;
};

export function groupCommsThreads(items: CommsMessageView[]): CommsThread[] {
  const map = new Map<string, CommsThread>();
  for (const item of items) {
    const key =
      item.kind === "email" || item.kind === "sms"
        ? item.subject
          ? `email:${item.contactId || item.dealId || item.policyId || "x"}:${normalizeEmailSubject(item.subject)}`
          : `${item.kind}:${item.contactId || item.dealId || item.policyId || item.id}`
        : item.id;
    const threadKey = item.kind === "email" || item.kind === "sms" ? key : item.id;
    const existing = map.get(threadKey);
    if (existing) {
      existing.messages.push(item);
    } else {
      map.set(threadKey, {
        threadKey,
        channel: item.kind,
        subject: item.subject || item.kind,
        messages: [item],
      });
    }
  }
  const threads = [...map.values()];
  for (const thread of threads) {
    thread.messages.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }
  threads.sort((a, b) => {
    const aLast = a.messages.at(-1)?.occurredAt.getTime() ?? 0;
    const bLast = b.messages.at(-1)?.occurredAt.getTime() ?? 0;
    return bLast - aLast;
  });
  return threads;
}

export function groupCommsByStoredKey(items: CommsMessageView[], threadKeys: Array<string | null>): CommsThread[] {
  const map = new Map<string, CommsThread>();
  items.forEach((item, i) => {
    const stored = threadKeys[i];
    const key =
      stored ||
      (item.kind === "email" || item.kind === "sms" ? `${item.kind}:${item.id}` : item.id);
    const existing = map.get(key);
    if (existing) existing.messages.push(item);
    else {
      map.set(key, {
        threadKey: key,
        channel: item.kind,
        subject: item.subject || item.kind,
        messages: [item],
      });
    }
  });
  const threads = [...map.values()];
  for (const thread of threads) {
    thread.messages.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }
  threads.sort((a, b) => {
    const aLast = a.messages.at(-1)?.occurredAt.getTime() ?? 0;
    const bLast = b.messages.at(-1)?.occurredAt.getTime() ?? 0;
    return bLast - aLast;
  });
  return threads;
}
