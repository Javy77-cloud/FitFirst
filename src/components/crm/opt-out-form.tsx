import { updateContactRecord } from "@/app/actions/record-edit";
import { Button } from "@/components/ui/button";

export function OptOutForm({
  contactId,
  emailOptOut,
  smsOptOut,
}: {
  contactId: string;
  emailOptOut: boolean;
  smsOptOut: boolean;
}) {
  return (
    <section id="optouts" className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Opt-outs</h2>

      <form action={updateContactRecord} className="mt-3 space-y-2 text-sm">
        <input type="hidden" name="contactId" value={contactId} />
        <input type="hidden" name="saveOptOuts" value="1" />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="emailOptOut" defaultChecked={emailOptOut} />
          Email opt-out
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="smsOptOut" defaultChecked={smsOptOut} />
          SMS opt-out
        </label>
        <Button type="submit" size="sm" variant="outline">
          Save opt-outs
        </Button>
      </form>
    </section>
  );
}
