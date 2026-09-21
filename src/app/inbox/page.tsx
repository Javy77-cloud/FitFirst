import { AppShell } from "@/components/app-shell";
import { InboxDesk } from "@/components/inbox/inbox-desk";
import { currentDeskSession } from "@/lib/auth/session";
import { canConnectByoIntegration } from "@/lib/integrations/connect-policy";
import { gmailAccountEmail } from "@/lib/integrations/gmail";
import { loadInboxThreadMessages, loadLiveInboxThreads } from "@/lib/desk/load-inbox-live";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, live, query] = await Promise.all([
    currentDeskSession(),
    loadLiveInboxThreads(20),
    searchParams,
  ]);
  const selectedId = typeof query.thread === "string" ? query.thread : null;
  const notice = typeof query.notice === "string" ? query.notice : null;
  const [accountEmail, messages] = await Promise.all([
    live.connected ? gmailAccountEmail().catch(() => null) : Promise.resolve(null),
    live.connected ? loadInboxThreadMessages(selectedId ?? live.threads[0]?.id ?? null) : Promise.resolve([]),
  ]);

  return (
    <AppShell title="Inbox" eyebrow="Agency Gmail">
      {notice === "byo-connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-sm text-navy">
          Gmail connected. Agency mail will show on this desk.
        </p>
      ) : null}
      {notice === "oauth-wall" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-navy">
          Gmail Connect hit a wall. Open Settings → Email, check Client ID/Secret and Gmail API, then try again.
        </p>
      ) : null}
      <InboxDesk
        threads={live.threads}
        selectedId={selectedId}
        messages={messages}
        canConnect={canConnectByoIntegration(session)}
        connected={live.connected}
        error={live.error}
        accountEmail={accountEmail}
      />
    </AppShell>
  );
}
