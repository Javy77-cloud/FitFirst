"use client";

import { NotificationChecklist } from "@/components/desk/notification-checklist";
import { displayNoticeBody } from "@/lib/coverage/notices";
import { alertRecordHref } from "@/lib/desk/header-alerts";
import {
  NOTIFICATION_EMPTY_BOARD,
  NOTIFICATION_IN_APP_COPY,
  notificationHref,
  notificationWhen,
} from "@/lib/desk/notifications";

export type BoardAlert = {
  id: string;
  title: string;
  body: string;
  severity: string;
  kind: string;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
};

export function NotificationBoard({ rows }: { rows: BoardAlert[] }) {
  return (
    <div data-testid="notification-board">

      <section className="ff-card overflow-hidden">
        <NotificationChecklist
          resetKey={rows.map((row) => row.id).join(",")}
          empty={NOTIFICATION_EMPTY_BOARD}
          alerts={rows.map((alert) => ({
            id: alert.id,
            title: alert.title,
            body: displayNoticeBody(alert.body),
            kind: alert.kind,
            read: Boolean(alert.readAt),
            href: notificationHref(alertRecordHref(alert)),
            when: notificationWhen(alert.createdAt),
          }))}
        />
      </section>
    </div>
  );
}
