"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bindingPatchFromOptionSet,
  groupedOptionSetChoices,
  optionSetValue,
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

  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-background p-2" data-ff-picklist-config={field.key}>
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
          <p className="text-[11px] text-muted-foreground">
            {boundLabel}
            {options.length ? ` · ${options.length} values` : ""} — colors and labels come from the list at
            runtime.
          </p>
          <ul className="max-h-28 overflow-y-auto rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-navy">
            {options.length ? (
              options.map((option, index) => (
                <li key={`${index}:${option}`} className="truncate py-0.5">
                  {option}
                </li>
              ))
            ) : (
              <li className="py-0.5 text-muted-foreground">No values yet. Add them on the Settings list.</li>
            )}
          </ul>
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
              <div key={index} className="flex items-center gap-1">
                <Input
                  value={option}
                  className="h-7"
                  placeholder={`Option ${index + 1}`}
                  data-ff-option-row={index}
                  onChange={(event) => {
                    const next = options.slice();
                    next[index] = event.target.value;
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
  );
}
