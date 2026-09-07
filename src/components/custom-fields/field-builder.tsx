"use client";

import { useMemo, useState } from "react";
import { saveDealFieldLayout } from "@/app/actions/custom-fields";
import { FormulaBuilder } from "@/components/custom-fields/formula-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addSection,
  deleteSection,
  moveField,
  moveSection,
  relabelSection,
  removeFieldFromLayout,
} from "@/lib/custom-fields/layout";
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPE_LABELS,
  slugifyFieldKey,
  type CustomFieldDef,
  type CustomFieldType,
  type FieldLayout,
} from "@/lib/custom-fields/types";

type DragPayload =
  | { kind: "field"; key: string }
  | { kind: "section"; id: string }
  | { kind: "type"; type: CustomFieldType };

type PendingDrop = {
  type: CustomFieldType;
  columnId: string;
  sectionId?: string;
  beforeKey?: string;
};

export function FieldBuilder({
  line,
  initialLayout,
  fields: initialFields,
}: {
  line: string;
  initialLayout: FieldLayout;
  fields: CustomFieldDef[];
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [fields, setFields] = useState(initialFields);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [pending, setPending] = useState<PendingDrop | null>(null);
  const byKey = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field])), [fields]);

  function onDragStart(payload: DragPayload, event: React.DragEvent) {
    setDrag(payload);
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = payload.kind === "type" ? "copy" : "move";
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

  function dropType(columnId: string, sectionId?: string, beforeKey?: string) {
    if (!drag || drag.kind !== "type") return;
    setPending({ type: drag.type, columnId, sectionId, beforeKey });
    setDrag(null);
  }

  function handleDrop(columnId: string, sectionId?: string, beforeKey?: string, beforeSectionId?: string) {
    if (!drag) return;
    if (drag.kind === "type") dropType(columnId, sectionId, beforeKey);
    else if (drag.kind === "field") dropField(columnId, sectionId, beforeKey);
    else dropSection(columnId, beforeSectionId);
  }

  function confirmPending(label: string, extras: { options?: string; formula?: string; lookupModule?: string }) {
    if (!pending || !label.trim()) return;
    let key = slugifyFieldKey(label);
    if (fields.some((field) => field.key === key)) {
      key = `${key}_${Date.now().toString(36).slice(-4)}`;
    }
    const options = (extras.options ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const field: CustomFieldDef = {
      key,
      label: label.trim(),
      type: pending.type,
      options,
      formula: extras.formula?.trim() || null,
      lookupModule: extras.lookupModule?.trim() || null,
    };
    setFields((current) => [...current, field]);
    setLayout((current) => {
      let next = current;
      let sectionId = pending.sectionId;
      if (!sectionId) {
        const column = next.columns.find((col) => col.id === pending.columnId) ?? next.columns[0];
        if (!column.sections.length) {
          next = addSection(next, pending.columnId, "Details");
          sectionId = next.columns.find((col) => col.id === pending.columnId)?.sections.at(-1)?.id;
        } else {
          sectionId = column.sections[0].id;
        }
      }
      return moveField(next, key, {
        columnId: pending.columnId,
        sectionId,
        beforeKey: pending.beforeKey,
      });
    });
    setPending(null);
  }

  function renameField(key: string, label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    setFields((current) => current.map((field) => (field.key === key ? { ...field, label: trimmed } : field)));
  }

  function removeField(key: string) {
    setLayout((current) => removeFieldFromLayout(current, key));
  }

  return (
    <div className="space-y-4" data-ff-field-builder>
      <form action={saveDealFieldLayout}>
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Drag a type onto a column, then name it. Drag fields to reorder. Save applies to every {line} deal.
          </p>
          <Button type="submit" data-ff-save-layout>
            Save
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-[13rem_minmax(0,1fr)] gap-4 max-[899px]:grid-cols-1">
        <aside className="space-y-2" data-ff-builder-palette>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field types</p>
          <div className="space-y-1 rounded-md border border-dashed border-border p-2">
            {CUSTOM_FIELD_TYPES.map((type) => (
              <div
                key={type}
                draggable
                onDragStart={(event) => onDragStart({ kind: "type", type }, event)}
                className="cursor-grab rounded-md border border-border bg-background px-2 py-1.5 text-sm text-navy"
                data-ff-palette-type={type}
              >
                {CUSTOM_FIELD_TYPE_LABELS[type]}
              </div>
            ))}
          </div>
        </aside>

        <div className="grid grid-cols-2 gap-4 max-[699px]:grid-cols-1" data-ff-builder-columns>
          {layout.columns.map((column) => (
            <div
              key={column.id}
              className="min-h-40 space-y-3 rounded-md border border-dashed border-border p-3"
              data-ff-builder-col={column.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.id)}
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
                    handleDrop(column.id, section.id, undefined, section.id);
                  }}
                  data-ff-builder-section={section.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={section.label}
                      aria-label="Section label"
                      className="h-8"
                      onChange={(event) =>
                        setLayout((current) => relabelSection(current, section.id, event.target.value || section.label))
                      }
                      data-ff-section-label={section.id}
                    />
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setLayout((current) => deleteSection(current, section.id))}
                    >
                      Delete
                    </Button>
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
                          handleDrop(column.id, section.id, key);
                        }}
                        className="flex cursor-grab items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5"
                        data-ff-builder-field={key}
                      >
                        <div className="min-w-0 flex-1">
                          <Input
                            value={field?.label ?? key}
                            aria-label="Field label"
                            className="h-7"
                            onChange={(event) => renameField(key, event.target.value)}
                            data-ff-field-label={key}
                          />
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {field ? CUSTOM_FIELD_TYPE_LABELS[field.type] : key}
                            {field?.type === "formula" && field.formula ? ` · ${field.formula}` : ""}
                          </p>
                        </div>
                        <Button type="button" size="xs" variant="ghost" onClick={() => removeField(key)}>
                          Delete
                        </Button>
                      </div>
                    );
                  })}
                  {pending &&
                  pending.columnId === column.id &&
                  (pending.sectionId === section.id || (!pending.sectionId && section.id === column.sections[0]?.id)) ? (
                    <PendingFieldForm
                      type={pending.type}
                      fields={fields}
                      onCancel={() => setPending(null)}
                      onConfirm={confirmPending}
                    />
                  ) : null}
                </div>
              ))}
              {pending && pending.columnId === column.id && !column.sections.length ? (
                <PendingFieldForm
                  type={pending.type}
                  fields={fields}
                  onCancel={() => setPending(null)}
                  onConfirm={confirmPending}
                />
              ) : null}
              <div className="flex items-center gap-2">
                <Input
                  name={`new-section-${column.id}`}
                  placeholder="Section label"
                  className="h-8"
                  data-ff-new-section-label={column.id}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const label = event.currentTarget.value.trim() || "New section";
                    setLayout((current) => addSection(current, column.id, label));
                    event.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  data-ff-add-section={column.id}
                  onClick={(event) => {
                    const input = event.currentTarget.parentElement?.querySelector("input");
                    const label = input instanceof HTMLInputElement && input.value.trim() ? input.value.trim() : "New section";
                    setLayout((current) => addSection(current, column.id, label));
                    if (input instanceof HTMLInputElement) input.value = "";
                  }}
                >
                  Add section
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PendingFieldForm({
  type,
  fields,
  onCancel,
  onConfirm,
}: {
  type: CustomFieldType;
  fields: CustomFieldDef[];
  onCancel: () => void;
  onConfirm: (label: string, extras: { options?: string; formula?: string; lookupModule?: string }) => void;
}) {
  const [label, setLabel] = useState("");
  const [options, setOptions] = useState("");
  const [lookupModule, setLookupModule] = useState("contacts");

  return (
    <form
      className="space-y-2 rounded-md border border-primary/40 bg-background p-2"
      data-ff-pending-field
      onSubmit={(event) => {
        event.preventDefault();
        const formula = String(new FormData(event.currentTarget).get("formula") ?? "");
        onConfirm(label, { options, formula, lookupModule });
      }}
    >
      <p className="text-[11px] text-muted-foreground">New {CUSTOM_FIELD_TYPE_LABELS[type]}</p>
      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Field label"
        className="h-8"
        autoFocus
        aria-label="New field label"
      />
      {type === "picklist" || type === "multi_select" ? (
        <Input
          value={options}
          onChange={(event) => setOptions(event.target.value)}
          placeholder="Options, comma-separated"
          className="h-8"
        />
      ) : null}
      {type === "lookup" ? (
        <Input
          value={lookupModule}
          onChange={(event) => setLookupModule(event.target.value)}
          placeholder="Lookup module"
          className="h-8"
        />
      ) : null}
      {type === "formula" ? <FormulaBuilder fields={fields} /> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="xs">
          Add
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
