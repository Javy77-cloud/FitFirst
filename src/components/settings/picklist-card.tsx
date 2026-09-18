"use client";

import {
  clearFieldPicklistColors,
  deleteFieldPicklistAction,
  removeFieldPicklistOption,
  saveFieldPicklist,
} from "@/app/actions/field-picklists";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { ClearAllColorsForm } from "@/components/desk/clear-all-colors-form";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { CollapsibleListCard } from "@/components/settings/collapsible-list-card";
import { ListOptionInput } from "@/components/settings/list-option-input";
import { ListOptionPersist } from "@/components/settings/list-option-persist";
import { ListOptionRow } from "@/components/settings/list-option-row";
import { StayOnSaveForm, useStayAction } from "@/components/settings/stay-on-save-form";
import { Button } from "@/components/ui/button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import type { FieldPicklist } from "@/lib/custom-fields/picklists";
import { collapsedPicklistPersistFields, listOptionRowKey } from "@/lib/settings/list-editor";

export function PicklistCard({ list }: { list: FieldPicklist }) {
  const saveFormId = `ff-picklist-save-${list.id}`;
  const defaultIndex = list.options.findIndex((option) => option.isDefault);
  const removeOption = useStayAction(removeFieldPicklistOption, "list-item-deleted");
  const deleteList = useStayAction(deleteFieldPicklistAction, "list-deleted");
  const clearColors = useStayAction(clearFieldPicklistColors, "colors-cleared");

  const items = list.options.map((option, index) => (
    <div key={listOptionRowKey(list.id, index)} data-ff-picklist-option={option.value}>
      <ListOptionRow
        defaultValue={option.color}
        name="optionColors"
        form={saveFormId}
        colorAriaLabel={`Color for option ${index + 1}`}
      >
        <ListOptionInput
          form={saveFormId}
          name="options"
          committedValue={option.value}
          className="h-8 min-w-40 max-w-sm flex-1"
          aria-label={`Option ${index + 1}`}
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
        <HardDeleteForm action={removeOption} subject={`value ${option.value}`}>
          <input type="hidden" name="id" value={list.id} />
          <input type="hidden" name="value" value={option.value} />
          <FileDeleteIcon label={`Delete ${option.value}`} />
        </HardDeleteForm>
      </ListOptionRow>
    </div>
  ));

  return (
    <div data-ff-picklist-list={list.id} data-ff-picklist-name={list.name}>
      <CollapsibleListCard
        cardId={`picklist-${list.id}`}
        header={
          <div className="space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <FieldTypeIcon type="picklist" />
              <h2 className="text-sm font-semibold tracking-tight text-navy">{list.name}</h2>
              <span className="ff-list-count">{list.options.length}</span>
              <span className="text-helper text-muted-foreground">A–Z · click Color · default</span>
            </div>
            <StayOnSaveForm id={saveFormId} action={saveFieldPicklist} flash="pick-list-saved" className="space-y-2">
              <input type="hidden" name="id" value={list.id} />
              <ListOptionInput
                name="name"
                committedValue={list.name}
                className="h-8 max-w-sm"
                aria-label="List name"
              />
            </StayOnSaveForm>
          </div>
        }
        actions={
          <>
            {list.options.length > 0 ? (
              <ClearAllColorsForm action={clearColors} subject={list.name} className="shrink-0">
                <input type="hidden" name="id" value={list.id} />
                <Button type="submit" size="sm" variant="outline" data-ff-none-for-all="">
                  None for all
                </Button>
              </ClearAllColorsForm>
            ) : null}
            <HardDeleteForm action={deleteList} subject={`picklist ${list.name}`}>
              <input type="hidden" name="id" value={list.id} />
              <FileDeleteIcon label={`Delete list ${list.name}`} />
            </HardDeleteForm>
          </>
        }
        items={items}
        collapsedPersist={
          <ListOptionPersist form={saveFormId} fields={collapsedPicklistPersistFields(list.options, defaultIndex)} />
        }
        footer={
          <div className="space-y-2">
            <div data-ff-picklist-option="new">
              <ListOptionRow
                defaultValue={null}
                name="optionColors"
                form={saveFormId}
                colorAriaLabel={`Color for option ${list.options.length + 1}`}
              >
                <ListOptionInput
                  form={saveFormId}
                  name="options"
                  committedValue=""
                  placeholder="Add another value"
                  className="h-8 min-w-40 max-w-sm flex-1"
                  aria-label={`Option ${list.options.length + 1}`}
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input form={saveFormId} type="radio" name="defaultIndex" value={String(list.options.length)} />
                  Default
                </label>
              </ListOptionRow>
            </div>
            <Button type="submit" size="xs" form={saveFormId}>
              Save list
            </Button>
          </div>
        }
      />
    </div>
  );
}
