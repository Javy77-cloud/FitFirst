import { saveHolderContact } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HOLDER_CONTACT_DISCLAIMER } from "@/lib/domain-ams";
import type { CertificateHolderContact } from "@/lib/db/schema";

export function HolderContactForm({
  accountId,
  contact,
}: {
  accountId?: string;
  contact?: CertificateHolderContact | null;
}) {
  return (
    <form action={saveHolderContact} className="grid gap-3">
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Holder name</Label>
          <Input
            name="name"
            required
            className="mt-1"
            defaultValue={contact?.name ?? ""}
            placeholder="Palm Bay Marina Dockage"
          />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input
            name="email"
            type="email"
            className="mt-1"
            defaultValue={contact?.email ?? ""}
            placeholder="certs@holder.example"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Phone</Label>
          <Input name="phone" className="mt-1" defaultValue={contact?.phone ?? ""} />
        </div>
        <div>
          <Label className="text-xs">Street</Label>
          <Input name="address" className="mt-1" defaultValue={contact?.address ?? ""} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">City</Label>
          <Input name="city" className="mt-1" defaultValue={contact?.city ?? ""} />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Input name="state" className="mt-1" maxLength={2} defaultValue={contact?.state ?? ""} />
        </div>
        <div>
          <Label className="text-xs">ZIP</Label>
          <Input name="zip" className="mt-1" defaultValue={contact?.zip ?? ""} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea name="notes" rows={2} className="mt-1" defaultValue={contact?.notes ?? ""} />
      </div>
      <Button type="submit" size="sm">
        {contact ? "Save holder contact" : "Add holder contact"}
      </Button>
      <p className="text-sm text-muted-foreground">{HOLDER_CONTACT_DISCLAIMER}</p>
    </form>
  );
}
