import { displayNoticeBody, noticeHrefFromAlert } from "@/lib/coverage/notices";
import { followUpLeadHref, notificationWhen } from "@/lib/desk/notifications";
import { isPanelSignalKind } from "@/lib/notifications/panel";
import { recordHref } from "@/lib/desk/record-href";

export type HeaderAlert = {
  id: string;
  title: string;
  body: string;
  severity: string;
  kind: string;
  read: boolean;
  href: string | null;
  createdAt: string;
};

export function alertRecordHref(row: {
  kind: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
}): string | null {
  if (isPanelSignalKind(row.kind) && row.entityId) {
    if (row.kind === "quote_declined" && row.entityType === "deal") {
      return `/deals/${row.entityId}?tab=markets`;
    }
    if (row.kind === "stale_docs" && row.entityType === "deal") {
      return `/deals/${row.entityId}?tab=documents`;
    }
    if (row.kind === "renewal_silence") {
      return row.entityType === "policy" ? `/policies/${row.entityId}` : "/renewals";
    }
  }
  return (
    noticeHrefFromAlert(row) ??
    recordHref(row.entityType, row.entityId) ??
    (row.kind === "lead_follow_up" ? followUpLeadHref(row.entityId) : null)
  );
}

export function toHeaderAlert(row: {
  id: string;
  title: string;
  body: string;
  severity: string;
  kind: string;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  createdAt?: Date | string | null;
}): HeaderAlert {
  return {
    id: row.id,
    title: row.title,
    body: displayNoticeBody(row.body),
    severity: row.severity,
    kind: row.kind,
    read: Boolean(row.readAt),
    href: alertRecordHref(row),
    createdAt: notificationWhen(row.createdAt),
  };
}
