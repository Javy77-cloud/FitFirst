import { createBusiness } from "@/app/actions/activities";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default function NewBusinessPage() {
  return (
    <AppShell title="Add business" eyebrow="New">
      <form action={createBusiness} className="ff-card max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Commercial account. Personal HO stays on a Contact. This does not bind a policy.
        </p>
        <div>
          <Label className="text-xs">Business name</Label>
          <Input name="name" required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Legal name</Label>
          <Input name="legalName" className="mt-1 h-8" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">City</Label>
            <Input name="city" className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input name="state" defaultValue="FL" className="mt-1 h-8" />
          </div>
        </div>
        <Button type="submit" size="sm">
          Save business
        </Button>
      </form>
    </AppShell>
  );
}
