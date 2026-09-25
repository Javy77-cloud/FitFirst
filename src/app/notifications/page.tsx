import { AppShell } from "@/components/app-shell";
import { NotificationPanelBoard } from "@/components/notifications/panel-board";
import { NotificationPanelLaneToggle } from "@/components/notifications/panel-lane-toggle";
import { CommitmentsTimeline } from "@/components/notifications/commitments-timeline";
import { currentDeskSession } from "@/lib/auth/session";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { listFieldDefs, loadLayoutForModule } from "@/lib/custom-fields/store";
import { loadOpenCommitments } from "@/lib/notifications/load-commitments";
import { serializeCommitments } from "@/lib/notifications/commitments";
import { loadPanelCards } from "@/lib/notifications/load-panel";
import { attachAlertIds, syncPanelSignals } from "@/lib/notifications/sync-panel";
import { countCardsByLane, filterCardsByLane, parsePanelLane } from "@/lib/notifications/lanes";

export const dynamic = "force-dynamic";

export default async function NotificationBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lane = parsePanelLane(typeof params.lane === "string" ? params.lane : undefined);
  const newCommitment = (typeof params.newCommitment === "string" ? params.newCommitment : "") === "1";
  const session = await currentDeskSession();
  const [allCards, commitments, taskLayout, taskFields] = await Promise.all([
    syncPanelSignals().catch(async () =>
      attachAlertIds(await loadPanelCards().catch(() => [])),
    ),
    loadOpenCommitments(),
    loadLayoutForModule("tasks").catch(() => defaultLayoutForModule("tasks")),
    listFieldDefs("tasks").catch(() => defaultFieldsForModule("tasks")),
  ]);

  const counts = countCardsByLane(allCards);
  const cards = filterCardsByLane(allCards, lane);

  return (
    <AppShell title="Notifications" eyebrow="System attention">

      <NotificationPanelLaneToggle lane={lane} counts={counts} />

      {(typeof params.notice === "string" ? params.notice : "") === "autopilot_sent" ? (
        <p className="mb-3 text-sm text-navy">Autopilot confirmed. That band will not nag again.</p>
      ) : null}
      <NotificationPanelBoard cards={cards} lane={lane} />
      {lane === "work" ? (
        <CommitmentsTimeline
          commitments={serializeCommitments(commitments)}
          currentUserId={session.userId}
          layout={taskLayout}
          fields={taskFields}
          defaultOpenCreate={newCommitment}
        />
      ) : null}
    </AppShell>
  );
}
