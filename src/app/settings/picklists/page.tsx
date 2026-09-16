import Link from "next/link";
import {
  clearFieldPicklistColors,
  createEmptyFieldPicklist,
  deleteFieldPicklistAction,
  removeFieldPicklistOption,
  saveFieldPicklist,
} from "@/app/actions/field-picklists";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { ClearAllColorsForm } from "@/components/desk/clear-all-colors-form";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { StatusColorSelect, StatusColorSwatch } from "@/components/desk/status-color-select";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
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
        and one Default. Values sort A–Z on save. Starter lists — US states, lines of business,
        common carriers, and Deal notices — are ready for{" "}
        <span className="font-medium text-navy">Use a global list</span> on the field builder.
        Deal notices powers the deal header / Quotes notice chip. These are not the policy book
        lists under Lines / Global lists.
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
            const saveFormId = `ff-picklist-save-${list.id}`;
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FieldTypeIcon type="picklist" />
                    <h2 className="text-sm font-semibold text-navy">{list.name}</h2>
                    <span className="text-xs text-muted-foreground">
                      {list.options.length} values · A–Z · colors · default
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {list.options.length > 0 ? (
                      <ClearAllColorsForm
                        action={clearFieldPicklistColors}
                        subject={list.name}
                        className="shrink-0"
                      >
                        <input type="hidden" name="id" value={list.id} />
                        <Button type="submit" size="sm" variant="outline" data-ff-none-for-all="">
                          None for all
                        </Button>
                      </ClearAllColorsForm>
                    ) : null}
                    <HardDeleteForm action={deleteFieldPicklistAction} subject={`picklist ${list.name}`}>
                      <input type="hidden" name="id" value={list.id} />
                      <FileDeleteIcon label={`Delete list ${list.name}`} />
                    </HardDeleteForm>
                  </div>
                </div>

                {/* Save form owns id/name/submit; option inputs associate via form= to avoid nested forms. */}
                <form id={saveFormId} action={saveFieldPicklist} className="space-y-2">
                  <input type="hidden" name="id" value={list.id} />
                  <Input name="name" defaultValue={list.name} className="h-8 max-w-sm" aria-label="List name" />
                </form>

                <div className="space-y-1">
                  {rows.map((option, index) => {
                    const isBlank = index >= list.options.length;
                    return (
                      <div
                        key={`${list.id}-${index}-${option.value}`}
                        className="flex flex-wrap items-center gap-2"
                        data-ff-picklist-option={isBlank ? "new" : option.value}
                      >
                        <StatusColorSwatch color={option.color} />
                        <Input
                          form={saveFormId}
                          name="options"
                          defaultValue={option.value}
                          placeholder={isBlank ? "Add another value" : undefined}
                          className="h-8 min-w-40 max-w-sm flex-1"
                          aria-label={`Option ${index + 1}`}
                        />
                        <StatusColorSelect
                          form={saveFormId}
                          name="optionColors"
                          defaultValue={option.color}
                          aria-label={`Color for option ${index + 1}`}
                        />
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            form={saveFormId}
                            type="radio"
                            name="defaultIndex"
                            value={String(index)}
                            defaultChecked={defaultIndex === index}
                          />
                          Default
                        </label>
                        {!isBlank ? (
                          <HardDeleteForm
                            action={removeFieldPicklistOption}
                            subject={`value ${option.value}`}
                          >
                            <input type="hidden" name="id" value={list.id} />
                            <input type="hidden" name="value" value={option.value} />
                            <FileDeleteIcon label={`Delete ${option.value}`} />
                          </HardDeleteForm>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="xs" form={saveFormId}>
                    Save list
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </SettingsShell>
  );
}
