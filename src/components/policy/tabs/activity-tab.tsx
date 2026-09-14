"use client";

import { useMemo, useState } from "react";
import { formatDay } from "@/lib/domain";
import { noticeKindLabel, noticeStatusLabel, serviceTimelineEventLabel } from "@/lib/domain-ams";
import { groupPolicyChangeLogs, sourceLabel, type PolicyChangeLogRow } from "@/lib/policy/change-log";

type TimelineItem = {
  id: string;
  kind: string;
  eventType: string;
  body: string;
  occurredAt: Date | string;
  activityTitle?: string | null;
  subject?: string | null;
  producerName?: string | null;
};

type NoticeRow = {
  id: string;
  kind: string;
  status: string;
  reason: string;
  effectiveOn: Date | string;
  mailedAt?: Date | string | null;
};

type ServiceRow = {
  id: string;
  eventType: string;
  body: string;
  occurredAt: Date | string;
  activityTitle?: string | null;
  producerName?: string | null;
};

type FeedItem = {
  id: string;
  at: number;
  kind: string;
  title: string;
  body?: string | null;
  failureReason?: string | null;
  producerName?: string | null;
  children?: { label: string; detail: string }[];
  groupKey?: string;
};

function asTime(value: Date | string): number {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function inferFailureReason(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("unreachable") || t.includes("url unreachable")) return "URL unreachable";
  if (t.includes("timeout") || t.includes("timed out")) return "timeout";
  if (t.includes("connection refused")) return "connection refused";
  if (t.includes("dns") && t.includes("fail")) return "DNS failure";
  return null;
}

function FeedEntry({ item }: { item: FeedItem }) {
  const [open, setOpen] = useState(false);
  const hasKids = Boolean(item.children && item.children.length > 0);
  return (
    <li className="rounded-md border border-border px-3 py-2 text-sm" data-ff-policy-activity-item={item.kind}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
          {item.kind}
        </span>
        <span className="text-[11px] text-muted-foreground">{formatDay(new Date(item.at))}</span>
        {item.producerName ? (
          <span
            className="rounded-sm border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium text-navy"
            data-ff-activity-producer=""
            title="Producer"
          >
            {item.producerName}
          </span>
        ) : null}
        {item.failureReason ? (
          <span className="rounded-sm bg-[#BF0A30]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#BF0A30]">
            {item.failureReason}
          </span>
        ) : null}
        {hasKids ? (
          <button
            type="button"
            className="ml-auto text-xs font-medium text-[#002868] underline-offset-2 hover:underline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide details" : `Show ${item.children!.length} related`}
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-medium text-navy">{item.title}</p>
      {item.body ? <p className="mt-0.5 text-muted-foreground">{item.body}</p> : null}
      {hasKids && open ? (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {item.children!.map((child, idx) => (
            <li key={`${item.id}-c-${idx}`} className="text-xs text-muted-foreground">
              <span className="font-medium text-navy">{child.label}</span>
              {child.detail ? ` · ${child.detail}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Chronological feed only — no cancel/non-renew notice form or servicing note form (Quick Comms). */
export function PolicyActivityTab({
  notices,
  serviceTimeline,
  changeLogs,
  timeline,
  producerName,
}: {
  policyId: string;
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
  notices: NoticeRow[];
  serviceTimeline: ServiceRow[];
  changeLogs: PolicyChangeLogRow[];
  timeline: TimelineItem[];
  /** Policy.producer — fallback when a log row has no stamped producer. */
  producerName?: string | null;
  error?: string;
  notice?: string;
}) {
  const policyProducer = producerName?.trim() || null;
  const items = useMemo(() => {
    const feed: FeedItem[] = [];

    for (const n of notices) {
      feed.push({
        id: `notice-${n.id}`,
        at: asTime(n.effectiveOn),
        kind: "notice",
        title: noticeKindLabel(n.kind),
        body: `${noticeStatusLabel(n.status)}${n.reason ? ` · ${n.reason}` : ""}`,
        failureReason: inferFailureReason(n.reason),
        producerName: policyProducer,
      });
    }

    for (const s of serviceTimeline) {
      feed.push({
        id: `service-${s.id}`,
        at: asTime(s.occurredAt),
        kind: "service",
        title: s.activityTitle?.trim() || serviceTimelineEventLabel(s.eventType),
        body: s.body,
        failureReason: inferFailureReason(s.body),
        producerName: s.producerName?.trim() || policyProducer,
      });
    }

    for (const group of groupPolicyChangeLogs(changeLogs)) {
      feed.push({
        id: `change-${group.key}`,
        at: group.changedAt.getTime(),
        kind: "change",
        title: `${group.changedByName} · ${sourceLabel(group.source)}`,
        body: `${group.fields.length} field${group.fields.length === 1 ? "" : "s"} updated`,
        children: group.fields.map((f) => ({
          label: f.fieldLabel,
          detail: `${f.beforeValue} → ${f.afterValue}`,
        })),
        groupKey: group.key,
        producerName: policyProducer,
      });
    }

    for (const row of timeline) {
      feed.push({
        id: `timeline-${row.id}`,
        at: asTime(row.occurredAt),
        kind: row.kind || row.eventType || "activity",
        title: row.activityTitle?.trim() || row.subject?.trim() || row.eventType || row.kind,
        body: row.body,
        failureReason: inferFailureReason(row.body),
        producerName: row.producerName?.trim() || policyProducer,
      });
    }

    feed.sort((a, b) => b.at - a.at);
    return feed;
  }, [notices, serviceTimeline, changeLogs, timeline, policyProducer]);

  return (
    <div className="space-y-4" data-ff-policy-tab="activity">
      <section className="ff-card p-4">
        <h2 className="text-base font-semibold text-navy">Activity & timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chronological feed only (most recent first). Notices, service events, field changes, and
          desk activity. Producer name is on every row when set on the policy.
        </p>
        {policyProducer ? (
          <p className="mt-2 text-sm text-navy">
            Producer: <span className="font-medium">{policyProducer}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No producer name on this policy yet — assign an owner so Activity can show their name.
          </p>
        )}
      </section>

      <section className="ff-card p-4" data-ff-policy-activity-feed="">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity on this policy yet.</p>
        ) : (
          <ol className="space-y-2">
            {items.map((item) => (
              <FeedEntry key={item.id} item={item} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
