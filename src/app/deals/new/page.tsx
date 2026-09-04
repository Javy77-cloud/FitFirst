import { createDeal } from "@/app/actions/crm";
import { AddressAutofill } from "@/components/address-autofill";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineSelect } from "@/components/crm/line-select";
import { loadDeskLineSettings } from "@/lib/db/line-settings";

const SHOP_LINE_OPTIONS = [
  ["home", "Home"],
  ["auto", "Auto"],
  ["rec_rv", "Rec/RV"],
  ["flood", "Flood"],
  ["umbrella", "Umbrella"],
  ["life", "Life"],
  ["health", "Health"],
  ["workers_comp", "Workers Comp"],
  ["general_liability", "General Liability"],
] as const;

export default async function NewDealPage() {
  const settings = await loadDeskLineSettings();
  const shopLines = SHOP_LINE_OPTIONS.filter(([id]) => {
    if (id === "life" && !settings.writeLife) return false;
    if (id === "health" && !settings.writeHealth) return false;
    return true;
  });

  return (
    <AppShell title="New shopping deal">
      <form action={createDeal} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Type the name once. It becomes the lead and the deal’s insured name. Contact and
          policy wait until bind. Life and health are CRM notes only — no rating worksheet.
          {settings.writeLife || settings.writeHealth
            ? " Pick a Life or Health type when that book is the shop."
            : " This agency has Life and Health turned off in Settings."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName" className="text-xs">
              First name
            </Label>
            <Input id="firstName" name="firstName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-xs">
              Last name
            </Label>
            <Input id="lastName" name="lastName" required className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs">
              Phone
            </Label>
            <Input id="phone" name="phone" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input id="email" name="email" type="email" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="line" className="text-xs">
              Primary line
            </Label>
            <LineSelect settings={settings} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address1" className="text-xs">
              Property address
            </Label>
            <AddressAutofill id="address1" name="address1" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="city" className="text-xs">
              City
            </Label>
            <Input id="city" name="city" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="state" className="text-xs">
              State
            </Label>
            <Input id="state" name="state" defaultValue="FL" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="zip" className="text-xs">
              ZIP
            </Label>
            <Input id="zip" name="zip" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="county" className="text-xs">
              County
            </Label>
            <Input id="county" name="county" className="mt-1 h-8" />
          </div>
        </div>
        {settings.writeLife || settings.writeHealth ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {settings.writeLife ? (
              <div>
                <Label htmlFor="lifeSubType" className="text-xs">
                  Life type
                </Label>
                <select
                  id="lifeSubType"
                  name="lifeSubType"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="">—</option>
                  {settings.lifeOptions.map((option) => (
                    <option key={option.slug} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {settings.writeHealth ? (
              <div>
                <Label htmlFor="healthSubType" className="text-xs">
                  Health type
                </Label>
                <select
                  id="healthSubType"
                  name="healthSubType"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="">—</option>
                  {settings.healthOptions.map((option) => (
                    <option key={option.slug} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}
        <fieldset className="rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-navy">Shop lines (tabs)</legend>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Home and Auto are first-class. Add only the lines that apply.
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {shopLines.map(([id, label]) => (
              <label key={id} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="shopLines"
                  value={id}
                  defaultChecked={id === "home" || id === "auto"}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" size="sm">
          Open Quote Sheet
        </Button>
      </form>
    </AppShell>
  );
}
