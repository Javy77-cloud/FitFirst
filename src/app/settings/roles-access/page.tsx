import { SettingsShell } from "@/components/settings/settings-shell";
import { RolesAccessPanel } from "@/components/settings/roles-access-panel";
import { requireAdminPage } from "@/lib/auth/guards";
import { getAgentFeatureToggles } from "@/lib/settings/agent-feature-toggles-prefs";

export const dynamic = "force-dynamic";

export default async function RolesAccessSettingsPage() {
  await requireAdminPage();
  const toggles = await getAgentFeatureToggles();

  return (
    <SettingsShell title="Roles & access" current="roles-access">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Who can sign in, and what agents may do. The matrix is explanation-only. Toggles below
        persist for the agency — Google connect, macros, Team/agency book widgets, and Google
        Business advertise (prefs until GBP advertise ships).
      </p>
      <RolesAccessPanel initial={toggles} />
    </SettingsShell>
  );
}
