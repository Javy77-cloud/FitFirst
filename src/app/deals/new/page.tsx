import { createDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewDealPage() {
  return (
    <AppShell title="New shopping deal">
      <form action={createDeal} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Creates a lead and a shopping deal with an empty master risk. Contact and policy wait
          until bind.
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
            <Label htmlFor="line" className="text-xs">
              Line
            </Label>
            <select
              id="line"
              name="line"
              defaultValue="HO"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="HO">Homeowners</option>
              <option value="AUTO">Auto</option>
              <option value="FLOOD">Flood</option>
              <option value="UMBRELLA">Umbrella</option>
            </select>
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
        <Button type="submit" size="sm">
          Open worksheet
        </Button>
      </form>
    </AppShell>
  );
}
