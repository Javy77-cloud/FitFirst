export type RailPerson = {
  key: string;
  label: string;
  href: string;
  phone: string | null;
  email: string | null;
  kindLabel: string;
};

export type RailDeal = {
  id: string;
  title: string;
  stage: string;
  href: string;
};

export type RailPolicy = {
  id: string;
  number: string;
  status: string;
  href: string;
};

export type RailOpenActivity = {
  id: string;
  kind: string;
  title: string;
  href: string;
  when: string | null;
};

export type RailConversation = {
  id: string;
  title: string;
  body: string;
  when: string;
};

export type RecordContextPayload = {
  people: RailPerson[];
  deals: RailDeal[];
  policies: RailPolicy[];
  openActivities: RailOpenActivity[];
  conversations: RailConversation[];
  newDealHref: string;
  newActivityHref: string;
};

export type RecordContextScope = {
  contactId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  accountId?: string | null;
};

export function activityHref(kind: string, id: string): string {
  return kind === "meeting" ? `/meetings/${id}` : `/tasks/${id}`;
}

export function personKey(kind: "contact" | "lead" | "account", id: string): string {
  return `${kind}:${id}`;
}

/** Same activity set as Quick Comms / contacts / deals: Tasks, Meetings, Calls, Emails, SMS. */
export const RAIL_ACTIVITY_KINDS = ["task", "meeting", "call", "email", "sms"] as const;

export function groupOpenActivities(items: RailOpenActivity[]): { kind: string; items: RailOpenActivity[] }[] {
  const buckets = new Map<string, RailOpenActivity[]>();
  for (const kind of RAIL_ACTIVITY_KINDS) buckets.set(kind, []);
  for (const item of items) {
    const list = buckets.get(item.kind) ?? [];
    list.push(item);
    buckets.set(item.kind, list);
  }
  return RAIL_ACTIVITY_KINDS.map((kind) => ({ kind, items: buckets.get(kind) ?? [] }));
}
