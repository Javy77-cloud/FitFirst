import Link from "next/link";
import {
  createEmptyFieldPicklist,
  deleteFieldPicklistAction,
  saveFieldPicklist,
} from "@/app/actions/field-picklists";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { StatusColorSelect, StatusColorSwatch } from "@/components/desk/status-color-select";
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
        on any field on any line of business. Each value can have a color from the full desk palette
        and one Default. Values sort A–Z on save. Starter lists — US states, lines of business, and
        common carriers — are ready for <span className="font-medium text-navy">Use a global list</span>{" "}
        on the field builder. These are not the policy book lists under Lines / Global lists.
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
          {lists.map((list) => {
            const defaultIndex = list.options.findIndex((option) => option.isDefault);
            const rows = [
              ...list.options,
              { value: "", color: null as null, isDefault: false },
            ];
            return (
              <section
                key={list.id}
                className="ff-card space-y-3 p-4"
                data-ff-picklist-list={list.id}
                data-ff-picklist-name={list.name}
              >
                <div className="flex items-center gap-2">
                  <FieldTypeIcon type="picklist" />
                  <h2 className="text-sm font-semibold text-navy">{list.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {list.options.length} values · A–Z · colors · default
                  </span>
                </div>
                <form action={saveFieldPicklist} className="space-y-2">
                  <input type="hidden" name="id" value={list.id} />
                  <Input name="name" defaultValue={list.name} className="h-8 max-w-sm" aria-label="List name" />
                  <div className="space-y-1">
                    {rows.map((option, index) => (
                      <div
                        key={`${list.id}-${index}-${option.value}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <StatusColorSwatch color={option.color} />
                        <Input
                          name="options"
                          defaultValue={option.value}
                          placeholder={index >= list.options.length ? "Add another value" : undefined}
                          className="h-8 min-w-40 max-w-sm flex-1"
                          aria-label={`Option ${index + 1}`}
                        />
                        <StatusColorSelect
                          name="optionColors"
                          defaultValue={option.color ?? "slate"}
                          aria-label={`Color for option ${index + 1}`}
                        />
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="radio"
                            name="defaultIndex"
                            value={String(index)}
                            defaultChecked={defaultIndex === index}
                          />
                          Default
                        </label>
                      </div>
                    ))}
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
            );
          })}
        </div>
      )}
    </SettingsShell>
  );
}
