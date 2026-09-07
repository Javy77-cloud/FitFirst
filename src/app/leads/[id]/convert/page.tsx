import { notFound } from "next/navigation";
import { createDealFromLead } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { formatPersonName } from "@/lib/crm/display";
import { LEAD_CARRY_FIELDS } from "@/lib/custom-fields/transfer";
import { getLead } from "@/lib/db/queries";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function ConvertLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shopLines?: string; line?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isUuid(id)) notFound();
  const row = await getLead(id);
  if (!row) notFound();
  const { lead, deal } = row;
  if (deal) {
    notFound();
  }
  const values: Record<string, string> = {
    firstName: lead.firstName ?? "",
    middleName: lead.middleName ?? "",
    lastName: lead.lastName ?? "",
    dateOfBirth: lead.dateOfBirth ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    mailingAddress: lead.mailingAddress ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    zip: lead.zip ?? "",
    notes: lead.notes ?? "",
    source: lead.source ?? "",
    preferredLanguage: lead.preferredLanguage ?? "",
  };

  return (
    <AppShell title="Convert lead" utilityChrome showBrand={false}>
      <h1 className="text-xl font-semibold text-navy">Carry fields to the deal</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        {formatPersonName(lead)} — pick which lead fields copy onto the new deal. Unchecked fields
        stay on the lead only.
      </p>
      <form action={createDealFromLead} className="max-w-xl space-y-4" data-ff-lead-carry>
        <input type="hidden" name="leadId" value={lead.id} />
        <input type="hidden" name="state" value={lead.state ?? "FL"} />
        <input type="hidden" name="line" value={query.line || lead.insuranceTypeDesired || "HO"} />
        <input type="hidden" name="shopLines" value={query.shopLines ?? ""} />
        <input type="hidden" name="carrySelective" value="1" />
        <ul className="space-y-2">
          {LEAD_CARRY_FIELDS.map((field) => (
            <li key={field.key} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
              <input
                type="checkbox"
                name="carryField"
                value={field.key}
                defaultChecked
                className="mt-1"
                id={`carry-${field.key}`}
              />
              <label htmlFor={`carry-${field.key}`} className="min-w-0">
                <span className="block text-sm font-medium text-navy">{field.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {values[field.key] || "Blank on the lead"}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-3">
          <Button type="submit" data-ff-convert-deal>
            Convert selected
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
