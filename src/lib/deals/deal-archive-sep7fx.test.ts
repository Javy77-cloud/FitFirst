import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CLOSED_DEAL_ARCHIVE_COPY,
  DEAL_ARCHIVE_REMINDER_KIND,
  dealArchiveReminderBody,
  dealArchiveReminderTitle,
  isClosedOutcomeStage,
  isDealArchiveReminderKind,
} from "@/lib/deals/archive-reminder";
import { SEEDED_PIPELINES, pipelineTabLabel } from "@/lib/wire/pipeline";
import { FLASH_COPY } from "@/lib/flash";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7fx Closed Won/Lost archive now or snooze", () => {
  it("FX1 — popup copy for won and lost; stage select + board + kanban intercept", () => {
    expect(isClosedOutcomeStage("closed_won")).toBe(true);
    expect(isClosedOutcomeStage("closed_lost")).toBe(true);
    expect(isClosedOutcomeStage("won")).toBe(true);
    expect(isClosedOutcomeStage("lost")).toBe(true);
    expect(isClosedOutcomeStage("quote_sent")).toBe(false);
    expect(isClosedOutcomeStage("archive")).toBe(false);

    const popup = source("src/components/deals/closed-deal-archive-popup.tsx");
    expect(popup).toMatch(/data-testid="closed-deal-archive-modal"/);
    expect(popup).toMatch(/CLOSED_DEAL_ARCHIVE_COPY/);
    expect(CLOSED_DEAL_ARCHIVE_COPY).toMatch(/Archive this deal now, or snooze a reminder to archive\?/);
    expect(popup).toMatch(/data-testid="deal-archive-now"/);
    expect(popup).toMatch(/Archive now/);
    expect(popup).toMatch(/testId="deal-archive-snooze"/);
    expect(popup).toMatch(/FollowUpSnoozePresets/);
    expect(popup).not.toMatch(/>Later</);
    expect(popup).not.toMatch(/>Dismiss</);

    const stageSelect = source("src/components/deals/deal-stage-select.tsx");
    expect(stageSelect).toMatch(/isClosedOutcomeStage\(next\)/);
    expect(stageSelect).toMatch(/ClosedDealArchivePopup/);

    const kanban = source("src/components/pipeline/kanban.tsx");
    expect(kanban).toMatch(/isClosedOutcomeStage\(stageSlug\)/);
    expect(kanban).toMatch(/ClosedDealArchivePopup/);

    const boardMove = source("src/components/deals/deal-board-stage-move.tsx");
    expect(boardMove).toMatch(/updateDealStage/);
    expect(boardMove).toMatch(/isClosedOutcomeStage\(stage\)/);
    expect(boardMove).toMatch(/ClosedDealArchivePopup/);
  });

  it("FX2 — Archive now uses archive path and Deal archived toast", () => {
    const popup = source("src/components/deals/closed-deal-archive-popup.tsx");
    expect(popup).toMatch(/archiveClosedDealNow/);
    expect(popup).toMatch(/archiveDealFromReminder/);
    expect(popup).toMatch(/flashAction\("deal-archived"\)/);
    expect(FLASH_COPY["deal-archived"]).toBe("Deal archived");

    const actions = source("src/app/actions/pipeline.ts");
    expect(actions).toMatch(/export async function archiveClosedDealNow/);
    expect(actions).toMatch(/pipelineSlug: "archive"/);
    expect(actions).toMatch(/stageSlug: "archive"/);
    expect(actions).toMatch(/export async function archiveDealFromReminder/);
  });

  it("FX3 — snooze schedules in-app reminder; fire offers Archive + FollowUpSnoozePresets again", () => {
    expect(isDealArchiveReminderKind(DEAL_ARCHIVE_REMINDER_KIND)).toBe(true);
    expect(dealArchiveReminderTitle("Mario HO")).toBe("Archive reminder · Mario HO");
    expect(dealArchiveReminderBody("Mario HO")).toMatch(/Time to archive Mario HO/);

    const actions = source("src/app/actions/pipeline.ts");
    expect(actions).toMatch(/export async function scheduleDealArchiveReminder/);
    expect(actions).toMatch(/DEAL_ARCHIVE_REMINDER_KIND/);
    expect(actions).toMatch(/snoozeDueAt/);
    expect(actions).toMatch(/archiveScheduledAt: dueAt/);

    const popup = source("src/components/deals/closed-deal-archive-popup.tsx");
    expect(popup).toMatch(/FollowUpSnoozePresets/);
    expect(popup).toMatch(/scheduleDealArchiveReminder/);
    expect(popup).toMatch(/snoozeDeskAlert/);
    expect(popup).not.toMatch(/>Later</);

    const modal = source("src/app/api/notifications/modal/route.ts");
    expect(modal).toMatch(/isDealArchiveReminderKind/);
    expect(modal).toMatch(/archiveReminder/);

    const host = source("src/components/desk/app-notification-host.tsx");
    expect(host).toMatch(/archiveReminder/);
    expect(host).toMatch(/ClosedDealArchivePopup/);
    expect(host).toMatch(/alertId=\{archive\.id\}/);
  });

  it("FX4 — leaving without archive keeps closed but unarchived; no silent auto-archive on Won/Lost", () => {
    const stageSelect = source("src/components/deals/deal-stage-select.tsx");
    expect(stageSelect).toMatch(/moveDealToStage/);
    expect(stageSelect).toMatch(/setArchiveOpen\(true\)/);
    // stage change itself does not call archive
    expect(stageSelect).not.toMatch(/archiveClosedDealNow/);
    expect(stageSelect).not.toMatch(/archiveDeal\b/);

    const popup = source("src/components/deals/closed-deal-archive-popup.tsx");
    // post-stage popup may close without archiving; fired reminder locks dismiss
    expect(popup).toMatch(/if \(!next && alertId\) return/);
    expect(popup).toMatch(/onOpenChange\(next\)/);

    const crm = source("src/app/actions/crm.ts");
    expect(crm).toMatch(/DEAL_ARCHIVE_REMINDER_KIND/);
    expect(crm).not.toMatch(/archiveScheduledAt:\s*nextMorning/);
  });

  it("FX5 — Archive board chip/tab label is Archived (slug stays archive)", () => {
    const board = SEEDED_PIPELINES.find((row) => row.slug === "archive");
    expect(board?.slug).toBe("archive");
    expect(board?.name).toBe("Archived");
    expect(board?.stages[0]?.slug).toBe("archive");
    expect(board?.stages[0]?.name).toBe("Archived");
    expect(pipelineTabLabel(board!)).toBe("Archived");

    const workspace = source("src/components/pipeline/workspace.tsx");
    expect(workspace).toMatch(/Archived is its own tab/);
    expect(workspace).not.toMatch(/Archive is its own tab/);
  });
});
