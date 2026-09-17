import Link from "next/link";
import { savePersonalPrefsAction } from "@/app/actions/nav-layout";
import { AppShell } from "@/components/app-shell";
import { PersonalSettingsNav } from "@/components/personal-settings-nav";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireSignedIn } from "@/lib/auth/guards";
import { getStoredNavLayout } from "@/lib/db/nav-prefs";
import {
  DATE_DISPLAY_FORMATS,
  DATE_DISPLAY_FORMAT_LABELS,
  normalizeDateDisplayFormat,
} from "@/lib/dates/display-format";

export const dynamic = "force-dynamic";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Puerto_Rico",
  "Pacific/Honolulu",
];

export default async function PersonalSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; section?: string }>;
}) {
  const session = await requireSignedIn();
  const [params, layout] = await Promise.all([searchParams, getStoredNavLayout(session.userId)]);
  const personal = layout.personal ?? {};
  const section = params.section ?? "overview";
  const current =
    section === "signature"
      ? "/me?section=signature"
      : section === "templates"
        ? "/me?section=templates"
        : section === "notifications"
          ? "/me?section=notifications"
          : section === "timezone"
            ? "/me?section=timezone"
            : "/me";

  return (
    <AppShell title="Settings" eyebrow="Personal" allowMfaPending>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <PersonalSettingsNav current={current} />
        <div className="min-w-0 flex-1 space-y-4">
          {params.error === "admin-only" ? (
            <p className="rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
              That page is agency Admin only. Your personal settings stay here.
            </p>
          ) : null}
          {params.error === "developer-only" ? (
            <p className="rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
              That page is the Developer profile only. Sign in as Developer, or grant the site-developer
              flag.
            </p>
          ) : null}
          {params.saved ? (
            <p className="rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Personal settings saved.</p>
          ) : null}
          <p className="max-w-3xl text-sm text-muted-foreground">
            Signed in as {session.name}. Profile picture uses your initials in the header. Agency
            Settings, billing, people, and carrier credentials stay off this path.
          </p>

          <section id="profile" className="ff-card space-y-2 p-4">
            <h2 className="text-sm font-semibold text-navy">Profile picture</h2>
            <p className="text-sm text-muted-foreground">
              The header avatar uses your name initials. Change the name on Edit Profile.
            </p>
            <Link href="/settings/profile" className="text-sm text-primary hover:underline">
              Edit Profile
            </Link>
          </section>

          <section id="password" className="ff-card space-y-2 p-4">
            <h2 className="text-sm font-semibold text-navy">Password</h2>
            <p className="text-sm text-muted-foreground">Change the password and 2FA on this login.</p>
            <Link href="/settings/security" className="text-sm text-primary hover:underline">
              Open password and 2FA
            </Link>
          </section>

          <form action={savePersonalPrefsAction} className="space-y-4">
            <section id="signature" className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Email signature</h2>
              <p className="text-sm text-muted-foreground">
                Your personal close. Agency signatures stay under Admin.
              </p>
              <Label className="text-xs">Signature</Label>
              <Textarea
                name="emailSignature"
                rows={5}
                defaultValue={personal.emailSignature ?? ""}
                placeholder={`${session.name}\nFitFirst Insurance`}
              />
            </section>

            <section id="templates" className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Personal templates</h2>
              <p className="text-sm text-muted-foreground">
                Your drafts and the shared library. Agency editors stay under Admin.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link href="/automations/templates" className="text-primary hover:underline">
                  Email template library
                </Link>
                <Link href="/documents" className="text-primary hover:underline">
                  Document templates
                </Link>
                <Link href="/templates" className="text-primary hover:underline">
                  Templates folder
                </Link>
              </div>
            </section>

            <section id="notifications" className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Notification preferences</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="notifyInApp"
                  value="true"
                  defaultChecked={personal.notifyInApp !== false}
                />
                Show in-app alerts on the header bell
              </label>
              <p className="text-sm text-muted-foreground">
                Open the{" "}
                <Link href="/notifications" className="text-primary hover:underline">
                  notification board
                </Link>{" "}
                for recent pings. Nothing emails you from this desk.
              </p>
            </section>


            <section id="date-format" className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Date format</h2>
              <p className="text-sm text-muted-foreground">
                How dates show on lists and desk cards for you. Stored values stay ISO; only the
                display changes. Default is M-D-Y.
              </p>
              <Label className="text-xs">Display format</Label>
              <select
                name="dateFormat"
                defaultValue={normalizeDateDisplayFormat(personal.dateFormat)}
                className="mt-1 h-9 w-full max-w-sm rounded-md border border-input bg-card px-2 text-sm"
                data-ff-date-format-pref=""
              >
                {DATE_DISPLAY_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {DATE_DISPLAY_FORMAT_LABELS[format]}
                  </option>
                ))}
              </select>
            </section>

            <section id="timezone" className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Timezone</h2>
              <Label className="text-xs">Desk clock</Label>
              <select
                name="timezone"
                defaultValue={personal.timezone ?? "America/New_York"}
                className="mt-1 h-9 w-full max-w-sm rounded-md border border-input bg-card px-2 text-sm"
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </section>

            <section id="social" className="ff-card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-navy">Connected social accounts</h2>
              <p className="text-sm text-muted-foreground">
                Your pulse and BYO connects. Agency app credentials stay with Admin.
              </p>
              <Link href="/social" className="text-sm text-primary hover:underline">
                Open Social
              </Link>
            </section>

            <Button type="submit" size="sm">
              Save personal settings
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
