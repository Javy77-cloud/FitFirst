"use client";

import { useMemo, useState } from "react";
import { addDealLayoutField, addDealLayoutSection, deleteDealLayoutField, deleteDealLayoutSection, relabelDealLayoutField, relabelDealLayoutSection, saveDealFieldLayout } from "@/app/actions/custom-fields";
import { FormulaBuilder } from "@/components/custom-fields/formula-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moveField, moveSection } from "@/lib/custom-fields/layout";
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPE_LABELS,
  type CustomFieldDef,
  type FieldLayout,
} from "@/lib/custom-fields/types";

type DragPayload =
  | { kind: "field"; key: string }
  | { kind: "section"; id: string };

export function FieldBuilder({
  line,
  initialLayout,
  fields,
}: {
  line: string;
  initialLayout: FieldLayout;
  fields: CustomFieldDef[];
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const byKey = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field])), [fields]);

  function onDragStart(payload: DragPayload, event: React.DragEvent) {
    setDrag(payload);
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";
  }

  function dropField(columnId: string, sectionId?: string, beforeKey?: string) {
    if (!drag || drag.kind !== "field") return;
    setLayout((current) => moveField(current, drag.key, { columnId, sectionId, beforeKey }));
    setDrag(null);
  }

  function dropSection(columnId: string, beforeSectionId?: string) {
    if (!drag || drag.kind !== "section") return;
    setLayout((current) => moveSection(current, drag.id, { columnId, beforeSectionId }));
    setDrag(null);
  }

  return (
    <div className="space-y-4" data-ff-field-builder>
      <form action={saveDealFieldLayout}>
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Drag fields between the two columns. This layout applies to every {line} deal.
          </p>
          <Button type="submit" data-ff-save-layout>
            Save layout
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4 max-[699px]:grid-cols-1" data-ff-builder-columns>
        {layout.columns.map((column) => (
          <div
            key={column.id}
            className="min-h-40 space-y-3 rounded-md border border-dashed border-border p-3"
            data-ff-builder-col={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (drag?.kind === "field") dropField(column.id);
              if (drag?.kind === "section") dropSection(column.id);
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {column.id === "left" ? "Left column" : "Right column"}
            </p>
            {column.sections.map((section) => (
              <div
                key={section.id}
                className="ff-card space-y-2 p-3"
                draggable
                onDragStart={(event) => onDragStart({ kind: "section", id: section.id }, event)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.stopPropagation();
                  if (drag?.kind === "section") dropSection(column.id, section.id);
                  if (drag?.kind === "field") dropField(column.id, section.id);
                }}
                data-ff-builder-section={section.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <form action={relabelDealLayoutSection} className="flex min-w-0 flex-1 items-center gap-2">
                    <input type="hidden" name="line" value={line} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Input
                      name="label"
                      defaultValue={section.label}
                      className="h-8"
                      onChange={(event) => {
                        const label = event.target.value;
                        setLayout((current) => ({
                          columns: [
                            {
                              ...current.columns[0],
                              sections: current.columns[0].sections.map((item) =>
                                item.id === section.id ? { ...item, label } : item,
                              ),
                            },
                            {
                              ...current.columns[1],
                              sections: current.columns[1].sections.map((item) =>
                                item.id === section.id ? { ...item, label } : item,
                              ),
                            },
                          ],
                        }));
                      }}
                    />
                    <Button type="submit" size="xs" variant="outline">
                      Relabel
                    </Button>
                  </form>
                  <form action={deleteDealLayoutSection}>
                    <input type="hidden" name="line" value={line} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Button type="submit" size="xs" variant="ghost">
                      Delete
                    </Button>
                  </form>
                </div>
                {section.fieldKeys.map((key) => {
                  const field = byKey[key];
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={(event) => onDragStart({ kind: "field", key }, event)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        dropField(column.id, section.id, key);
                      }}
                      className="flex cursor-grab items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5"
                      data-ff-builder-field={key}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy">{field?.label ?? key}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {field ? CUSTOM_FIELD_TYPE_LABELS[field.type] : key}
                          {field?.type === "formula" && field.formula ? ` · ${field.formula}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {field ? (
                          <form action={relabelDealLayoutField} className="flex items-center gap-1">
                            <input type="hidden" name="line" value={line} />
                            <input type="hidden" name="key" value={key} />
                            <Input name="label" defaultValue={field.label} className="h-7 w-28" />
                            <Button type="submit" size="xs" variant="outline">
                              Relabel
                            </Button>
                          </form>
                        ) : null}
                        <form action={deleteDealLayoutField}>
                          <input type="hidden" name="line" value={line} />
                          <input type="hidden" name="key" value={key} />
                          <Button type="submit" size="xs" variant="ghost">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                  );
                })}
                <AddBuilderField line={line} sectionId={section.id} fields={fields} />
              </div>
            ))}
            <form action={addDealLayoutSection}>
              <input type="hidden" name="line" value={line} />
              <input type="hidden" name="columnId" value={column.id} />
              <div className="flex items-center gap-2">
                <Input name="label" placeholder="New section label" className="h-8" />
                <Button type="submit" size="xs" variant="outline">
                  Add section
                </Button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddBuilderField({
  line,
  sectionId,
  fields,
}: {
  line: string;
  sectionId: string;
  fields: CustomFieldDef[];
}) {
  const [type, setType] = useState<(typeof CUSTOM_FIELD_TYPES)[number]>("single_line");
  return (
    <form action={addDealLayoutField} className="space-y-2 border-t border-border pt-2">
      <input type="hidden" name="line" value={line} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <div className="flex flex-wrap items-end gap-2">
        <Input name="label" placeholder="Field label" className="h-8 w-40" />
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as (typeof CUSTOM_FIELD_TYPES)[number])}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          {CUSTOM_FIELD_TYPES.map((item) => (
            <option key={item} value={item}>
              {CUSTOM_FIELD_TYPE_LABELS[item]}
            </option>
          ))}
        </select>
        <Input name="options" placeholder="Picklist options, comma-separated" className="h-8 w-52" />
        <Button type="submit" size="xs" variant="outline">
          Add field
        </Button>
      </div>
      {type === "formula" ? <FormulaBuilder fields={fields} /> : null}
    </form>
  );
}
