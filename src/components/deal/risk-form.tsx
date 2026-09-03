import { updateRisk } from "@/app/actions/crm";
import { SectionTabs } from "@/components/section-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Risk } from "@/lib/db/schema";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="mt-1 h-8"
      />
    </div>
  );
}

export function RiskForm({
  risk,
  dealId,
  activeTab,
}: {
  risk: Risk;
  dealId: string;
  activeTab?: string | null;
}) {
  return (
    <form action={updateRisk} className="ff-card p-4">
      <input type="hidden" name="riskId" value={risk.id} />
      <input type="hidden" name="dealId" value={dealId} />
      <SectionTabs
        param="riskTab"
        defaultValue="home"
        active={activeTab}
        extraQuery={{ tab: "risk" }}
        tabs={[
          {
            id: "home",
            label: "Home",
            content: (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Address" name="address1" defaultValue={risk.address1} />
                  <Field label="City" name="city" defaultValue={risk.city} />
                  <Field label="County" name="county" defaultValue={risk.county} />
                  <Field label="State" name="state" defaultValue={risk.state} />
                  <Field label="ZIP" name="zip" defaultValue={risk.zip} />
                  <Field label="Year built" name="yearBuilt" defaultValue={risk.yearBuilt} type="number" />
                  <Field label="Construction" name="construction" defaultValue={risk.construction} />
                  <Field label="Occupancy" name="occupancy" defaultValue={risk.occupancy} />
                  <Field label="Stories" name="stories" defaultValue={risk.stories} type="number" />
                  <Field label="Sq ft" name="squareFeet" defaultValue={risk.squareFeet} type="number" />
                  <Field label="Coverage A" name="coverageA" defaultValue={risk.coverageA} type="number" />
                  <Field label="Roof year" name="roofYear" defaultValue={risk.roofYear} type="number" />
                  <Field label="Roof covering" name="roofCovering" defaultValue={risk.roofCovering} />
                  <Field
                    label="Opening protection"
                    name="openingProtection"
                    defaultValue={risk.openingProtection}
                  />
                  <Field
                    label="Protection class"
                    name="protectionClass"
                    defaultValue={risk.protectionClass}
                  />
                  <Field
                    label="Miles to coast"
                    name="milesToCoast"
                    defaultValue={risk.milesToCoast}
                    type="number"
                  />
                  <Field
                    label="RCE / MSB"
                    name="replacementCostEstimate"
                    defaultValue={risk.replacementCostEstimate}
                    type="number"
                  />
                </div>
                <label className="mr-4 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="pool" defaultChecked={Boolean(risk.pool)} />
                  Pool
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="mobileHome" defaultChecked={risk.mobileHome} />
                  Mobile / manufactured
                </label>
              </div>
            ),
          },
          {
            id: "auto",
            label: "Auto",
            content: (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="VIN" name="vin" defaultValue={risk.vin} />
                <Field label="Year" name="vehicleYear" defaultValue={risk.vehicleYear} type="number" />
                <Field label="Make" name="vehicleMake" defaultValue={risk.vehicleMake} />
                <Field label="Model" name="vehicleModel" defaultValue={risk.vehicleModel} />
                <Field label="Usage" name="vehicleUsage" defaultValue={risk.vehicleUsage} />
                <Field label="Garaging ZIP" name="garagingZip" defaultValue={risk.garagingZip} />
              </div>
            ),
          },
          {
            id: "life",
            label: "Life / Health",
            content: (
              <p className="text-sm text-muted-foreground">
                Life and health are CRM notes only on the contact. There is no rating for those
                lines in this product.
              </p>
            ),
          },
        ]}
      />
      <div className="mt-4">
        <Button type="submit" size="sm">
          Save worksheet
        </Button>
      </div>
    </form>
  );
}
