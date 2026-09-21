import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { CarrierLoginIssuesPanel } from "@/components/developer/carrier-login-issues-panel";
import { requireAdminOrDeveloperPage } from "@/lib/auth/guards";
import { loadCarrierLoginEvents } from "@/lib/carrier-login-issues/persist";
import { rollupCarrierLoginIssues } from "@/lib/carrier-login-issues/store";
import { CARRIER_LOGIN_ISSUES_RELATIVE_PATH } from "@/lib/carrier-login-issues/types";

export const dynamic = "force-dynamic";

export default async function DeveloperCarrierLoginIssuesPage() {
  await requireAdminOrDeveloperPage();
  const events = await loadCarrierLoginEvents();
  const rollup = rollupCarrierLoginIssues(events);

  return (
    <AppShell title="Carrier login issues" eyebrow="Developer">
      <DeskPageTrail
        fallbackHref="/developer"
        crumbs={[
          { href: "/developer", label: "Developer" },
          { label: "Carrier login issues" },
        ]}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Quote-bot portal login failures only — captcha, 2FA, lockouts, expired sessions, rejected
        credentials. Missing Risk Profile questions stay on{" "}
        <Link href="/developer/missing-questions" className="text-primary hover:underline">
          Missing questions
        </Link>
        . The list file is <code>{CARRIER_LOGIN_ISSUES_RELATIVE_PATH}</code>.
      </p>
      <CarrierLoginIssuesPanel rollup={rollup} events={events} />
    </AppShell>
  );
}
