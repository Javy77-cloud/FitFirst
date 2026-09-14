import Link from "next/link";
import { createLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { LinkExistingContactGuard } from "@/components/crm/link-existing-contact-guard";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { Button } from "@/components/ui/button";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { loadModuleLayoutBundle } from "@/lib/custom-fields/store";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { listContacts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const [bundle, contactRows] = await Promise.all([
    loadModuleLayoutBundle("leads").catch(() => null),
    listContacts().catch(() => []),
  ]);
  const layout = bundle?.layout ?? defaultLayoutForModule("leads");
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
    <AppShell title="Add Lead">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Same Lead layout as detail — fill what you know, Save Lead opens the record.
        </p>
        <EditLayoutLink module="leads" />
      </div>

      <LinkExistingContactGuard
        module="leads"
        contacts={contacts}
        action={createLead}
        className="w-full space-y-3"
        data-ff="new-lead-layout"
      >
        <input type="hidden" name="state" value="FL" />
        <RecordLayoutFields module="leads" layout={layout} fields={fields} values={values} />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="autoRoute" value="1" defaultChecked className="mt-1" />
          <span>
            Auto-route by territory, written line, and producer capacity. No match goes to the Home
            lead-offer board.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-1" data-ff-lead-actions="">
          <Link href="/leads" className="text-sm text-primary hover:underline">
            Back To Leads
          </Link>
          <Button type="submit" data-ff-save-lead="">
            Save Lead
          </Button>
        </div>
      </LinkExistingContactGuard>
    </AppShell>
  );
}
