import { AppShell } from "@/components/app-shell";
import { NotificationBoard } from "@/components/desk/notification-board";
import { listAlerts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NotificationBoardPage() {
  const rows = await listAlerts();
  return (
    <AppShell title="Notification board" eyebrow="In-app only">
      <NotificationBoard rows={rows} />
    </AppShell>
  );
}
