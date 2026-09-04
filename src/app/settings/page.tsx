import Link from "next/link";
import { saveAgencyBrand, saveEmailTemplate, uploadAgencyLogo } from "@/app/actions/agency";
import { saveCommissionRate } from "@/app/actions/pipeline-admin";
import { AppShell } from "@/components/app-shell";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentDeskSession } from "@/lib/auth/session";
import { loadAgencyBrand } from "@/lib/desk/brand";
import { LINE_FAMILIES, LINE_FAMILY_LABEL } from "@/lib/desk/commission-line";
import { getTelephonySettings, listEmailTemplates, listEmailTriggers } from "@/lib/db/queries";
import { TELEPHONY_PROVIDER_LABEL, type TelephonyProvider } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await currentDeskSession();
  const [brand, templates, triggers, telephony] = await Promise.all([
    loadAgencyBrand(),
    listEmailTemplates(),
    listEmailTriggers(),
    getTelephonySettings(),
  ]);
  const provider = (telephony?.provider ?? "none") as TelephonyProvider;

  return (
    <AppShell title="Settings">
      <SettingsSubnav current="hub" />
      <p className="mb-4 text-sm text-muted-foreground">
        Admin settings change the agency. Agent settings change only this desk. Sections collapse so
        the page uses the full width instead of a single stacked column.
      </p>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-base font-semibold text-navy">Admin settings</h2>
            <span className="text-xs text-muted-foreground">
              {session.isAdmin ? "You can edit these" : "View only — ask Javy"}
            </span>
          </div>

          <SettingsSection
            id="lines"
            title="Lines of business"
            badge="Admin"
            summary="Hide Life or Health. Subfilters and selling-agency picklists."
          >
            <p className="text-sm text-muted-foreground">
              Life and Health chips, hide a book this agency does not write, and the optional
              selling-agency picklists.
            </p>
            <Link href="/settings/lines" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open line settings
            </Link>
          </SettingsSection>

          <SettingsSection
            id="communications"
            title="Communications"
            badge="Admin"
            summary="Video rooms plus agency and agent meeting addresses."
            defaultOpen
          >
            <p className="text-sm text-muted-foreground">
              Zoom, Google Meet, or a BYO link (stubs). In-Office meetings use the agency office plus
              each agent&apos;s meeting address. In-Home pulls the Deal / Lead street.
            </p>
            <Link href="/settings/communications" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open communications
            </Link>
          </SettingsSection>

          <SettingsSection
            id="phone"
            title="Phone line"
            badge="Admin"
            summary="Twilio or BYO trunk. Agency pays. Stub only."
          >
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-medium text-navy">
                {telephony?.connected
                  ? `${TELEPHONY_PROVIDER_LABEL[provider]} · stub connected`
                  : "not connected"}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Click-to-call is gone. Agents log duration and outcome on{" "}
              <Link href="/phone" className="text-primary hover:underline">
                Phone
              </Link>
              . Do not paste vendor keys here.
            </p>
            {session.isAdmin ? (
              <p className="mt-3">
                <Link href="/settings/phone" className="text-sm text-primary hover:underline">
                  Open phone line settings
                </Link>
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Only an admin can connect a trunk.</p>
            )}
          </SettingsSection>

          <SettingsSection
            id="brand"
            title="Agency chrome"
            badge="Admin"
            summary="Name, logo, and email signature every agent inherits."
          >
            {session.isAdmin ? (
              <div className="space-y-3">
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
                <Link href="/settings/agency" className="block text-sm text-primary hover:underline">
                  Full agency branding
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Agency chrome is Admin only.</p>
            )}
          </SettingsSection>

          <SettingsSection
            id="templates"
            title="Email templates"
            badge="Admin"
            summary="Thank-you and review stubs. Sending logs the message on the record."
          >
            {session.isAdmin ? (
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((tpl) => (
                  <form key={tpl.id} action={saveEmailTemplate} className="space-y-2 rounded-md border border-border p-3">
                    <input type="hidden" name="id" value={tpl.id} />
                    <Input name="name" defaultValue={tpl.name} className="h-8" />
                    <Input name="subject" defaultValue={tpl.subject} className="h-8" />
                    <Textarea name="body" defaultValue={tpl.body} className="min-h-16" />
                    <Button type="submit" size="sm" variant="outline">
                      Save template
                    </Button>
                  </form>
                ))}
                <Link href="/settings/email-templates" className="text-sm text-primary hover:underline">
                  Template library
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Templates are Admin only.</p>
            )}
          </SettingsSection>

          <SettingsSection
            id="commission"
            title="Commission rate hints"
            badge="Admin"
            summary="Optional defaults. Live math uses Commission4 / GWP on each policy."
          >
            {session.isAdmin ? (
              <div className="space-y-2">
                {LINE_FAMILIES.filter((f) => f !== "medicare_advantage").map((family) => (
                  <form key={family} action={saveCommissionRate} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="lineFamily" value={family} />
                    <div className="w-40 text-xs font-medium text-navy">{LINE_FAMILY_LABEL[family]}</div>
                    <Input name="ratePct" placeholder="Commission4 %" className="h-8 w-28" />
                    {family === "health_marketplace" ? (
                      <Input name="perPersonMonth" placeholder="PMPM hint" className="h-8 w-28" />
                    ) : null}
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Commission hints are Admin only.</p>
            )}
          </SettingsSection>

          <SettingsSection
            id="triggers"
            title="Triggers"
            badge="Admin"
            summary="Hung on won date. ARCHIVE does not cancel. No SendGrid."
          >
            {triggers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trigger stubs.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {triggers.map((trigger) => (
                  <li key={trigger.id} className="rounded-md border border-dashed border-border px-3 py-2 text-sm">
                    <div className="font-medium text-navy">{trigger.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {trigger.kind} · +{trigger.delayDays} day · hang off {trigger.hangOff}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/settings/email-triggers" className="mt-3 inline-block text-sm text-primary hover:underline">
              Trigger detail
            </Link>
          </SettingsSection>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-base font-semibold text-navy">Agent settings</h2>
            <span className="text-xs text-muted-foreground">This login only</span>
          </div>

          <SettingsSection
            id="my-desk"
            title="My desk"
            badge="Agent"
            summary="Colors, density, and column layout for you — not the agency."
            defaultOpen
          >
            <p className="text-sm text-muted-foreground">
              Signed in as {session.name} · {session.isAdmin ? "Admin (all book)" : "Agent (own book)"}.
              These prefs do not change logo, templates, or another agent&apos;s desk.
            </p>
            <p className="mt-3">
              <Link href="/settings/my-desk" className="text-sm text-primary hover:underline">
                Open my desk prefs
              </Link>
            </p>
          </SettingsSection>

          <SettingsSection
            id="agent-calendar"
            title="Calendar"
            badge="Agent"
            summary="Month / week / day on the desk. Google stays a stub."
          >
            <p className="text-sm text-muted-foreground">
              Your tasks, calls, and meetings. Drag to reschedule. Color is by type.
            </p>
            <Link href="/calendar" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open calendar
            </Link>
          </SettingsSection>

          <SettingsSection
            id="agent-phone"
            title="Call log"
            badge="Agent"
            summary="Log duration and outcome. Attach to Contact, Policy, Deal, Lead, or Business."
          >
            <p className="text-sm text-muted-foreground">
              Agents do not connect Twilio. Use the call log. The line status above is Admin.
            </p>
            <Link href="/phone" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open call log
            </Link>
          </SettingsSection>
        </div>
      </div>
    </AppShell>
  );
}
