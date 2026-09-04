import {
  addLineSubfilter,
  deleteLineSubfilter,
  saveWrittenLines,
} from "@/app/actions/line-settings";
import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/auth/guards";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import type { LineSubfilterOption } from "@/lib/desk/line-settings";

export const dynamic = "force-dynamic";

function OptionList({
  book,
  title,
  hint,
  options,
  canEdit,
}: {
  book: "life" | "health";
  title: string;
  hint: string;
  options: LineSubfilterOption[];
  canEdit: boolean;
}) {
  return (
    <section className="ff-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No options. Add one below.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {options.map((option) => (
            <li key={`${option.book}-${option.slug}-${option.id ?? option.label}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="text-navy">{option.label}</span>
              {canEdit && option.id ? (
                <form action={deleteLineSubfilter}>
                  <input type="hidden" name="id" value={option.id} />
                  <button type="submit" className="text-xs text-destructive hover:underline">
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form action={addLineSubfilter} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="book" value={book} />
          <div className="min-w-48 flex-1">
            <label className="text-xs text-muted-foreground" htmlFor={`${book}-label`}>
              Add {book === "life" ? "Life" : "Health"} option
            </label>
            <Input
              id={`${book}-label`}
              name="label"
              required
              placeholder={book === "life" ? "Guaranteed Issue" : "Dental"}
              className="mt-1 h-8"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Add
          </Button>
        </form>
      ) : null}
    </section>
  );
}

export default async function LinesSettingsPage() {
  const [session, settings] = await Promise.all([requireAdminPage(), loadDeskLineSettings()]);

  return (
    <AppShell title="Lines of business">
      <SettingsSubnav current="lines" isAdmin={session.isAdmin} />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Hide Life or Health when this agency does not write those lines. Navigation, pipeline
        boards, and book filters follow these toggles. Selling Agency stays off the day-to-day
        desk unless you turn the picklists on.
      </p>

      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Line setup is Admin only. Agents still see only the books this agency writes.
        </p>
      ) : null}

      <form action={saveWrittenLines} className="ff-card mb-4 max-w-2xl space-y-3 p-4">
        <fieldset disabled={!session.isAdmin} className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Written lines</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="writeLife" value="true" defaultChecked={settings.writeLife} className="mt-1" />
            <span>
              <span className="font-medium text-navy">Write Life</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Life pipeline, nav, and Life book filters. Off for P&amp;C-only desks.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="writeHealth"
              value="true"
              defaultChecked={settings.writeHealth}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-navy">Write Health</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Health pipeline, nav, and Health book filters. Off when you do not write health.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="showSellingAgency"
              value="true"
              defaultChecked={settings.showSellingAgency}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-navy">Show selling-agency picklists</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Default is hidden. Turn on only if this desk places through more than one selling
                agency (AFA, First Connect, Agentero, Agility, BackNine).
              </span>
            </span>
          </label>
          {session.isAdmin ? (
            <Button type="submit" size="sm">
              Save line settings
            </Button>
          ) : null}
        </fieldset>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <OptionList
          book="life"
          title="Life subfilters"
          hint="Chips on the Life book: Term Life, Whole Life, IUL, Final Expense. Add or delete for this agency."
          options={settings.lifeOptions}
          canEdit={session.isAdmin}
        />
        <OptionList
          book="health"
          title="Health subfilters"
          hint="Chips on the Health book: Marketplace, Medicare Advantage, Medicare A&B, Supplemental."
          options={settings.healthOptions}
          canEdit={session.isAdmin}
        />
      </div>
    </AppShell>
  );
}
