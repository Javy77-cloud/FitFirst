"use client";

import Link from "next/link";
import { useState } from "react";
import {
  addDealLayoutField,
  addDealLayoutSection,
  deleteDealLayoutField,
  deleteDealLayoutSection,
  relabelDealLayoutField,
  relabelDealLayoutSection,
  saveDealFieldValues,
  uploadDealFieldImage,
} from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";

export function DealDetailsPanel({
  dealId,
  line,
  layout,
  fields,
  values,
}: {
  dealId: string;
  line: string;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
}) {
  const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));

  return (
    <div data-ff-deal-details>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Layout for this line of business. Click a label to rename. Changes apply to every {line} deal.
        </p>
        <Link
          href={`/settings/field-builder?line=${encodeURIComponent(line)}`}
          className="text-sm text-primary hover:underline"
          data-ff-open-field-builder
        >
          Open field builder
        </Link>
      </div>
      <form action={saveDealFieldValues} id="deal-details-save">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
      </form>
      <div
        className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 max-[699px]:grid-cols-1"
        data-ff-deal-details-layout="two-col"
      >
        {layout.columns.map((column) => (
          <div key={column.id} className="min-w-0 space-y-3" data-ff-deal-details-col={column.id}>
            {column.sections.map((section) => (
              <section key={section.id} className="ff-card space-y-2 p-3" data-ff-deal-section={section.id}>
                <div className="flex items-center justify-between gap-2">
                  <InlineLabel
                    dealId={dealId}
                    line={line}
                    name="label"
                    value={section.label}
                    action={relabelDealLayoutSection}
                    hidden={{ sectionId: section.id }}
                  />
                  <form action={deleteDealLayoutSection}>
                    <input type="hidden" name="dealId" value={dealId} />
                    <input type="hidden" name="line" value={line} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Button type="submit" size="xs" variant="ghost">
                      Delete section
                    </Button>
                  </form>
                </div>
                {section.fieldKeys.map((key) => {
                  const field = byKey[key];
                  if (!field) return null;
                  return (
                    <div key={key} className="space-y-1" data-ff-deal-field={key}>
                      <div className="flex items-center justify-between gap-2">
                        <InlineLabel
                          dealId={dealId}
                          line={line}
                          name="label"
                          value={field.label}
                          action={relabelDealLayoutField}
                          hidden={{ key }}
                        />
                        <form action={deleteDealLayoutField}>
                          <input type="hidden" name="dealId" value={dealId} />
                          <input type="hidden" name="line" value={line} />
                          <input type="hidden" name="key" value={key} />
                          <Button type="submit" size="xs" variant="ghost">
                            Delete
                          </Button>
                        </form>
                      </div>
                      <FieldControl
                        field={field}
                        value={values[key] ?? ""}
                        values={values}
                        name={`field_${key}`}
                        form="deal-details-save"
                      />
                      {field.type === "image" ? (
                        <form action={uploadDealFieldImage} className="flex items-center gap-2">
                          <input type="hidden" name="dealId" value={dealId} />
                          <input type="hidden" name="key" value={key} />
                          <input type="file" name="file" accept="image/*" className="text-xs" />
                          <Button type="submit" size="xs" variant="outline">
                            Upload
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
                <AddFieldForm dealId={dealId} line={line} sectionId={section.id} />
              </section>
            ))}
            <form action={addDealLayoutSection}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="line" value={line} />
              <input type="hidden" name="columnId" value={column.id} />
              <div className="flex items-center gap-2">
                <Input name="label" placeholder="Section label" className="h-8" />
                <Button type="submit" size="xs" variant="outline">
                  Add section
                </Button>
              </div>
            </form>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" form="deal-details-save">
          Save deal details
        </Button>
      </div>
    </div>
  );
}

function InlineLabel({
  dealId,
  line,
  name,
  value,
  action,
  hidden,
}: {
  dealId: string;
  line: string;
  name: string;
  value: string;
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button
        type="button"
        className="text-left text-xs font-medium text-navy hover:underline"
        onClick={() => setEditing(true)}
        data-ff-inline-label
      >
        {value}
      </button>
    );
  }
  return (
    <form
      action={async (formData) => {
        await action(formData);
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />
      {Object.entries(hidden).map(([key, val]) => (
        <input key={key} type="hidden" name={key} value={val} />
      ))}
      <Input name={name} defaultValue={value} className="h-7 w-40" autoFocus />
      <Button type="submit" size="xs">
        Save
      </Button>
    </form>
  );
}

function AddFieldForm({ dealId, line, sectionId }: { dealId: string; line: string; sectionId: string }) {
  return (
    <form action={addDealLayoutField} className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <div>
        <label className="text-[11px] text-muted-foreground">New field</label>
        <Input name="label" placeholder="Label" className="mt-0.5 h-8 w-36" />
      </div>
      <div>
        <label className="text-[11px] text-muted-foreground">Type</label>
        <select name="type" className="mt-0.5 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue="single_line">
          {CUSTOM_FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {CUSTOM_FIELD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="xs" variant="outline">
        Add field
      </Button>
    </form>
  );
}
