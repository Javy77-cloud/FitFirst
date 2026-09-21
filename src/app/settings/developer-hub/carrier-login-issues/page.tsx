import Link from "next/link";
import { CarrierLoginIssuesPanel } from "@/components/developer/carrier-login-issues-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminOrDeveloperPage } from "@/lib/auth/guards";
import { loadCarrierLoginEvents } from "@/lib/carrier-login-issues/persist";
import { rollupCarrierLoginIssues } from "@/lib/carrier-login-issues/store";

export const dynamic = "force-dynamic";

export default async function SettingsCarrierLoginIssuesPage() {
  await requireAdminOrDeveloperPage();
  const events = await loadCarrierLoginEvents();
  const rollup = rollupCarrierLoginIssues(events);

  return (
    <SettingsShell title="Carrier login issues" current="carrier-login-issues">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Admin / Developer view of quote-bot login failures. Same rows as{" "}
        <Link href="/developer/carrier-login-issues" className="text-primary hover:underline">
          Developer → Carrier login issues
        </Link>
        . Documented in <code>data/carrier-login-issues.md</code>.
      </p>
      <CarrierLoginIssuesPanel rollup={rollup} events={events} />
    </SettingsShell>
  );
}
