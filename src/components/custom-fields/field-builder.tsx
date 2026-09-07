"use client";

import { useMemo, useState } from "react";
import { saveDealFieldLayout } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { FormulaBuilder } from "@/components/custom-fields/formula-builder";
import { PicklistConfig } from "@/components/custom-fields/picklist-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addSection,
  deleteSection,
  insertFieldAfter,
  insertIndexFromClientY,
  moveField,
  moveSection,
  relabelSection,
  removeFieldFromLayout,
} from "@/lib/custom-fields/layout";
import { asList } from "@/lib/safe-list";
import { cloneFieldDef, type FieldPicklist } from "@/lib/custom-fields/picklists";
import {
  CUSTOM_FIELD_TYPE_LABELS,
  PALETTE_ITEMS,
  PALETTE_LABELS,
  parseLayout,
  slugifyFieldKey,
  type CustomFieldDef,
  type CustomFieldType,
  type FieldLayout,
} from "@/lib/custom-fields/types";

type DragPayload =
  | { kind: "field"; key: string }
  | { kind: "section"; id: string }
  | { kind: "type"; type: CustomFieldType }
  | { kind: "new-section" };

export function FieldBuilder({
  line,
  initialLayout,
  fields: initialFields,
  picklists = [],
}: {
  line: string;
  initialLayout: FieldLayout;
  fields: CustomFieldDef[];
  picklists?: FieldPicklist[];
}) {
  const [layout, setLayout] = useState(() => parseLayout(initialLayout));
  const [fields, setFields] = useState(() => asList(initialFields));
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [configKey, setConfigKey] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const byKey = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field])), [fields]);

  function onDragStart(payload: DragPayload, event: React.DragEvent) {
    if (preview) return;
    setDrag(payload);
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = payload.kind === "type" || payload.kind === "new-section" ? "copy" : "move";
  }

  function placeNewField(type: CustomFieldType, columnId: string, sectionId?: string, beforeKey?: string) {
    const baseLabel = CUSTOM_FIELD_TYPE_LABELS[type];
    let key = slugifyFieldKey(baseLabel);
    if (fields.some((field) => field.key === key)) {
      key = `${key}_${Date.now().toString(36).slice(-4)}`;
    }
    const field: CustomFieldDef = {
      key,
      label: baseLabel,
      type,
      options: type === "picklist" || type === "multi_select" ? ["", ""] : [],
      formula: type === "formula" ? "" : null,
      lookupModule: type === "lookup" ? "contacts" : null,
      required: false,
      defaultValue: "",
      picklistId: null,
    };
    setFields((current) => [...current, field]);
    setLayout((current) => {
      let next = current;
      let targetSection = sectionId;
      if (!targetSection) {
        const column = next.columns.find((col) => col.id === columnId) ?? next.columns[0];
        if (!column.sections.length) {
          next = addSection(next, columnId, "Details");
          targetSection = next.columns.find((col) => col.id === columnId)?.sections.at(-1)?.id;
        } else {
          targetSection = column.sections[0].id;
        }
      }
      return moveField(next, key, { columnId, sectionId: targetSection, beforeKey });
    });
    if (type === "picklist" || type === "multi_select") setConfigKey(key);
  }

  function dropPointFromEvent(
    event: React.DragEvent,
    columnId: string,
  ): { sectionId?: string; beforeKey?: string; beforeSectionId?: string } {
    void columnId;
    const column = event.currentTarget as HTMLElement;
    const sectionEls = [...column.querySelectorAll<HTMLElement>("[data-ff-builder-section]")];
    const fieldEls = [...column.querySelectorAll<HTMLElement>("[data-ff-builder-field]")];
    const y = event.clientY;
    const beforeField = insertIndexFromClientY(
      y,
      fieldEls.map((el) => ({
        key: el.getAttribute("data-ff-builder-field") ?? "",
        top: el.getBoundingClientRect().top,
        height: el.getBoundingClientRect().height,
      })),
    ).beforeKey;
    if (beforeField) {
      const host = fieldEls.find((el) => el.getAttribute("data-ff-builder-field") === beforeField);
      const sectionId = host?.closest("[data-ff-builder-section]")?.getAttribute("data-ff-builder-section") ?? undefined;
      return { sectionId, beforeKey: beforeField };
    }
    const beforeSectionId = insertIndexFromClientY(
      y,
      sectionEls.map((el) => ({
        key: el.getAttribute("data-ff-builder-section") ?? "",
        top: el.getBoundingClientRect().top,
        height: el.getBoundingClientRect().height,
      })),
    ).beforeKey;
    if (beforeSectionId) {
      return { columnId, sectionId: beforeSectionId, beforeSectionId };
    }
    const lastSection = sectionEls.at(-1)?.getAttribute("data-ff-builder-section") ?? undefined;
    return { sectionId: lastSection, beforeSectionId: undefined };
  }

  function handleDrop(
    columnId: string,
    sectionId?: string,
    beforeKey?: string,
    beforeSectionId?: string,
    event?: React.DragEvent,
  ) {
    if (!drag || preview) return;
    let target = { sectionId, beforeKey, beforeSectionId };
    if (event && !beforeKey && !sectionId) {
      target = { ...target, ...dropPointFromEvent(event, columnId) };
    }
    if (drag.kind === "new-section") {
      setLayout((current) => {
        const next = addSection(current, columnId, "New section");
        const added = next.columns.find((col) => col.id === columnId)?.sections.at(-1);
        if (!added || !target.beforeSectionId) return next;
        return moveSection(next, added.id, { columnId, beforeSectionId: target.beforeSectionId });
      });
    } else if (drag.kind === "type") {
      placeNewField(drag.type, columnId, target.sectionId, target.beforeKey);
    } else if (drag.kind === "field") {
      setLayout((current) =>
        moveField(current, drag.key, { columnId, sectionId: target.sectionId, beforeKey: target.beforeKey }),
      );
    } else {
      setLayout((current) => moveSection(current, drag.id, { columnId, beforeSectionId: target.beforeSectionId }));
    }
    setDrag(null);
  }

  function patchField(key: string, patch: Partial<CustomFieldDef>) {
    setFields((current) => current.map((field) => (field.key === key ? { ...field, ...patch } : field)));
  }

  function renameField(key: string, label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    patchField(key, { label: trimmed });
  }

  function removeField(key: string) {
    setLayout((current) => removeFieldFromLayout(current, key));
    if (configKey === key) setConfigKey(null);
  }

  function duplicateField(key: string) {
    const field = byKey[key];
    if (!field) return;
    const copy = cloneFieldDef(
      field,
      fields.map((item) => item.key),
    );
    setFields((current) => [...current, copy]);
    setLayout((current) => insertFieldAfter(current, key, copy.key));
  }

  return (
    <div className="space-y-4" data-ff-field-builder data-ff-builder-preview={preview ? "on" : "off"}>
      <form action={saveDealFieldLayout}>
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Three locked columns: field types, left canvas, right canvas. Drag a type — including
            Section — onto a column. Save applies to every deal.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={preview ? "default" : "outline"}
              data-ff-preview-toggle
              onClick={() => setPreview((current) => !current)}
            >
              {preview ? "Exit preview" : "Preview"}
            </Button>
            <Button type="submit" data-ff-save-layout>
              Save
            </Button>
          </div>
        </div>
      </form>

      <div
        className="grid w-full grid-cols-3 items-start gap-4"
        data-ff-builder-lock="three-col"
        data-ff-builder-columns
      >
        <aside className="min-w-0 w-full space-y-2" data-ff-builder-palette>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field types</p>
          <div className="space-y-1 rounded-md border border-dashed border-border p-2">
            {asList([...PALETTE_ITEMS]).map((type) => (
              <div
                key={type}
                draggable={!preview}
                onDragStart={(event) =>
                  onDragStart(type === "section" ? { kind: "new-section" } : { kind: "type", type }, event)
                }
                className="flex w-full cursor-grab items-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-2 py-1.5 text-sm text-navy"
                data-ff-palette-type={type}
              >
                <FieldTypeIcon type={type} />
                {PALETTE_LABELS[type]}
              </div>
            ))}
          </div>
        </aside>

        {asList(layout.columns).map((column) => (
          <div
            key={column.id}
            className="min-h-40 min-w-0 space-y-3 rounded-md border border-dashed border-border p-3"
            data-ff-builder-col={column.id}
            onDragOver={(event) => {
              if (!preview) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(column.id, undefined, undefined, undefined, event);
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {column.id === "left" ? "Left column" : "Right column"}
            </p>
            {asList(column.sections).map((section) => (
              <div
                key={section.id}
                className="ff-card space-y-2 p-3"
                draggable={!preview}
                onDragStart={(event) => onDragStart({ kind: "section", id: section.id }, event)}
                onDragOver={(event) => {
                  if (!preview) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.stopPropagation();
                  handleDrop(column.id, section.id, undefined, section.id);
                }}
                data-ff-builder-section={section.id}
              >
                {preview ? (
                  <h3 className="text-xs font-medium text-navy">{section.label}</h3>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FieldTypeIcon type="section" />
                      <Input
                        value={section.label}
                        aria-label="Section label"
                        className="h-8"
                        onChange={(event) =>
                          setLayout((current) => relabelSection(current, section.id, event.target.value || section.label))
                        }
                        data-ff-section-label={section.id}
                      />
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setLayout((current) => deleteSection(current, section.id))}
                    >
                      Delete
                    </Button>
                  </div>
                )}
                {asList(section.fieldKeys).map((key) => {
                  const field = byKey[key];
                  if (!field) return null;
                  return (
                    <BuilderFieldCard
                      key={key}
                      field={field}
                      preview={preview}
                      configuring={configKey === key}
                      picklists={picklists}
                      fields={fields}
                      values={Object.fromEntries(fields.map((item) => [item.key, item.defaultValue ?? ""]))}
                      onDragStart={(event) => onDragStart({ kind: "field", key }, event)}
                      onDrop={(event) => {
                        event.stopPropagation();
                        handleDrop(column.id, section.id, key);
                      }}
                      onRename={(label) => renameField(key, label)}
                      onPatch={(patch) => patchField(key, patch)}
                      onDuplicate={() => duplicateField(key)}
                      onRemove={() => removeField(key)}
                      onToggleConfig={() => setConfigKey((current) => (current === key ? null : key))}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BuilderFieldCard({
  field,
  preview,
  configuring,
  picklists,
  fields,
  values,
  onDragStart,
  onDrop,
  onRename,
  onPatch,
  onDuplicate,
  onRemove,
  onToggleConfig,
}: {
  field: CustomFieldDef;
  preview: boolean;
  configuring: boolean;
  picklists: FieldPicklist[];
  fields: CustomFieldDef[];
  values: Record<string, string>;
  onDragStart: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onRename: (label: string) => void;
  onPatch: (patch: Partial<CustomFieldDef>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleConfig: () => void;
}) {
  const needsOptions = field.type === "picklist" || field.type === "multi_select";

  if (preview) {
    return (
      <div className="space-y-1" data-ff-builder-field={field.key} data-ff-preview-field={field.key}>
        <label className="flex items-center gap-1.5 text-xs font-medium text-navy">
          <FieldTypeIcon type={field.type} />
          {field.label}
          {field.required ? <span className="text-destructive">*</span> : null}
        </label>
        <FieldControl field={field} value={field.defaultValue ?? ""} values={values} name={`preview_${field.key}`} />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="cursor-grab space-y-2 rounded-md border border-border bg-background px-2 py-2"
      data-ff-builder-field={field.key}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <FieldTypeIcon type={field.type} />
            <Input
              value={field.label}
              aria-label="Field label"
              className="h-7"
              onChange={(event) => onRename(event.target.value)}
              data-ff-field-label={field.key}
            />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <FieldTypeIcon type={field.type} className="size-3" />
            {CUSTOM_FIELD_TYPE_LABELS[field.type]}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <label className="flex items-center gap-1 text-[11px] text-navy">
            <input
              type="checkbox"
              checked={Boolean(field.required)}
              onChange={(event) => onPatch({ required: event.target.checked })}
              data-ff-field-required={field.key}
            />
            Required
          </label>
          <Button type="button" size="xs" variant="ghost" data-ff-duplicate-field={field.key} onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button type="button" size="xs" variant="ghost" onClick={onRemove}>
            Delete
          </Button>
        </div>
      </div>
      <FieldControl field={field} value={field.defaultValue ?? ""} values={values} name={`canvas_${field.key}`} />
      {field.type !== "formula" && field.type !== "image" && field.type !== "checkbox" ? (
        <label className="block text-[11px] text-muted-foreground">
          Default value
          <DefaultValueInput field={field} onPatch={onPatch} />
        </label>
      ) : field.type === "checkbox" ? (
        <label className="flex items-center gap-1 text-[11px] text-navy">
          <input
            type="checkbox"
            checked={field.defaultValue === "true"}
            onChange={(event) => onPatch({ defaultValue: event.target.checked ? "true" : "" })}
            data-ff-field-default={field.key}
          />
          Default checked
        </label>
      ) : null}
      {needsOptions ? (
        <Button type="button" size="xs" variant="outline" onClick={onToggleConfig} data-ff-configure-options={field.key}>
          {configuring ? "Hide options" : "Configure options"}
        </Button>
      ) : null}
      {configuring && needsOptions ? <PicklistConfig field={field} lists={picklists} onChange={onPatch} /> : null}
      {field.type === "formula" ? (
        <FormulaBuilder
          fields={fields}
          defaultValue={field.formula ?? ""}
          onChange={(formula) => onPatch({ formula })}
        />
      ) : null}
    </div>
  );
}

function DefaultValueInput({
  field,
  onPatch,
}: {
  field: CustomFieldDef;
  onPatch: (patch: Partial<CustomFieldDef>) => void;
}) {
  if (field.type === "picklist") {
    return (
      <select
        className="mt-0.5 h-7 w-full rounded-md border border-border bg-background px-2 text-sm"
        value={field.defaultValue ?? ""}
        data-ff-field-default={field.key}
        onChange={(event) => onPatch({ defaultValue: event.target.value })}
      >
        <option value="">None</option>
        {(field.options ?? []).filter(Boolean).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      value={field.defaultValue ?? ""}
      className="mt-0.5 h-7"
      placeholder={field.type === "single_line" ? "e.g. Florida" : "Default"}
      data-ff-field-default={field.key}
      onChange={(event) => onPatch({ defaultValue: event.target.value })}
    />
  );
}
