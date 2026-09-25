"use client";

import Link from "next/link";
import { StatusColorSwatch } from "@/components/desk/status-color-select";
import { CollapsibleListCard } from "@/components/settings/collapsible-list-card";
import { ListOptionInput } from "@/components/settings/list-option-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bindingPatchFromOptionSet,
  groupedOptionSetChoices,
  optionSetValue,
  resolveBoundOptionSet,
  OPTION_SET_CUSTOM,
  OPTION_SET_CUSTOM_CATEGORY,
  OPTION_SET_POLICY_CATEGORY,
  type GlobalListOptionSet,
} from "@/lib/custom-fields/option-sets";
import {
  MAX_PICKLIST_OPTIONS,
  resizePicklistOptions,
  type FieldPicklist,
} from "@/lib/custom-fields/picklists";
import type { CustomFieldDef } from "@/lib/custom-fields/types";

export function PicklistConfig({
  field,
  lists,
  globalLists = [],
  onChange,
}: {
  field: CustomFieldDef;
  lists: FieldPicklist[];
  globalLists?: GlobalListOptionSet[];
  onChange: (patch: Partial<CustomFieldDef>) => void;
}) {
  const options = field.options ?? [];
  const selected = optionSetValue(field);
  const bound = selected !== OPTION_SET_CUSTOM;
  const groups = groupedOptionSetChoices(lists);
  const boundLabel =
    groups.policy.find((choice) => choice.value === selected)?.label ??
    groups.custom.find((choice) => choice.value === selected)?.label ??
    "Bound list";
  const boundSet = bound ? resolveBoundOptionSet(field, lists, globalLists) : null;
  const previewRows =
    boundSet?.options.map((option) => ({
      value: option.value,
      color: option.color ?? field.optionColors?.[option.value] ?? null,
    })) ??
    options.map((option) => ({
      value: option,
      color: field.optionColors?.[option] ?? null,
    }));

  return (
    <div className="ff-list-card space-y-2 p-0" data-ff-picklist-config={field.key}>
      <div className="ff-list-card-body space-y-2">
      <p className="text-[11px] font-medium text-navy">
        {field.type === "multi_select" ? "Multi-select options" : "Picklist options"}
      </p>
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">
          Option set
          <select
            aria-label="Option set"
            className="mt-0.5 max-h-44 w-full overflow-y-auto rounded-md border border-border bg-background px-2 py-1 text-sm text-navy"
            value={selected}
            size={8}
            data-ff-global-list
            data-ff-option-set
            onChange={(event) => onChange(bindingPatchFromOptionSet(event.target.value, lists, globalLists, options))}
          >
            <option value={OPTION_SET_CUSTOM}>Custom options</option>
            <optgroup label={OPTION_SET_POLICY_CATEGORY} data-ff-option-set-category="policy">
              {groups.policy.map((choice) => (
                <option key={choice.value} value={choice.value} data-ff-option-set-value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </optgroup>
            <optgroup label={OPTION_SET_CUSTOM_CATEGORY} data-ff-option-set-category="custom">
              {groups.custom.map((choice) => (
                <option key={choice.value} value={choice.value} data-ff-option-set-value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/settings/lists" className="text-xs text-primary hover:underline" data-ff-manage-global-lists>
            Settings → Global lists
          </Link>
          <Link href="/settings/picklists" className="text-xs text-primary hover:underline" data-ff-manage-picklists>
            Settings → Picklists
          </Link>
        </div>
      </div>
      {bound ? (
        <div className="space-y-1" data-ff-option-set-preview>
          <p className="text-[11px] font-medium text-navy">
            {boundLabel}
            {previewRows.length ? ` · ${previewRows.length}` : ""}
          </p>
          {previewRows.length ? (
            <CollapsibleListCard
              cardId={`field-preview-${field.key}`}
              tone="inset"
              items={previewRows.map((option, index) => (
                <div key={`${index}:${option.value}`} className="ff-list-row" data-ff-option-preview={option.value}>
                  <StatusColorSwatch color={option.color} showEmpty />
                  <span className="truncate text-sm text-navy">{option.value}</span>
                </div>
              ))}
            />
          ) : (
            <p className="text-helper text-muted-foreground">No values yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Number of values
            <Input
              type="number"
              min={0}
              max={MAX_PICKLIST_OPTIONS}
              value={options.length}
              className="mt-0.5 h-7 w-20"
              data-ff-option-count
              onChange={(event) => onChange({ options: resizePicklistOptions(options, Number(event.target.value)) })}
            />
          </label>
          <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5" data-ff-option-rows>
            {options.map((option, index) => (
              // Index-only key: option text in the key remounts the input after every letter.
              <div key={index} className="ff-list-row">
                <ListOptionInput
                  committedValue={option}
                  className="h-7"
                  placeholder={`Option ${index + 1}`}
                  data-ff-option-row={index}
                  onCommit={(value) => {
                    const next = options.slice();
                    next[index] = value;
                    onChange({ options: next, picklistId: null, globalListKey: null });
                  }}
                />
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      options: options.filter((_, i) => i !== index),
                      picklistId: null,
                      globalListKey: null,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            data-ff-add-option
            onClick={() => onChange({ options: [...options, ""], picklistId: null, globalListKey: null })}
          >
            Add option
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
