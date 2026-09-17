import { ApiVaultPanel } from "@/components/developer-hub/api-vault-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminOrDeveloperPage } from "@/lib/auth/guards";
import {
  loadFedExPublicStatus,
  loadGetParcelDataPublicStatus,
  loadPermitStackPublicStatus,
} from "@/lib/developer/vault";
import {
  loadHealthSherpaAcaPublicStatus,
  loadHealthSherpaInboundPublicStatus,
  loadHealthSherpaMedicarePublicStatus,
} from "@/lib/healthsherpa/vault";
import { NHTSA_VPIC_SETTINGS_NOTE } from "@/lib/vin-decode";

export const dynamic = "force-dynamic";

export default async function DeveloperApiVaultPage() {
  const session = await requireAdminOrDeveloperPage();
  const [fedex, getParcelData, permitStack, healthSherpaMedicare, healthSherpaAca, healthSherpaInbound] =
    await Promise.all([
      loadFedExPublicStatus(),
      loadGetParcelDataPublicStatus(),
      loadPermitStackPublicStatus(),
      loadHealthSherpaMedicarePublicStatus(),
      loadHealthSherpaAcaPublicStatus(),
      loadHealthSherpaInboundPublicStatus(),
    ]);

  return (
    <SettingsShell title="API vault" current="api-vault">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Site-developer secrets only. Admins see that an API key exists, masked as ****************,
        with no reveal. Only a site developer can unlock, rotate, or clear. Keys are encrypted at
        rest with the same AES-256-GCM pattern as carrier portal / PII secrets.
      </p>
      <ApiVaultPanel
        canEdit={session.isSiteDeveloper}
        fedex={fedex}
        getParcelData={getParcelData}
        permitStack={permitStack}
        healthSherpaMedicare={healthSherpaMedicare}
        healthSherpaAca={healthSherpaAca}
        healthSherpaInbound={healthSherpaInbound}
      />
      <p className="mt-4 max-w-3xl text-sm text-muted-foreground" data-ff-nhtsa-vpic-note="">
        {NHTSA_VPIC_SETTINGS_NOTE}
      </p>
    </SettingsShell>
  );
}
