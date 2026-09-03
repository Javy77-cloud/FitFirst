import { saveEmailSignature } from "@/app/actions/brand";
import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getResolvedDesk, listEmailSignatures } from "@/lib/db/brand-queries";

export const dynamic = "force-dynamic";

export default async function EmailSignaturesPage() {
  const [desk, signatures] = await Promise.all([getResolvedDesk(), listEmailSignatures()]);
  const current = signatures[0];

  return (
    <AppShell title="Email signatures">
      <SettingsSubnav current="signatures" />
      {!desk.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Signatures are Admin-only. Agents keep their own desk colors and columns.
        </p>
      ) : (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Standardized close for client mail. Merge field <code>{"{{signature}}"}</code> — also
          appended when a template omits it. Example copy until you uncheck that box.
        </p>
      )}
      <form action={saveEmailSignature} className="space-y-4">
        <input type="hidden" name="id" value={current?.id ?? ""} />
        <fieldset disabled={!desk.isAdmin} className="space-y-4">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              name="name"
              defaultValue={current?.name ?? "Agency default"}
              className="mt-1 h-8 max-w-md"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isExampleCopy"
              value="true"
              defaultChecked={current?.isExampleCopy ?? true}
            />
            Mark as example copy Javy can edit
          </label>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">English</h2>
              <Textarea name="bodyEn" rows={8} defaultValue={current?.bodyEn ?? ""} />
            </div>
            <div className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Español</h2>
              <Textarea name="bodyEs" rows={8} defaultValue={current?.bodyEs ?? ""} />
            </div>
          </div>
          {desk.isAdmin ? (
            <Button type="submit" size="sm">
              Save signature
            </Button>
          ) : null}
        </fieldset>
      </form>
    </AppShell>
  );
}
