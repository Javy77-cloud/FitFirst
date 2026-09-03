import { createDeal } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { LineSelect } from "@/components/crm/line-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewDealPage() {
  return (
    <AppShell title="New shopping deal">
      <form action={createDeal} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Type the name once. It becomes the lead and the deal’s insured name. Contact and
          policy wait until bind. Life and health are CRM notes only — no rating worksheet.
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
              Line
            </Label>
            <LineSelect />
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
        <div>
          <Label htmlFor="notes" className="text-xs">
            CRM notes (used for life/health)
          </Label>
          <Textarea id="notes" name="notes" className="mt-1 min-h-20" />
        </div>
        <Button type="submit" size="sm">
          Open worksheet
        </Button>
      </form>
    </AppShell>
  );
}
