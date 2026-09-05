import { notificationWhen } from "@/lib/desk/notifications";
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
    body: row.body,
    severity: row.severity,
    kind: row.kind,
    read: Boolean(row.readAt),
    href: recordHref(row.entityType, row.entityId),
    createdAt: notificationWhen(row.createdAt),
  };
}
