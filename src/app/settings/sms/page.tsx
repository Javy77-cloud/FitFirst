import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SmsSettingsPage() {
  await requireAdminPage();

  return (
    <SettingsShell title="SMS settings" current="sms">
      <section className="ff-card max-w-xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Connect Twilio</h2>
        <p className="text-sm text-muted-foreground">
          SMS is not wired. FitFirst does not buy numbers, store Twilio keys, or send texts.
          Bring your own Twilio account when the agency is ready.
        </p>
        <p className="text-xs text-muted-foreground">Status: not connected</p>
        <p className="text-sm">
          <Link href="/settings/integrations" className="text-primary hover:underline">
            Integrations catalog
          </Link>
        </p>
      </section>
    </SettingsShell>
  );
}
