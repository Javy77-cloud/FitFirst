import Link from "next/link";
import {
  createEmptyFieldPicklist,
  deleteFieldPicklistAction,
  saveFieldPicklist,
} from "@/app/actions/field-picklists";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";

export const dynamic = "force-dynamic";

export default async function FieldPicklistsPage() {
  const lists = await listFieldPicklists();

  return (
    <SettingsShell title="Picklists" current="picklists">
      <p className="mb-4 text-sm text-muted-foreground">
        Global option lists for picklist and multi-select fields. Create a list once, then reuse it
        on any field on any line of business. These are not the policy book lists under Lines /
        Global lists.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/settings/field-builder" className="text-sm text-primary hover:underline">
          Back to field builder
        </Link>
      </div>

      <form action={createEmptyFieldPicklist} className="mb-4 flex flex-wrap items-end gap-2" data-ff-new-picklist>
        <label className="text-xs text-muted-foreground">
          New list name
          <Input name="name" placeholder="e.g. US states" className="mt-0.5 h-8 w-56" />
        </label>
        <Button type="submit" size="sm">
          Create picklist
        </Button>
      </form>

      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-picklists-empty>
          No global picklists yet. Create one here, then choose it when you drop a picklist or
          multi-select on the field builder.
        </p>
      ) : (
        <div className="space-y-4" data-ff-picklists>
          {lists.map((list) => (
            <section key={list.id} className="ff-card space-y-3 p-4" data-ff-picklist-list={list.id}>
              <div className="flex items-center gap-2">
                <FieldTypeIcon type="picklist" />
                <h2 className="text-sm font-semibold text-navy">{list.name}</h2>
                <span className="text-xs text-muted-foreground">{list.options.length} values</span>
              </div>
              <form action={saveFieldPicklist} className="space-y-2">
                <input type="hidden" name="id" value={list.id} />
                <Input name="name" defaultValue={list.name} className="h-8 max-w-sm" aria-label="List name" />
                <div className="space-y-1">
                  {list.options.map((option, index) => (
                    <Input
                      key={`${list.id}-${index}`}
                      name="options"
                      defaultValue={option}
                      className="h-8 max-w-sm"
                      aria-label={`Option ${index + 1}`}
                    />
                  ))}
                  <Input name="options" placeholder="Add another value" className="h-8 max-w-sm" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="xs">
                    Save list
                  </Button>
                </div>
              </form>
              <form action={deleteFieldPicklistAction}>
                <input type="hidden" name="id" value={list.id} />
                <Button type="submit" size="xs" variant="ghost">
                  Delete list
                </Button>
              </form>
            </section>
          ))}
        </div>
      )}
    </SettingsShell>
  );
}
