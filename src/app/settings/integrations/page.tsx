import { connectIntegrationStub, disconnectIntegrationStub } from "@/app/actions/integrations";
import { AppShell } from "@/components/app-shell";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { integrationConnections } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID, INTEGRATION_CATALOG, INTEGRATION_CATEGORIES } from "@/lib/domain";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CATEGORY_COPY: Record<(typeof INTEGRATION_CATEGORIES)[number], { title: string; summary: string }> = {
  email: {
    title: "Email",
    summary: "Google, Outlook, Yahoo. BYO later. Nothing sends from this desk.",
  },
  calendar: {
    title: "Calendar",
    summary: "Google and Outlook stay stubs. The desk calendar is already the working board.",
  },
  phone: {
    title: "Phone",
    summary: "Twilio plus Vonage, Telnyx, Bandwidth. Agency pays. FitFirst does not buy numbers.",
  },
  sms: {
    title: "SMS",
    summary: "Twilio, MessageBird, Telnyx. Stub connect only. No texts leave the desk.",
  },
  video: {
    title: "Video",
    summary: "Zoom and Google Meet under Communications. Meeting links later — not a softphone.",
  },
  esign: {
    title: "E-sign",
    summary: "DocuSign and Dropbox Sign. Envelope send stays not_implemented.",
  },
};

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, rows, query] = await Promise.all([
    currentDeskSession(),
    db.select().from(integrationConnections).where(eq(integrationConnections.tenantId, DEFAULT_TENANT_ID)),
    searchParams,
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const byKey = new Map(rows.map((row) => [`${row.category}:${row.provider}`, row]));

  return (
    <AppShell title="Integrations">
      <SettingsSubnav current="integrations" />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Bring-your-own connectors. The agency connects later. Do not paste vendor keys. FitFirst
        does not buy Twilio. Status is a stub so the desk can show intended providers.
      </p>
      {notice === "stub-connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Marked connected as a stub. No vendor was called.
        </p>
      ) : null}
      {notice === "stub-disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Stub disconnected. Desk history stays.
        </p>
      ) : null}
      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting integrations is Admin-only.
        </p>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {INTEGRATION_CATEGORIES.map((category) => {
          const items = INTEGRATION_CATALOG.filter((item) => item.category === category);
          const copy = CATEGORY_COPY[category];
          return (
            <SettingsSection
              key={category}
              id={category}
              title={copy.title}
              badge={category === "video" ? "Communications" : "Admin"}
              summary={copy.summary}
              defaultOpen={category === "email" || category === "phone"}
            >
              <ul className="space-y-2">
                {items.map((item) => {
                  const row = byKey.get(`${item.category}:${item.provider}`);
                  const connected = Boolean(row?.connected);
                  return (
                    <li
                      key={`${item.category}-${item.provider}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-navy">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {connected ? "connected (stub)" : "not connected"}
                          {row?.lastStatus ? ` · ${row.lastStatus}` : ""}
                        </div>
                      </div>
                      {session.isAdmin ? (
                        <form action={connected ? disconnectIntegrationStub : connectIntegrationStub}>
                          <input type="hidden" name="category" value={item.category} />
                          <input type="hidden" name="provider" value={item.provider} />
                          <Button type="submit" size="xs" variant={connected ? "outline" : "secondary"}>
                            {connected ? "Disconnect" : "Connect stub"}
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </SettingsSection>
          );
        })}
      </div>
    </AppShell>
  );
}
