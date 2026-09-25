import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { currentDeskSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const session = await currentDeskSession();

  return (
    <SettingsShell title="Billing" current="billing">

      <div className="grid gap-3 sm:grid-cols-2">
        {session.isAdmin ? (
          <Link
            href="/settings/import-export"
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="text-sm font-semibold text-navy">Import / Export</div>

          </Link>
        ) : null}
        <Link href="/commissions" className="ff-card block p-4 hover:border-primary/40">
          <div className="text-sm font-semibold text-navy">Commissions</div>

        </Link>
      </div>
    </SettingsShell>
  );
}
