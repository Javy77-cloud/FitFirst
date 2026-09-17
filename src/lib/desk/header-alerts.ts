import { displayNoticeBody, noticeHrefFromAlert } from "@/lib/coverage/notices";
import { followUpLeadHref, notificationWhen } from "@/lib/desk/notifications";
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
