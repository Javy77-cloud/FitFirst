"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resizePicklistOptions, type FieldPicklist } from "@/lib/custom-fields/picklists";
import type { CustomFieldDef } from "@/lib/custom-fields/types";

export function PicklistConfig({
  field,
  lists,
  onChange,
}: {
  field: CustomFieldDef;
  lists: FieldPicklist[];
  onChange: (patch: Partial<CustomFieldDef>) => void;
}) {
  const options = field.options ?? [];

  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-background p-2" data-ff-picklist-config={field.key}>
      <p className="text-[11px] font-medium text-navy">
        {field.type === "multi_select" ? "Multi-select options" : "Picklist options"}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Number of values
          <Input
            type="number"
            min={0}
            max={40}
            value={options.length}
            className="mt-0.5 h-7 w-20"
            data-ff-option-count
            onChange={(event) => onChange({ options: resizePicklistOptions(options, Number(event.target.value)) })}
          />
        </label>
        <label className="min-w-40 flex-1 text-xs text-muted-foreground">
          Use a global list
          <select
            className="mt-0.5 h-7 w-full rounded-md border border-border bg-background px-2 text-sm text-navy"
            value={field.picklistId ?? ""}
            data-ff-global-list
            onChange={(event) => {
              const id = event.target.value || null;
              const list = lists.find((item) => item.id === id);
              onChange({
                picklistId: id,
                options: list ? list.options : options,
              });
            }}
          >
            <option value="">Custom options</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
        <Link href="/settings/picklists" className="text-xs text-primary hover:underline" data-ff-manage-picklists>
          Settings → Picklists
        </Link>
      </div>
      <div className="space-y-1">
        {options.map((option, index) => (
          <div key={`${index}-${option}`} className="flex items-center gap-1">
            <Input
              value={option}
              className="h-7"
              placeholder={`Option ${index + 1}`}
              data-ff-option-row={index}
              onChange={(event) => {
                const next = options.slice();
                next[index] = event.target.value;
                onChange({ options: next, picklistId: null });
              }}
            />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => onChange({ options: options.filter((_, i) => i !== index), picklistId: null })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="xs"
          variant="outline"
          data-ff-add-option
          onClick={() => onChange({ options: [...options, ""], picklistId: null })}
        >
          Add option
        </Button>
      </div>
    </div>
  );
}
