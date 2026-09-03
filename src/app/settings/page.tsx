import { saveAgencyBrand, saveEmailTemplate, uploadAgencyLogo } from "@/app/actions/agency";
import { saveCommissionRate } from "@/app/actions/pipeline-admin";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentDeskSession } from "@/lib/auth/session";
import { loadAgencyBrand } from "@/lib/desk/brand";
import { LINE_FAMILIES, LINE_FAMILY_LABEL } from "@/lib/desk/commission-line";
import { listEmailTemplates, listEmailTriggers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await currentDeskSession();
  const [brand, templates, triggers] = await Promise.all([
    loadAgencyBrand(),
    listEmailTemplates(),
    listEmailTriggers(),
  ]);

  return (
    <AppShell title="Settings">
      <section className="ff-card mb-4 max-w-2xl p-4">
        <h2 className="text-sm font-semibold text-navy">Phone line</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Click-to-call on a record writes an in-app Alerts ping only. There is no Twilio, Vonage,
          or email. Call duration and outcome log on Contact or Policy 360. The softphone stays a stub.
        </p>
        <div className="mt-4 rounded-md border border-dashed border-border px-3 py-4 text-sm">
          <div className="font-medium text-navy">Connect your phone line later</div>
          <p className="mt-1 text-muted-foreground">
            Bring-your-own trunk. Do not paste vendor keys into the app.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 h-8 rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground"
          >
            Connect phone line (not configured)
          </button>
        </div>
      </section>

      {session.isAdmin ? (
        <>
          <section className="ff-card mb-4 max-w-2xl space-y-3 p-4">
            <h2 className="text-sm font-semibold text-navy">Agency chrome</h2>
            <p className="text-xs text-muted-foreground">
              Top-left name and logo. Not hardcoded. Admin only.
            </p>
            <form action={saveAgencyBrand} className="space-y-3">
              <div>
                <Label className="text-xs">Agency name</Label>
                <Input name="agencyName" defaultValue={brand.name} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Email signature</Label>
                <Textarea name="emailSignature" defaultValue={brand.emailSignature} className="mt-1 min-h-20" />
              </div>
              <Button type="submit" size="sm">
                Save brand
              </Button>
            </form>
            <form action={uploadAgencyLogo} className="space-y-2">
              <Label className="text-xs">Logo</Label>
              <input name="logo" type="file" accept="image/*" className="block text-xs" />
              <Button type="submit" size="sm" variant="outline">
                Upload logo
              </Button>
            </form>
          </section>

          <section className="ff-card mb-4 max-w-2xl space-y-4 p-4">
            <h2 className="text-sm font-semibold text-navy">Email templates</h2>
            <p className="text-xs text-muted-foreground">
              Existing thank-you and review stubs. Sending logs the whole message on the record.
            </p>
            {templates.map((tpl) => (
              <form key={tpl.id} action={saveEmailTemplate} className="space-y-2 rounded-md border border-border p-3">
                <input type="hidden" name="id" value={tpl.id} />
                <Input name="name" defaultValue={tpl.name} className="h-8" />
                <Input name="subject" defaultValue={tpl.subject} className="h-8" />
                <Textarea name="body" defaultValue={tpl.body} className="min-h-20" />
                <Button type="submit" size="sm" variant="outline">
                  Save template
                </Button>
              </form>
            ))}
          </section>

          <section className="ff-card max-w-2xl space-y-3 p-4">
            <h2 className="text-sm font-semibold text-navy">Commission rate hints</h2>
            <p className="text-xs text-muted-foreground">
              Optional defaults. Live math uses the Commission4 / GWP stored on each policy. There
              is no Medicare new-vs-renewal field. Marketplace PMPM is per policy, not org-wide.
            </p>
            {LINE_FAMILIES.filter((f) => f !== "medicare_advantage").map((family) => (
              <form key={family} action={saveCommissionRate} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="lineFamily" value={family} />
                <div className="w-48 text-xs font-medium text-navy">{LINE_FAMILY_LABEL[family]}</div>
                <Input name="ratePct" placeholder="Commission4 %" className="h-8 w-28" />
                {family === "health_marketplace" ? (
                  <Input name="perPersonMonth" placeholder="PMPM hint" className="h-8 w-28" />
                ) : null}
                <Button type="submit" size="sm" variant="outline">
                  Save
                </Button>
              </form>
            ))}
          </section>

          <section className="ff-card mb-4 max-w-2xl space-y-3 p-4">
            <h2 className="text-sm font-semibold text-navy">Triggers (stubs only)</h2>
            <p className="text-xs text-muted-foreground">
              Hung on won date, not pipeline stage. ARCHIVE does not cancel these. No SendGrid.
            </p>
            {triggers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trigger stubs.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {triggers.map((trigger) => (
                  <li key={trigger.id} className="rounded-md border border-dashed border-border px-3 py-2">
                    <div className="font-medium text-navy">{trigger.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {trigger.kind} · +{trigger.delayDays} day · hang off {trigger.hangOff} ·{" "}
                      {trigger.enabled ? "enabled stub" : "off"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Agency setup is Admin only. Ask Javy.</p>
      )}
    </AppShell>
  );
}
