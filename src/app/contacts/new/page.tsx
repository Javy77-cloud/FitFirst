import Link from "next/link";
import { createContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { SourceSelect } from "@/components/crm/source-select";
import { FormPrimaryActions } from "@/components/desk/form-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default function NewContactPage() {
  return (
    <AppShell title="Add contact" eyebrow="New">
      <form action={createContact} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Person on the book. Bind still creates a contact when a shopping deal is written.
          Ana stays Quote Sent / unbound.
        </p>
        <div>
          <Label className="text-xs">First name</Label>
          <Input name="firstName" required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Last name</Label>
          <Input name="lastName" required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input name="phone" className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input name="email" type="email" className="mt-1 h-8" />
        </div>
        <SourceSelect defaultValue="referral" />
        <FormPrimaryActions
          submitLabel="Save contact"
          secondary={<Link href="/contacts">Back to contacts</Link>}
        />
      </form>
    </AppShell>
  );
}
