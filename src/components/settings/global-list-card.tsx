"use client";

import { useState } from "react";
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
import { ListOptionInput } from "@/components/settings/list-option-input";
import { ListOptionRow } from "@/components/settings/list-option-row";
import { StayOnSaveForm, useStayAction } from "@/components/settings/stay-on-save-form";
import { Button } from "@/components/ui/button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Input } from "@/components/ui/input";
import type { GlobalListRow } from "@/lib/db/schema";
import type { GlobalListKey } from "@/lib/desk/global-lists";
import { liveColorKey, statusColorClass } from "@/lib/desk/status-colors";
import { INSURANCE_FAMILIES } from "@/lib/desk/policy-family";
import { cn } from "@/lib/utils";

function AddValueColor() {
  const [color, setColor] = useState<string | null>(null);
  const token = liveColorKey(color);
  return (
    <span className="inline-flex items-center gap-2" data-ff-live-color={token}>
      <StatusColorSwatch color={color} showEmpty />
      <StatusColorSelect
        className={cn("mt-0.5 block", token !== "none" && statusColorClass(token))}
        defaultValue={null}
        onColorChange={setColor}
      />
    </span>
  );
}

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
    <div key={row.id} data-ff-global-list-item={row.id}>
      <ListOptionRow
        defaultValue={row.color}
        name="itemColors"
        form={saveFormId}
        colorAriaLabel={`Color for ${row.label}`}
        hidePicker={!canEdit}
      >
        {canEdit ? (
          <>
            <input type="hidden" form={saveFormId} name="ids" value={row.id} />
            <ListOptionInput
              form={saveFormId}
              name="labels"
              committedValue={row.label}
              className="h-8 min-w-40 max-w-sm flex-1"
              aria-label={`Name for ${row.label}`}
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
            <HardDeleteForm action={removeItem} subject="this list item">
              <input type="hidden" name="id" value={row.id} />
              <FileDeleteIcon label={`Delete ${row.label}`} className="text-destructive" />
            </HardDeleteForm>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 font-medium text-navy">{row.label}</span>
            {row.family ? <span className="text-helper text-muted-foreground">{row.family}</span> : null}
          </>
        )}
      </ListOptionRow>
    </div>
  ));

  return (
    <div data-ff-global-list={listKey}>
      <CollapsibleListCard
        cardId={`global-${listKey}`}
        header={
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-navy">{title}</h2>
              <span className="ff-list-count">{sorted.length}</span>
            </div>
            <p className="text-helper text-muted-foreground">A–Z · full color palette</p>
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
                <p key="empty" className="px-1 py-1 text-sm text-muted-foreground">
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
              <StayOnSaveForm action={addItem} flash="global-list-saved" className="ff-list-row">
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
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Color
                  <AddValueColor />
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
