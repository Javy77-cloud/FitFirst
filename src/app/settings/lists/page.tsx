import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";

export const dynamic = "force-dynamic";

export default function GlobalListsPage() {
  return (
    <SettingsShell title="Lines / Global lists">
      <p className="mb-4 text-sm text-muted-foreground">
        Agency-wide lists — written books, email templates, and won-date triggers. These are not
        per-agent prefs.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/settings/lines" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Lines of business</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hide Life or Health. Subfilters and selling-agency picklists.
          </p>
        </Link>
        <Link href="/settings/email-templates" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Email templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thank-you and review copy. English and Spanish. Nothing sends itself.
          </p>
        </Link>
        <Link href="/settings/email-triggers" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Triggers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hung on won date. ARCHIVE does not cancel. Needs a connected inbox later.
          </p>
        </Link>
        <Link href="/settings/integrations" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Integrations catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mailchimp, SendGrid, and the rest of the BYO list live here.
          </p>
        </Link>
      </div>
    </SettingsShell>
  );
}
