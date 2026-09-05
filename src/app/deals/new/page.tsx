import { AppShell } from "@/components/app-shell";
import { CreateDealForm } from "@/components/crm/create-deal-form";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { listEnabledScriptsFor } from "@/lib/db/developer-hub-queries";
import { listPartyTypeahead } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const [scripts, parties] = await Promise.all([
    listEnabledScriptsFor("deals", "create"),
    listPartyTypeahead(),
  ]);
  return (
    <AppShell title="Create deal">
      <ClientScriptRunner
        scripts={scripts.map((script) => ({
          id: script.id,
          event: script.event,
          fieldName: script.fieldName,
          body: script.body,
        }))}
      />
      <CreateDealForm parties={parties} />
    </AppShell>
  );
}
