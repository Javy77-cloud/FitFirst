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

      <RolesAccessPanel initial={toggles} />
    </SettingsShell>
  );
}
