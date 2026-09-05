import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { currentDeskSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const session = await currentDeskSession();

  return (
    <SettingsShell title="Billing" current="billing">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        FitFirst does not invoice producers or take card numbers on this desk. Commission math
        stays on each policy. Book CSV lives under Import / Export — not here.
      </p>
      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Import / Export is Admin-only. Use Commissions for your own production.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {session.isAdmin ? (
          <Link
            href="/settings/import-export"
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="text-sm font-semibold text-navy">Import / Export</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Contacts, businesses, policies, and related packs. CSV import is a stub.
            </p>
          </Link>
        ) : null}
        <Link href="/commissions" className="ff-card block p-4 hover:border-primary/40">
          <div className="text-sm font-semibold text-navy">Commissions</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Producer lines on the desk. Not a billing run and not an agency invoice.
          </p>
        </Link>
      </div>
    </SettingsShell>
  );
}
