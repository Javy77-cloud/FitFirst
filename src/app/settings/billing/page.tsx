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
        stays on each policy. The book can be exported as CSV.
      </p>
      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Export is Admin-only. Use Commissions for your own production.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {session.isAdmin ? (
          <Link
            href="/settings/export"
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="text-sm font-semibold text-navy">Export the book</div>
            <p className="mt-1 text-sm text-muted-foreground">
              CSV of contacts, policies, and commissions. Same rows as <code>/api/v1</code>.
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
