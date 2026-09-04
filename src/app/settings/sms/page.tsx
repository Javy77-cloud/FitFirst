import Link from "next/link";
import { connectSmsStub, disconnectSmsStub } from "@/app/actions/sms";
import { AppShell } from "@/components/app-shell";
import { Notice, StubBanner } from "@/components/ops/stub-banner";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getSmsSettings } from "@/lib/db/ops-queries";

export const dynamic = "force-dynamic";

export default async function SmsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const settings = await getSmsSettings();
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <AppShell title="SMS settings">
      <Notice code={notice} />
      <StubBanner>
        Phase two. Connect SMS provider is a stub. FitFirst does not buy numbers, store Twilio
        credentials, or send texts.
      </StubBanner>
      <section className="ff-card max-w-xl p-4">
        <div className="text-sm font-semibold text-navy">SMS provider</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Status:{" "}
          <span className="font-medium text-foreground">
            {settings?.connected ? "connected (stub)" : "not connected"}
          </span>
        </p>
        {settings?.connected ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Provider {settings.provider} · from {settings.displayFrom ?? "not-provisioned"} · last
            result {settings.lastConnectStatus ?? "—"}.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Agencies will plug Twilio (or another provider) later. Nothing leaves this app today.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {settings?.connected ? (
            <form action={disconnectSmsStub}>
              <Button type="submit" size="sm" variant="outline">
                Disconnect
              </Button>
            </form>
          ) : (
            <form action={connectSmsStub}>
              <Button type="submit" size="sm">
                Connect SMS provider
              </Button>
            </form>
          )}
          <Link href="/campaigns" className="text-sm text-primary hover:underline">
            Back to campaigns
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
