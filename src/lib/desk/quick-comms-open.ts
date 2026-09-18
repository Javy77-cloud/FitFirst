import { ACTIVITY_KINDS, type ActivityKind } from "@/lib/domain";

export const QUICK_COMMS_EVENT = "ff-open-quick-comms";
export const QUICK_COMMS_PARAM = "qc";

/** Longest action label — all five buttons share this width. */
export const RECORD_ACTIVITY_WIDTH_LABEL = "Meeting";

/** Shared width class: one size for Call / SMS / Email / Task / Meeting. */
export const RECORD_ACTIVITY_ACTION_WIDTH_CLASS = "ff-record-activity-action";

export const RECORD_ACTIVITY_ACTIONS = [
  { kind: "call", label: "Call" },
  { kind: "sms", label: "SMS" },
  { kind: "email", label: "Email" },
  { kind: "task", label: "Task" },
  { kind: "meeting", label: "Meeting" },
] as const;

export type QuickCommsTarget = {
  kind: ActivityKind;
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
};

export function isQuickCommsKind(value: string | null | undefined): value is ActivityKind {
  return Boolean(value && (ACTIVITY_KINDS as readonly string[]).includes(value));
}

export function parseQuickCommsKind(
  value: string | string[] | null | undefined,
): ActivityKind | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return isQuickCommsKind(raw) ? raw : null;
}

type AttrReader = { getAttribute(name: string): string | null };

export function boardMatchesTarget(board: AttrReader, target: QuickCommsTarget): boolean {
  const check = (attr: string, id?: string | null) => {
    if (!id) return true;
    const current = board.getAttribute(attr);
    return !current || current === id;
  };
  return (
    check("data-ff-quick-comms-deal", target.dealId) &&
    check("data-ff-quick-comms-lead", target.leadId) &&
    check("data-ff-quick-comms-contact", target.contactId) &&
    check("data-ff-quick-comms-account", target.accountId) &&
    check("data-ff-quick-comms-policy", target.policyId)
  );
}

export function recordQuickCommsHref(target: QuickCommsTarget): string | null {
  const qc = `${QUICK_COMMS_PARAM}=${encodeURIComponent(target.kind)}`;
  if (target.dealId) return `/deals/${target.dealId}?${qc}`;
  if (target.leadId) return `/leads/${target.leadId}?${qc}`;
  if (target.contactId) return `/contacts/${target.contactId}?${qc}`;
  if (target.policyId) return `/policies/${target.policyId}?${qc}`;
  if (target.accountId) return `/accounts/${target.accountId}?${qc}`;
  return null;
}

export function leadsListQuickCommsHref(leadId: string, kind: ActivityKind, search = ""): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set("rail", leadId);
  params.set(QUICK_COMMS_PARAM, kind);
  return `/leads?${params.toString()}`;
}

/** Open the matching Quick Comms panel action. Never routes to /logs or #activity logs. */
export function launchQuickCommsAction(target: QuickCommsTarget) {
  if (typeof document === "undefined") return;
  const boards = Array.from(document.querySelectorAll("[data-ff-quick-comms-board]"));
  const match = boards.find((board) => boardMatchesTarget(board, target));
  if (match) {
    window.dispatchEvent(new CustomEvent(QUICK_COMMS_EVENT, { detail: target }));
    match.scrollIntoView({ block: "nearest" });
    return;
  }
  if (target.leadId && window.location.pathname === "/leads") {
    window.location.assign(leadsListQuickCommsHref(target.leadId, target.kind, window.location.search));
    return;
  }
  const href = recordQuickCommsHref(target);
  if (href) window.location.assign(href);
}
