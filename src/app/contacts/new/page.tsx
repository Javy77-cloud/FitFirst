import Link from "next/link";
import { createContact } from "@/app/actions/crm";
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

export default async function NewContactPage() {
  const [bundle, contactRows] = await Promise.all([
    loadModuleLayoutBundle("contacts").catch(() => null),
    listContacts().catch(() => []),
  ]);
  const layout = bundle?.layout ?? defaultLayoutForModule("contacts");
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
    <AppShell title="Add Contact">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Same Contact layout as detail — fill what you know, Save Contact opens the record.
        </p>
        <EditLayoutLink module="contacts" />
      </div>

      <LinkExistingContactGuard
        module="contacts"
        contacts={contacts}
        action={createContact}
        className="w-full space-y-3"
        data-ff="new-contact-layout"
      >
        <input type="hidden" name="state" value="FL" />
        <RecordLayoutFields module="contacts" layout={layout} fields={fields} values={values} />
        <div className="flex items-center justify-end gap-3 pt-1" data-ff-contact-actions="">
          <Link href="/contacts" className="text-sm text-primary hover:underline">
            Back To Contacts
          </Link>
          <Button type="submit" data-ff-save-contact="">
            Save Contact
          </Button>
        </div>
      </LinkExistingContactGuard>
    </AppShell>
  );
}
