import { createDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { ClientScriptRunner } from "@/components/developer-hub/client-script-runner";
import { LinePicker } from "@/components/deal/line-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listEnabledScriptsFor } from "@/lib/db/developer-hub-queries";

export default async function NewDealPage() {
  const scripts = await listEnabledScriptsFor("deals", "create");
  return (
    <AppShell title="Create deal">
      <ClientScriptRunner
        scripts={scripts.map((script) => ({
          id: script.id,
          event: script.event,
          fieldName: script.fieldName,
          body: script.body,
        }))}
      />
      <form action={createDeal} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-base text-muted-foreground">
          Creates a lead and a shopping deal with an empty master risk. Contact and policy wait
          until bind. Pick personal or commercial, then the most-used line.
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
            <Label htmlFor="city" className="text-xs">
              City
            </Label>
            <Input id="city" name="city" className="mt-1 h-8" />
          </div>
          <div>
            <Label htmlFor="county" className="text-xs">
              County
            </Label>
            <Input id="county" name="county" className="mt-1 h-8" />
          </div>
        </div>
        <LinePicker defaultCode="HO" />
        <Button type="submit" size="sm">
          Create deal
        </Button>
      </form>
    </AppShell>
  );
}
