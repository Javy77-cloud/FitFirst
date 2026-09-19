import { AppShell } from "@/components/app-shell";
import { NotificationPanelBoard } from "@/components/notifications/panel-board";
import { CommitmentsTimeline } from "@/components/notifications/commitments-timeline";
import { currentDeskSession } from "@/lib/auth/session";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { listFieldDefs, loadLayoutForModule } from "@/lib/custom-fields/store";
import { loadOpenCommitments } from "@/lib/notifications/load-commitments";
import { serializeCommitments } from "@/lib/notifications/commitments";
import { attachAlertIds, syncPanelSignals } from "@/lib/notifications/sync-panel";
import { PANEL_IN_APP_COPY } from "@/lib/notifications/panel";

export const dynamic = "force-dynamic";

export default async function NotificationBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const newCommitment = (typeof params.newCommitment === "string" ? params.newCommitment : "") === "1";
  const session = await currentDeskSession();
  const [cards, commitments, taskLayout, taskFields] = await Promise.all([
    syncPanelSignals().catch(() => attachAlertIds([])),
    loadOpenCommitments(),
    loadLayoutForModule("tasks").catch(() => defaultLayoutForModule("tasks")),
    listFieldDefs("tasks").catch(() => defaultFieldsForModule("tasks")),
  ]);

  return (
    <AppShell title="Notifications" eyebrow="System attention">
      <p className="mb-4 max-w-3xl text-base text-muted-foreground">{PANEL_IN_APP_COPY}</p>
      {(typeof params.notice === "string" ? params.notice : "") === "autopilot_sent" ? (
        <p className="mb-3 text-sm text-navy">Autopilot confirmed. That band will not nag again.</p>
      ) : null}
      <NotificationPanelBoard cards={cards} />
      <CommitmentsTimeline
        commitments={serializeCommitments(commitments)}
        currentUserId={session.userId}
        layout={taskLayout}
        fields={taskFields}
        defaultOpenCreate={newCommitment}
      />
    </AppShell>
  );
}
