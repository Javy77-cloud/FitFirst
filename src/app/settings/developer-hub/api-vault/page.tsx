import { ApiVaultPanel } from "@/components/developer-hub/api-vault-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { loadFedExPublicStatus, loadGetParcelDataPublicStatus } from "@/lib/developer/vault";

export const dynamic = "force-dynamic";

export default async function DeveloperApiVaultPage() {
  const session = await requireAdminPage();
  const [fedex, getParcelData] = await Promise.all([
    loadFedExPublicStatus(),
    loadGetParcelDataPublicStatus(),
  ]);

  return (
    <SettingsShell title="API vault" current="api-vault">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Site-developer secrets only. Admins see that an API key exists, masked as ****************,
        with no reveal. Only a site developer can unlock, rotate, or clear. Keys are encrypted at
        rest with the same AES-256-GCM pattern as carrier portal / PII secrets.
      </p>
      <ApiVaultPanel canEdit={session.isSiteDeveloper} fedex={fedex} getParcelData={getParcelData} />
    </SettingsShell>
  );
}
