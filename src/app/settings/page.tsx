import Link from "next/link";
import { SettingsHomeCards } from "@/components/settings/settings-home-cards";
import { SettingsPinnedLinks } from "@/components/settings/settings-pinned-links";
import { SettingsSearch } from "@/components/settings/settings-search";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAdminPage();

  return (
    <SettingsShell title="Settings" current="overview">

      <SettingsSearch />
      {session.isAdmin ? <SettingsPinnedLinks /> : null}
      <div className="mb-6">
        <SettingsHomeCards />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings/security"
          className="flex items-start justify-between gap-3 rounded-md border border-navy/15 bg-card px-3 py-2.5 hover:border-navy/40"
        >
          <div>
            <div className="text-sm font-semibold text-navy">This login · Security</div>
            <p className="text-helper text-muted-foreground">Signed in as {session.name}.</p>
          </div>
        </Link>
        <Link
          href="/settings/my-desk"
          className="flex items-start justify-between gap-3 rounded-md border border-navy/15 bg-card px-3 py-2.5 hover:border-navy/40"
        >
          <div>
            <div className="text-sm font-semibold text-navy">My desk</div>

          </div>
        </Link>
      </div>
    </SettingsShell>
  );
}
