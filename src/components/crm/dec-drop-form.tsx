import { createDealFromDecDrop } from "@/app/actions/crm";
import { ChooseFiles } from "@/components/choose-files";
import { LineSelect } from "@/components/crm/line-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadDeskLineSettings } from "@/lib/db/line-settings";

export async function DecDropForm() {
  const settings = await loadDeskLineSettings();
  return (
    <form action={createDealFromDecDrop} className="ff-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-navy">Dec drop → deal</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Same funnel as a lead. The declarations file opens a shopping deal. Contact and policy
          still wait for bind.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="decFirstName" className="text-xs">
            First name
          </Label>
          <Input id="decFirstName" name="firstName" required className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="decLastName" className="text-xs">
            Last name
          </Label>
          <Input id="decLastName" name="lastName" required className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="decPhone" className="text-xs">
            Phone
          </Label>
          <Input id="decPhone" name="phone" className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="decEmail" className="text-xs">
            Email
          </Label>
          <Input id="decEmail" name="email" type="email" className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="decLine" className="text-xs">
            Line
          </Label>
          <LineSelect id="decLine" settings={settings} />
        </div>
        <div>
          <Label htmlFor="decFile" className="text-xs">
            Dec PDF or text
          </Label>
          <ChooseFiles id="decFile" name="file" required className="mt-1" />
        </div>
      </div>
      <Button type="submit" size="sm">
        Open shop from dec
      </Button>
    </form>
  );
}
