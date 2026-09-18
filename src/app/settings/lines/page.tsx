import {
  addAgencyLob,
  addLineSubfilter,
  deleteAgencyLob,
  deleteLineSubfilter,
  saveWrittenLines,
  toggleAgencyLob,
  updateAgencyLob,
} from "@/app/actions/line-settings";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { CollapsibleListCard } from "@/components/settings/collapsible-list-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/auth/guards";
import { loadAgencyLobCatalog, loadDeskLineSettings } from "@/lib/db/line-settings";
import { AGENCY_LOB_FAMILIES, type AgencyLobRecord } from "@/lib/desk/agency-lobs";
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
    <CollapsibleListCard
      cardId={`line-${book}`}
      header={
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-navy">{title}</h2>
            <span className="ff-list-count">{options.length}</span>
          </div>
          <p className="text-helper text-muted-foreground">{hint}</p>
        </div>
      }
      items={
        options.length === 0
          ? [
              <p key="empty" className="px-1 py-1 text-sm text-muted-foreground">
                No options. Add one below.
              </p>,
            ]
          : options.map((option) => (
              <div
                key={`${option.book}-${option.slug}-${option.id ?? option.label}`}
                className="ff-list-row justify-between"
              >
                <span className="font-medium text-navy">{option.label}</span>
                {canEdit && option.id ? (
                  <HardDeleteForm action={deleteLineSubfilter} subject="this line option">
                    <input type="hidden" name="id" value={option.id} />
                    <FileDeleteIcon label={`Delete ${option.label}`} className="text-destructive" />
                  </HardDeleteForm>
                ) : null}
              </div>
            ))
      }
      footer={
        canEdit ? (
          <form action={addLineSubfilter} className="ff-list-row">
            <input type="hidden" name="book" value={book} />
            <div className="min-w-48 flex-1">
              <label className="text-helper text-muted-foreground" htmlFor={`${book}-label`}>
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
        ) : null
      }
    />
  );
}

function MasterLobList({
  rows,
  canEdit,
}: {
  rows: AgencyLobRecord[];
  canEdit: boolean;
}) {
  return (
    <CollapsibleListCard
      cardId="agency-lobs"
      header={
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-navy">Agency catalog</h2>
            <span className="ff-list-count">{rows.length}</span>
          </div>
          <p className="text-helper text-muted-foreground">
            Every deal, policy, and form picks one line from this list. Turn a row off to hide it
            from pickers. Built-in lines stay; custom lines can be deleted.
          </p>
        </div>
      }
      items={
        rows.length === 0
          ? [
              <p key="empty" className="px-1 py-1 text-sm text-muted-foreground">
                No lines yet. Seed the desk or add one below.
              </p>,
            ]
          : rows.map((row) => (
              <div
                key={row.id ?? row.productId}
                className="ff-list-row items-start justify-between gap-3"
                data-ff-agency-lob={row.productId}
              >
                {canEdit && row.id ? (
                  <form action={updateAgencyLob} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <div className="min-w-40 flex-1">
                      <label className="text-helper text-muted-foreground" htmlFor={`lob-label-${row.id}`}>
                        Label
                      </label>
                      <Input
                        id={`lob-label-${row.id}`}
                        name="label"
                        required
                        defaultValue={row.label}
                        className="mt-1 h-8"
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-helper text-muted-foreground" htmlFor={`lob-code-${row.id}`}>
                        Code
                      </label>
                      <Input
                        id={`lob-code-${row.id}`}
                        name="lobCode"
                        defaultValue={row.lobCode}
                        className="mt-1 h-8 uppercase"
                      />
                    </div>
                    <div className="w-36">
                      <label className="text-helper text-muted-foreground" htmlFor={`lob-family-${row.id}`}>
                        Family
                      </label>
                      <select
                        id={`lob-family-${row.id}`}
                        name="family"
                        defaultValue={row.family}
                        className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                      >
                        {AGENCY_LOB_FAMILIES.map((family) => (
                          <option key={family} value={family}>
                            {family}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="active" value="true" defaultChecked={row.active} />
                      Active
                    </label>
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </form>
                ) : (
                  <div className="min-w-0">
                    <span className="font-medium text-navy">{row.label}</span>
                    <span className="ml-2 text-helper text-muted-foreground">
                      {row.lobCode} · {row.family}
                      {row.active ? "" : " · hidden"}
                    </span>
                  </div>
                )}
                {canEdit && row.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={toggleAgencyLob}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        {row.active ? "Hide" : "Show"}
                      </Button>
                    </form>
                    {!row.builtIn ? (
                      <HardDeleteForm action={deleteAgencyLob} subject="this line of business">
                        <input type="hidden" name="id" value={row.id} />
                        <FileDeleteIcon label={`Delete ${row.label}`} className="text-destructive" />
                      </HardDeleteForm>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
      }
      footer={
        canEdit ? (
          <form action={addAgencyLob} className="ff-list-row items-end">
            <div className="min-w-48 flex-1">
              <label className="text-helper text-muted-foreground" htmlFor="new-lob-label">
                Add a line this agency writes
              </label>
              <Input id="new-lob-label" name="label" required placeholder="Inland Marine" className="mt-1 h-8" />
            </div>
            <div className="w-28">
              <label className="text-helper text-muted-foreground" htmlFor="new-lob-code">
                Code
              </label>
              <Input id="new-lob-code" name="lobCode" placeholder="IM" className="mt-1 h-8 uppercase" />
            </div>
            <div className="w-36">
              <label className="text-helper text-muted-foreground" htmlFor="new-lob-family">
                Family
              </label>
              <select
                id="new-lob-family"
                name="family"
                defaultValue="personal"
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {AGENCY_LOB_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" variant="outline">
              Add
            </Button>
          </form>
        ) : null
      }
    />
  );
}

export default async function LinesSettingsPage() {
  const [session, settings, catalog] = await Promise.all([
    requireAdminPage(),
    loadDeskLineSettings(),
    loadAgencyLobCatalog(),
  ]);

  return (
    <SettingsShell title="Lines of business" current="lines">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        This is the agency master list. Deals, policies, and forms pick one line from it. Hide Life
        or Health when this desk does not write those books — navigation and pipeline boards follow
        the toggles. Selling Agency stays off the day-to-day desk unless you turn the picklists on.
      </p>

      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Line setup is Admin only. Agents still see only the books this agency writes.
        </p>
      ) : null}

      <form action={saveWrittenLines} className="ff-list-card mb-4 max-w-2xl">
        <div className="ff-list-card-body space-y-3">
        <fieldset disabled={!session.isAdmin} className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Written lines</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="writeLife" value="true" defaultChecked={settings.writeLife} className="mt-1" />
            <span>
              <span className="font-medium text-navy">Write Life</span>
              <span className="mt-0.5 block text-helper text-muted-foreground">
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
              <span className="mt-0.5 block text-helper text-muted-foreground">
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
              <span className="mt-0.5 block text-helper text-muted-foreground">
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
        </div>
      </form>

      <div className="mb-4">
        <MasterLobList rows={catalog} canEdit={session.isAdmin} />
      </div>

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
    </SettingsShell>
  );
}
