import { ApiVaultPanel } from "@/components/developer-hub/api-vault-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminOrDeveloperPage } from "@/lib/auth/guards";
import {
  loadFedExPublicStatus,
  loadGetParcelDataPublicStatus,
  loadPermitStackPublicStatus,
} from "@/lib/developer/vault";
import {
  describeMedicareBulkReady,
  loadMedicareBulkOneshotState,
} from "@/lib/healthsherpa/bulk-medicare";
import {
  loadHealthSherpaAcaPublicStatus,
  loadHealthSherpaInboundPublicStatus,
  loadHealthSherpaMedicarePublicStatus,
} from "@/lib/healthsherpa/vault";
import { loadMetaPublicStatus } from "@/lib/social/meta-app";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function DeveloperApiVaultPage() {
  const session = await requireAdminOrDeveloperPage();
  const [
    fedex,
    getParcelData,
    permitStack,
    healthSherpaMedicare,
    healthSherpaAca,
    healthSherpaInbound,
    medicareBulkReady,
    medicareBulkOneshot,
    meta,
  ] = await Promise.all([
      loadFedExPublicStatus(),
      loadGetParcelDataPublicStatus(),
      loadPermitStackPublicStatus(),
      loadHealthSherpaMedicarePublicStatus(),
      loadHealthSherpaAcaPublicStatus(),
      loadHealthSherpaInboundPublicStatus(),
      describeMedicareBulkReady(),
      loadMedicareBulkOneshotState(),
      loadMetaPublicStatus(),
    ]);

  return (
    <SettingsShell title="API vault" current="api-vault">

      <ApiVaultPanel
        canEdit={session.isSiteDeveloper}
        fedex={fedex}
        getParcelData={getParcelData}
        permitStack={permitStack}
        healthSherpaMedicare={healthSherpaMedicare}
        healthSherpaAca={healthSherpaAca}
        healthSherpaInbound={healthSherpaInbound}
        medicareBulkReady={medicareBulkReady}
        medicareBulkOneshot={medicareBulkOneshot}
        meta={meta}
      />

    </SettingsShell>
  );
}
