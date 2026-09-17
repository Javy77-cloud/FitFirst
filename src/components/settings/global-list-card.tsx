"use client";

import {
  addGlobalListItem,
  clearGlobalListColors,
  deleteGlobalList,
  deleteGlobalListItem,
  saveGlobalList,
} from "@/app/actions/global-lists";
import { ClearAllColorsForm } from "@/components/desk/clear-all-colors-form";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { StatusColorSelect, StatusColorSwatch } from "@/components/desk/status-color-select";
import { CollapsibleListCard } from "@/components/settings/collapsible-list-card";
import { StayOnSaveForm, useStayAction } from "@/components/settings/stay-on-save-form";
import { Button } from "@/components/ui/button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Input } from "@/components/ui/input";
import type { GlobalListRow } from "@/lib/db/schema";
import type { GlobalListKey } from "@/lib/desk/global-lists";
import { INSURANCE_FAMILIES } from "@/lib/desk/policy-family";

export function GlobalListCard({
  listKey,
  title,
  rows,
  canEdit,
  familyPicker,
}: {
  listKey: GlobalListKey;
  title: string;
  rows: GlobalListRow[];
  canEdit: boolean;
  familyPicker: boolean;
}) {
  const sorted = [...rows].filter((row) => row.active).sort((a, b) => a.label.localeCompare(b.label));
  const saveFormId = `ff-global-list-save-${listKey}`;
  const removeItem = useStayAction(deleteGlobalListItem, "list-item-deleted");
  const removeList = useStayAction(deleteGlobalList, "list-deleted");
  const clearColors = useStayAction(clearGlobalListColors, "colors-cleared");
  const addItem = useStayAction(addGlobalListItem, "global-list-saved");

  const items = sorted.map((row) => (
    <div
      key={row.id}
      className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-sm"
      data-ff-global-list-item={row.id}
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <StatusColorSwatch color={row.color} />
        {canEdit ? (
          <>
            <input type="hidden" form={saveFormId} name="ids" value={row.id} />
            <Input
              form={saveFormId}
              name="labels"
              defaultValue={row.label}
              className="h-8 min-w-40 max-w-sm flex-1"
              aria-label={`Name for ${row.label}`}
            />
            <StatusColorSelect
              form={saveFormId}
              name="itemColors"
              defaultValue={row.color}
              aria-label={`Color for ${row.label}`}
            />
            {familyPicker ? (
              <select
                form={saveFormId}
                name="families"
                defaultValue={row.family ?? ""}
                className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                aria-label={`Family for ${row.label}`}
              >
                <option value="">Any family</option>
                {INSURANCE_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" form={saveFormId} name="families" value={row.family ?? ""} />
            )}
          </>
        ) : (
          <>
            <span className="text-navy">{row.label}</span>
            {row.family ? <span className="text-helper text-muted-foreground">{row.family}</span> : null}
          </>
        )}
      </span>
      {canEdit ? (
        <HardDeleteForm action={removeItem} subject="this list item">
          <input type="hidden" name="id" value={row.id} />
          <FileDeleteIcon label={`Delete ${row.label}`} className="text-destructive" />
        </HardDeleteForm>
      ) : null}
    </div>
  ));

  return (
    <div data-ff-global-list={listKey}>
      <CollapsibleListCard
        cardId={`global-${listKey}`}
        header={
          <div>
            <h2 className="text-sm font-semibold text-navy">{title}</h2>
            <p className="text-helper text-muted-foreground">
              {sorted.length} values · A–Z · full color palette
            </p>
          </div>
        }
        actions={
          canEdit ? (
            <>
              {sorted.length > 0 ? (
                <ClearAllColorsForm action={clearColors} subject={title} className="shrink-0">
                  <input type="hidden" name="listKey" value={listKey} />
                  <Button type="submit" size="sm" variant="outline" data-ff-none-for-all="">
                    None for all
                  </Button>
                </ClearAllColorsForm>
              ) : null}
              <HardDeleteForm action={removeList} subject={`list ${title}`}>
                <input type="hidden" name="listKey" value={listKey} />
                <FileDeleteIcon label={`Delete list ${title}`} />
              </HardDeleteForm>
            </>
          ) : null
        }
        items={
          items.length > 0
            ? items
            : [
                <p key="empty" className="text-sm text-muted-foreground">
                  No values yet.
                </p>,
              ]
        }
        footer={
          canEdit ? (
            <div className="space-y-2">
              <StayOnSaveForm id={saveFormId} action={saveGlobalList} flash="global-list-saved">
                <input type="hidden" name="listKey" value={listKey} />
                <Button type="submit" size="xs">
                  Save list
                </Button>
              </StayOnSaveForm>
              <StayOnSaveForm action={addItem} flash="global-list-saved" className="flex flex-wrap items-end gap-2">
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
                  <StatusColorSelect className="mt-0.5 block" defaultValue={null} />
                </label>
                <Button type="submit" size="sm" variant="outline">
                  Add
                </Button>
              </StayOnSaveForm>
            </div>
          ) : null
        }
      />
    </div>
  );
}
