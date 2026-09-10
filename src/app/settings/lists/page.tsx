import Link from "next/link";
import {
  addGlobalListItem,
  deleteGlobalListItem,
  updateGlobalListItemColor,
} from "@/app/actions/global-lists";
import { StatusColorSelect, StatusColorSwatch } from "@/components/desk/status-color-select";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentDeskSession } from "@/lib/auth/session";
import { loadGlobalLists } from "@/lib/db/global-lists";
import { listCarriers } from "@/lib/db/queries";
import { GLOBAL_LIST_KEYS, GLOBAL_LIST_LABEL, type GlobalListKey } from "@/lib/desk/global-lists";
import { INSURANCE_FAMILIES } from "@/lib/desk/policy-family";

export const dynamic = "force-dynamic";

export default async function GlobalListsPage() {
  const [session, rows, carriers] = await Promise.all([
    currentDeskSession(),
    loadGlobalLists(),
    listCarriers(),
  ]);

  return (
    <SettingsShell title="Lines / Global lists" current="lists">
      <p className="mb-4 text-sm text-muted-foreground">
        Agency-wide lists — written books, policy picklists, email templates, and won-date
        triggers. These are not per-agent prefs.
      </p>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Link href="/settings/lines" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Lines of business</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hide Life or Health. Subfilters and selling-agency picklists.
          </p>
        </Link>
        <Link href="/settings/email-templates" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Email templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thank-you and review copy. English and Spanish. Nothing sends itself.
          </p>
        </Link>
        <Link href="/settings/email-triggers" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Triggers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hung on won date. ARCHIVE does not cancel. Needs a connected inbox later.
          </p>
        </Link>
        <Link href="/settings/integrations" className="ff-card block p-4 hover:border-primary/40">
          <h2 className="text-sm font-semibold text-navy">Integrations catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Google, Outlook, Zoho, social, SMS, e-sign, and EZLynx / QuoteRush. Demo Connect /
            Disconnect. Agency pays the vendor.
          </p>
        </Link>
      </div>

      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Zoho-style picklists used on Policies: types, sub-types, terms, statuses, and file
        categories. Carriers stay on their own records — this hub lists them so you do not hunt.
        No live Zoho.
      </p>

      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          List edits are Admin only. Agents still see the values on Policy forms.
        </p>
      ) : null}

      <section className="ff-card mb-4 p-4">
        <h2 className="text-sm font-semibold text-navy">Carriers</h2>
        <p className="mt-1 text-helper text-muted-foreground">
          Writing companies already on the book. Open a carrier to edit NAIC, AM Best, and appetite.
        </p>
        <ul className="mt-3 columns-1 gap-x-6 text-sm sm:columns-2">
          {[...carriers].sort((a, b) => a.carrier.name.localeCompare(b.carrier.name)).map(({ carrier }) => (
            <li key={carrier.id} className="break-inside-avoid py-0.5">
              <Link href={`/carriers/${carrier.id}`} className="text-primary hover:underline">
                {carrier.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {GLOBAL_LIST_KEYS.map((key) => (
          <ListCard
            key={key}
            listKey={key}
            title={GLOBAL_LIST_LABEL[key]}
            rows={rows.filter((row) => row.listKey === key)}
            canEdit={session.isAdmin}
            familyPicker={key === "policy_sub_type" || key === "policy_term" || key === "policy_type"}
          />
        ))}
      </div>
    </SettingsShell>
  );
}

function ListCard({
  listKey,
  title,
  rows,
  canEdit,
  familyPicker,
}: {
  listKey: GlobalListKey;
  title: string;
  rows: Awaited<ReturnType<typeof loadGlobalLists>>;
  canEdit: boolean;
  familyPicker: boolean;
}) {
  const sorted = [...rows].sort((a, b) => a.label.localeCompare(b.label));
  return (
    <section className="ff-card space-y-3 p-4" data-ff-global-list={listKey}>
      <div>
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        <p className="text-helper text-muted-foreground">{sorted.length} values · A–Z · full color palette</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No values yet.</p>
      ) : (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {sorted.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <StatusColorSwatch color={row.color} />
                <span className="text-navy">{row.label}</span>
                {row.family ? (
                  <span className="text-helper text-muted-foreground">{row.family}</span>
                ) : null}
              </span>
              {canEdit ? (
                <span className="flex flex-wrap items-center gap-2">
                  <form action={updateGlobalListItemColor} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={row.id} />
                    <StatusColorSelect
                      defaultValue={row.color}
                      aria-label={`Color for ${row.label}`}
                    />
                    <button type="submit" className="text-xs text-primary hover:underline">
                      Save color
                    </button>
                  </form>
                  <HardDeleteForm action={deleteGlobalListItem} subject="this list item">
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="text-xs text-destructive hover:underline">
                      Delete
                    </button>
                  </HardDeleteForm>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form action={addGlobalListItem} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="listKey" value={listKey} />
          {familyPicker ? (
            <select name="family" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
              <option value="">Any family</option>
              {INSURANCE_FAMILIES.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          ) : null}
          <Input name="label" required placeholder="Add a value" className="h-8 min-w-40 flex-1" />
          <label className="text-xs text-muted-foreground">
            Color
            <StatusColorSelect className="mt-0.5 block" defaultValue="slate" />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Add
          </Button>
        </form>
      ) : null}
    </section>
  );
}
