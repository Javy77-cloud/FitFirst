import { AppShell } from "@/components/app-shell";
import { InHouseOnly } from "@/components/automations/in-house-only";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AutomationsCampaignsPage() {
  await requireSignedIn();
  return (
    <AppShell title="Paid campaigns">
      <AutomationsModuleNav />
      <InHouseOnly title="No paid email campaigns" />
    </AppShell>
  );
}
