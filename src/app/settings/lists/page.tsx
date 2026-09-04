import Link from "next/link";
import {
  addGlobalListItem,
  deleteGlobalListItem,
} from "@/app/actions/global-lists";
import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
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
    <AppShell title="Global lists">
      <SettingsSubnav current="lists" />
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
        <p className="mt-1 text-xs text-muted-foreground">
          Writing companies already on the book. Open a carrier to edit NAIC, AM Best, and appetite.
        </p>
        <ul className="mt-3 columns-1 gap-x-6 text-sm sm:columns-2">
          {carriers.map(({ carrier }) => (
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
    </AppShell>
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
  return (
    <section className="ff-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        <p className="text-xs text-muted-foreground">{rows.length} values</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No values yet.</p>
      ) : (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <span>
                <span className="text-navy">{row.label}</span>
                {row.family ? (
                  <span className="ml-2 text-[11px] text-muted-foreground">{row.family}</span>
                ) : null}
              </span>
              {canEdit ? (
                <form action={deleteGlobalListItem}>
                  <input type="hidden" name="id" value={row.id} />
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
          <Button type="submit" size="sm" variant="outline">
            Add
          </Button>
        </form>
      ) : null}
    </section>
  );
}
