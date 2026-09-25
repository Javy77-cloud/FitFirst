import { AppShell } from "@/components/app-shell";
import { InHouseOnly } from "@/components/automations/in-house-only";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AutomationsSmsPage() {
  await requireSignedIn();
  return (
    <AppShell title="Bulk SMS vendors">
      <AutomationsModuleNav />
      <InHouseOnly title="No Twilio or bulk text vendors" />
    </AppShell>
  );
}
