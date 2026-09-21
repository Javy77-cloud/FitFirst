import { AppShell } from "@/components/app-shell";
import { InboxDesk } from "@/components/inbox/inbox-desk";
import { currentDeskSession } from "@/lib/auth/session";
import { canConnectByoIntegration } from "@/lib/integrations/connect-policy";
import { byoOauthWallCopy } from "@/lib/integrations/byo-credentials";
import { loadInboxDesk } from "@/lib/desk/inbox-engine";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const selectedId = typeof query.thread === "string" ? query.thread : null;
  const notice = typeof query.notice === "string" ? query.notice : null;
  const [session, desk] = await Promise.all([currentDeskSession(), loadInboxDesk(selectedId)]);

  return (
    <AppShell title="Inbox" eyebrow={desk.label}>
      {notice === "byo-connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-sm text-navy">
          {desk.label} connected. Agency mail will show on this desk.
        </p>
      ) : null}
      {notice === "oauth-wall" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-navy" data-ff-oauth-wall="">
          {byoOauthWallCopy(desk.oauthError)}
        </p>
      ) : null}
      <InboxDesk
        threads={desk.threads}
        selectedId={selectedId}
        messages={desk.messages}
        canConnect={canConnectByoIntegration(session)}
        connected={desk.connected}
        error={desk.error}
        accountEmail={desk.accountEmail}
        markReadNotice={desk.markReadNotice}
        mailProvider={desk.providerId}
        connectLabel={desk.connectLabel}
        connectOauthId={desk.connectOauthId}
      />
    </AppShell>
  );
}
