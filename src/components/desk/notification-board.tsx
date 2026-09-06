"use client";

import { NotificationChecklist } from "@/components/desk/notification-checklist";
import {
  NOTIFICATION_EMPTY_BOARD,
  NOTIFICATION_IN_APP_COPY,
  followUpLeadHref,
  notificationHref,
  notificationWhen,
} from "@/lib/desk/notifications";
import { recordHref } from "@/lib/desk/record-href";

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
      <p className="mb-4 max-w-2xl text-base text-muted-foreground">{NOTIFICATION_IN_APP_COPY}</p>
      <section className="ff-card overflow-hidden">
        <NotificationChecklist
          resetKey={rows.map((row) => row.id).join(",")}
          empty={NOTIFICATION_EMPTY_BOARD}
          alerts={rows.map((alert) => ({
            id: alert.id,
            title: alert.title,
            body: alert.body,
            kind: alert.kind,
            read: Boolean(alert.readAt),
            href: notificationHref(
              recordHref(alert.entityType, alert.entityId) ??
                (alert.kind === "lead_follow_up" ? followUpLeadHref(alert.entityId) : null),
            ),
            when: notificationWhen(alert.createdAt),
          }))}
        />
      </section>
    </div>
  );
}
