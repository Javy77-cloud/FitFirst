import Link from "next/link";
import { deleteAgencyLogo, saveAgencyBrand, saveEmailTemplate, uploadAgencyLogo } from "@/app/actions/agency";
import { saveCalendarAgencySettings } from "@/app/actions/calendar-settings";
import { ChooseFiles } from "@/components/choose-files";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { saveCommissionRate } from "@/app/actions/pipeline-admin";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { SettingsAccordion } from "@/components/settings/settings-accordion";
import { SettingsHomeCards } from "@/components/settings/settings-home-cards";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/guards";
import { loadAgencyBrand } from "@/lib/desk/brand";
import { getCalendarAgencyPrefs } from "@/lib/ops/calendar-agency-prefs";
import { LINE_FAMILIES, LINE_FAMILY_LABEL } from "@/lib/desk/commission-line";
import { getTelephonySettings, listEmailTemplates, listEmailTriggers } from "@/lib/db/queries";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { TELEPHONY_PROVIDER_LABEL, type TelephonyProvider } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminPage();
  const [brand, templates, triggers, telephony, catalog, query, calendarPrefs] = await Promise.all([
    loadAgencyBrand(),
    listEmailTemplates(),
    listEmailTriggers(),
    getTelephonySettings(),
    listCatalogItems(),
    searchParams,
    getCalendarAgencyPrefs(),
  ]);
  const catalogConnected = catalog.some((item) => item.connected);
  const provider = (telephony?.provider ?? "none") as TelephonyProvider;
  const section = typeof query.section === "string" ? query.section : "phone";

  return (
    <SettingsShell title="Settings" current="overview">
      <p className="mb-4 text-sm text-muted-foreground">
        {session.isAdmin
          ? "Admin settings change the agency. Agent settings change only this desk. Open a Setup card — Agency & People, Desk & Phone, Connect, Automations & Developer, Security, Import / Export, or Billing."
          : "Agent settings change only this desk. Agency chrome, integrations, and global lists stay with Admin."}
      </p>
      <div className="mb-6">
        <SettingsHomeCards />
      </div>
      <div className="mb-4" id="settings-sections">
        <SettingsAccordion initial={section} />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings/integrations"
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/40"
        >
          <div>
            <div className="text-sm font-semibold text-navy">Integrations</div>
            <p className="text-helper text-muted-foreground">
              Social is BYO OAuth with the agency’s developer app. Email, SMS, Twilio, IVANS, and
              rater seats stay not connected until those paths are wired. Agency pays the vendor.
            </p>
          </div>
          <ConnectionBadge connected={catalogConnected} />
        </Link>
        {session.isAdmin ? (
          <Link
            href="/settings/import-export"
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/40"
          >
            <div>
              <div className="text-sm font-semibold text-navy">Import / Export</div>
              <p className="text-xs text-muted-foreground">
                Contacts, businesses, policies, and related packs. Zoho JSONL is the live import.
              </p>
            </div>
          </Link>
        ) : null}
        <Link
          href="/settings/social"
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 hover:border-primary/40"
        >
          <div>
            <div className="text-sm font-semibold text-navy">Social / GBP</div>
            <p className="text-helper text-muted-foreground">
              Facebook, Instagram, X, LinkedIn, Google Business Profile. Paste agency app
              credentials and try OAuth. GBP needs Admin approval before agents monitor.
            </p>
          </div>
          <ConnectionBadge connected={catalog.some((item) => item.category === "social" && item.connected)} />
        </Link>
      </div>

      <div className={session.isAdmin ? "grid gap-4 xl:grid-cols-2 xl:items-start" : "space-y-3"}>
        {session.isAdmin ? (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-base font-semibold text-navy">Admin settings</h2>
            <span className="text-helper text-muted-foreground">You can edit these</span>
          </div>

          <SettingsSection
            id="compliance"
            title="Compliance / E&O"
            badge="Admin"
            summary="Append-only trail and gap flags. In-app only."
            defaultOpen
          >
            <p className="text-sm text-muted-foreground">
              Recent email, SMS, call, meeting, document view, PII reveal, and policy-change rows.
              Flags call out silent renewals, Bound files missing a signed app, and Quote Sent with
              no follow-up task. Nothing emails Javy.
            </p>
            <Link href="/compliance" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open Compliance
            </Link>
          </SettingsSection>

          <SettingsSection
            id="people"
            title="People / Agents"
            badge="Admin"
            summary="Create, freeze, notify, and reset passwords."
            defaultOpen
          >
            <p className="text-sm text-muted-foreground">
              Javy Rivera and Maya Chen are already on the desk. Add producers, freeze a login,
              send an in-app note, or push a password reset stub. MFA enroll and recovery live here.
            </p>
            <Link href="/settings/agents" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open People / Agents
            </Link>
          </SettingsSection>

          <SettingsSection
            id="offices"
            title="Offices and territories"
            badge="Admin"
            summary="Desks, geo books, and who sits where."
          >
            <p className="text-sm text-muted-foreground">
              Palm Bay and Savannah desks, Space Coast territory, and agent assignments. Home can
              filter Company-wide, per office, or per territory.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/settings/offices" className="text-primary hover:underline">
                Offices
              </Link>
              <Link href="/settings/territories" className="text-primary hover:underline">
                Territories
              </Link>
              <Link href="/settings/routing" className="text-primary hover:underline">
                Lead routing
              </Link>
            </div>
          </SettingsSection>


          <SettingsSection
            id="calendar-agency"
            title="Calendar"
            badge="Admin"
            summary="Sunday tint and US federal holiday labels on the desk calendar."
          >
            <p className="text-sm text-muted-foreground">
              Agency choice from day one. Agents still schedule over holidays — labels are
              reference only. Sunday tint is a non-working look, not a hard block.
            </p>
            <form action={saveCalendarAgencySettings} className="mt-3 space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="calendarMarkSundayNonWorking"
                  value="true"
                  defaultChecked={calendarPrefs.calendarMarkSundayNonWorking}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-navy">Mark Sunday as non-working</span>
                  <span className="mt-0.5 block text-helper text-muted-foreground">
                    Tint Sunday cells light gray on the month grid. Default on.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="calendarShowUsFederalHolidays"
                  value="true"
                  defaultChecked={calendarPrefs.calendarShowUsFederalHolidays}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-navy">Show US federal holidays</span>
                  <span className="mt-0.5 block text-helper text-muted-foreground">
                    Label New Year&apos;s, MLK, Presidents&apos; Day, Memorial Day, Juneteenth,
                    Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, and
                    Christmas (observed dates). Default on.
                  </span>
                </span>
              </label>
              <Button type="submit" size="sm">
                Save calendar settings
              </Button>
            </form>
            <Link href="/calendar" className="mt-3 inline-block text-sm text-primary hover:underline">
              Open calendar
            </Link>
          </SettingsSection>

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
            id="phone"
            title="Phone line"
            badge="Admin"
            summary="Twilio or BYO trunk. Agency pays. Stub only."
            defaultOpen
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
              <p className="mt-2 text-helper text-muted-foreground">Only an admin can connect a trunk.</p>
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
                  {brand.logoUrl ? (
                    <p className="text-xs text-muted-foreground">Current logo is on file.</p>
                  ) : null}
                  <ChooseFiles name="logo" accept="image/*" />
                  <Button type="submit" size="sm" variant="outline">
                    Upload logo
                  </Button>
                </form>
                {brand.logoUrl ? (
                  <HardDeleteForm action={deleteAgencyLogo} subject="the agency logo">
                    <FileDeleteIcon label="Delete logo" />
                  </HardDeleteForm>
                ) : null}
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
                    <div className="text-helper text-muted-foreground">
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
        ) : null}

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-base font-semibold text-navy">Agent settings</h2>
            <span className="text-helper text-muted-foreground">This login only</span>
          </div>

          <SettingsSection
            id="security"
            title="Security"
            badge="Account"
            summary="Password plus SMS stub, email stub, or TOTP."
            defaultOpen
          >
            <p className="text-sm text-muted-foreground">
              Signed in as {session.name}. 2FA is{" "}
              {session.mfaEnrolled ? "enrolled" : "required before the rest of the desk opens"}.
            </p>
            <p className="mt-3 flex flex-wrap gap-3">
              <Link href="/settings/security" className="text-sm text-primary hover:underline">
                Open security
              </Link>
              <Link href="/settings/profile" className="text-sm text-primary hover:underline">
                Open profile
              </Link>
              {session.isAdmin ? (
                <Link href="/settings/agents" className="text-sm text-primary hover:underline">
                  Agent recovery
                </Link>
              ) : null}
            </p>
          </SettingsSection>

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
              Your tasks, calls, and meetings. Drag to reschedule. Color is by type. Sunday tint
              and US federal holiday labels follow the agency Calendar settings above.
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
    </SettingsShell>
  );
}
