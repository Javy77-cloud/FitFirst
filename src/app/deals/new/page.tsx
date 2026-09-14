import Link from "next/link";
import { createDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { LinkExistingContactGuard } from "@/components/crm/link-existing-contact-guard";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { Button } from "@/components/ui/button";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { listEnabledScriptsFor } from "@/lib/db/developer-hub-queries";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const [bundle, scripts, contactRows] = await Promise.all([
    loadModuleLayoutBundle("deals").catch(() => null),
    listEnabledScriptsFor("deals", "create").catch(() => []),
    listContacts().catch(() => []),
  ]);
  const layout = bundle?.layout ?? defaultLayoutForModule("deals");
  const fields = bundle?.fields ?? [];
  const values = Object.fromEntries(allLayoutFieldKeys(layout).map((key) => [key, ""]));
  const contacts = contactRows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    mailingAddress: row.mailingAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
  }));

  return (
    <AppShell title="Add Deal">
      <ClientScriptRunner
        scripts={scripts.map((script) => ({
          id: script.id,
          event: script.event,
          fieldName: script.fieldName,
          body: script.body,
        }))}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Same Deal layout as detail — fill what you know, Save Deal opens the record.
        </p>
        <EditLayoutLink module="deals" />
      </div>

      <LinkExistingContactGuard
        module="deals"
        contacts={contacts}
        action={createDeal}
        className="w-full space-y-3"
        data-ff="new-deal-layout"
      >
        <input type="hidden" name="state" value="FL" />
        <RecordLayoutFields module="deals" layout={layout} fields={fields} values={values} />

        <div className="flex items-center justify-end gap-3 pt-1" data-ff-deal-actions="">
          <Link href="/deals" className="text-sm text-primary hover:underline">
            Back To Deals
          </Link>
          <Button type="submit" data-ff-save-deal="">
            Save Deal
          </Button>
        </div>
      </LinkExistingContactGuard>
    </AppShell>
  );
}
