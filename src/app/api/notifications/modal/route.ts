import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isPlaybookAlertKind } from "@/lib/automations/engine";
import { recordHref } from "@/lib/desk/record-href";
import { isFollowUpPopupKind } from "@/lib/desk/notifications";
import { isDealArchiveReminderKind } from "@/lib/deals/archive-reminder";
import { listAlerts } from "@/lib/db/queries";
import {
  FOLLOW_UP_HIDE_COOKIE,
  parseFollowUpHideCookie,
  shouldShowFollowUpModal,
} from "@/lib/leads/follow-up-templates";
import { releaseDueLeadFollowUps } from "@/lib/leads/apply-follow-up";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await releaseDueLeadFollowUps().catch(() => null);
  const url = new URL(request.url);
  const pathname = url.searchParams.get("path") || "";
  const jar = await cookies();
  const hide = parseFollowUpHideCookie(jar.get(FOLLOW_UP_HIDE_COOKIE)?.value);
  const alertRows = await listAlerts();
  const followUpRow = alertRows.find(
    (row) =>
      !row.readAt &&
      isFollowUpPopupKind(row.kind) &&
      shouldShowFollowUpModal(
        { id: row.id, readAt: row.readAt, entityId: row.entityId },
        hide,
        pathname,
      ),
  );
  const now = Date.now();
  const archiveRow =
    followUpRow
      ? null
      : alertRows.find(
          (row) =>
            !row.readAt &&
            isDealArchiveReminderKind(row.kind) &&
            row.entityType === "deal" &&
            Boolean(row.entityId) &&
            new Date(row.createdAt).getTime() <= now,
        );
  const playbookRow = followUpRow || archiveRow
    ? null
    : alertRows.find(
        (row) =>
          !row.readAt &&
          (isPlaybookAlertKind(row.kind) || row.kind === "task_reminder") &&
          new Date(row.createdAt).getTime() <= now,
      );
  return NextResponse.json({
    followUp: followUpRow
      ? {
          id: followUpRow.id,
          title: followUpRow.title,
          body: followUpRow.body,
          leadId: followUpRow.entityId,
        }
      : null,
    playbook: playbookRow
      ? {
          id: playbookRow.id,
          title: playbookRow.title,
          body: playbookRow.body,
          href: recordHref(playbookRow.entityType, playbookRow.entityId),
        }
      : null,
    archiveReminder: archiveRow
      ? {
          id: archiveRow.id,
          title: archiveRow.title,
          body: archiveRow.body,
          dealId: archiveRow.entityId as string,
          dealTitle: archiveRow.title.replace(/^Archive reminder ·\s*/, "") || null,
        }
      : null,
  });
}
