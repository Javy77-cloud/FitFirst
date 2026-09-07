"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { saveDealFieldLayout } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { FormulaBuilder } from "@/components/custom-fields/formula-builder";
import { PicklistConfig } from "@/components/custom-fields/picklist-config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSection,
  deleteSection,
  insertIndexFromClientY,
  moveField,
  moveSection,
  relabelSection,
  removeFieldFromLayout,
} from "@/lib/custom-fields/layout";
import { asList } from "@/lib/safe-list";
import type { FieldPicklist } from "@/lib/custom-fields/picklists";
import {
  CUSTOM_FIELD_TYPE_LABELS,
  CUSTOM_FIELD_TYPES,
  FIELD_PERMISSION_ROLES,
  LOOKUP_MODULES,
  PALETTE_ITEMS,
  PALETTE_LABELS,
  defaultFieldPermissions,
  isCustomFieldType,
  parseFieldPermissions,
  parseLayout,
  slugifyFieldKey,
  type CustomFieldDef,
  type CustomFieldType,
  type FieldLayout,
  type FieldPermissionLevel,
  type FieldPermissions,
} from "@/lib/custom-fields/types";

type DragPayload =
  | { kind: "field"; key: string }
  | { kind: "section"; id: string }
  | { kind: "type"; type: CustomFieldType }
  | { kind: "new-section" };

type FieldDialog = { kind: "properties" | "permissions"; key: string } | null;

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
  const [dialog, setDialog] = useState<FieldDialog>(null);
  const [preview, setPreview] = useState(false);
  const byKey = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field])), [fields]);
  const dialogField = dialog ? byKey[dialog.key] : undefined;

  function onDragStart(payload: DragPayload, event: React.DragEvent) {
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
      permissions: defaultFieldPermissions(),
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
    setDialog({ kind: "properties", key });
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
      return { sectionId: beforeSectionId, beforeSectionId };
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
    if (!drag) return;
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
    if (dialog?.key === key) setDialog(null);
  }

  return (
    <div className="space-y-4" data-ff-field-builder data-ff-builder-preview={preview ? "on" : "off"}>
      <form action={saveDealFieldLayout}>
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Compact field types beside Left and Right. Drag a type — including Section — between
            existing fields, including in Preview. Save applies to every deal.
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
        className="grid w-full grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)] items-start gap-3"
        data-ff-builder-lock="three-col"
        data-ff-builder-columns
        data-ff-palette-compact
      >
        <aside className="w-max max-w-[9.5rem] min-w-0 space-y-2" data-ff-builder-palette>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field types</p>
          <div className="space-y-1 rounded-md border border-dashed border-border p-1.5">
            {asList([...PALETTE_ITEMS]).map((type) => (
              <div
                key={type}
                draggable
                onDragStart={(event) =>
                  onDragStart(type === "section" ? { kind: "new-section" } : { kind: "type", type }, event)
                }
                className="flex w-max max-w-full cursor-grab items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-1.5 py-1 text-xs text-navy"
                data-ff-palette-type={type}
                data-ff-palette-chip="compact"
              >
                <FieldTypeIcon type={type} className="size-3.5" />
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
            onDragOver={(event) => event.preventDefault()}
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
                draggable
                onDragStart={(event) => onDragStart({ kind: "section", id: section.id }, event)}
                onDragOver={(event) => event.preventDefault()}
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
                    <BuilderFieldRow
                      key={key}
                      field={field}
                      preview={preview}
                      values={Object.fromEntries(fields.map((item) => [item.key, item.defaultValue ?? ""]))}
                      onDragStart={(event) => onDragStart({ kind: "field", key }, event)}
                      onDrop={(event) => {
                        event.stopPropagation();
                        handleDrop(column.id, section.id, key);
                      }}
                      onRequired={() => patchField(key, { required: !field.required })}
                      onPermissions={() => setDialog({ kind: "permissions", key })}
                      onProperties={() => setDialog({ kind: "properties", key })}
                      onRemove={() => removeField(key)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {dialog?.kind === "properties" && dialogField ? (
        <EditPropertiesDialog
          field={dialogField}
          picklists={picklists}
          fields={fields}
          onClose={() => setDialog(null)}
          onSave={(patch) => {
            if (patch.label) renameField(dialogField.key, patch.label);
            const { label: _label, ...rest } = patch;
            void _label;
            if (Object.keys(rest).length) patchField(dialogField.key, rest);
            setDialog(null);
          }}
        />
      ) : null}

      {dialog?.kind === "permissions" && dialogField ? (
        <SetPermissionsDialog
          field={dialogField}
          onClose={() => setDialog(null)}
          onSave={(permissions) => {
            patchField(dialogField.key, { permissions });
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function BuilderFieldRow({
  field,
  preview,
  values,
  onDragStart,
  onDrop,
  onRequired,
  onPermissions,
  onProperties,
  onRemove,
}: {
  field: CustomFieldDef;
  preview: boolean;
  values: Record<string, string>;
  onDragStart: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onRequired: () => void;
  onPermissions: () => void;
  onProperties: () => void;
  onRemove: () => void;
}) {
  if (preview) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="cursor-grab space-y-1"
        data-ff-builder-field={field.key}
        data-ff-preview-field={field.key}
      >
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
      className="flex cursor-grab items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5"
      data-ff-builder-field={field.key}
      data-ff-field-row="collapsed"
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-navy">
        <FieldTypeIcon type={field.type} />
        <span className="truncate" data-ff-field-label={field.key}>
          {field.label}
        </span>
        {field.required ? <span className="text-destructive">*</span> : null}
      </span>
      <FieldRowMenu
        field={field}
        onRequired={onRequired}
        onPermissions={onPermissions}
        onProperties={onProperties}
        onRemove={onRemove}
      />
    </div>
  );
}

function FieldRowMenu({
  field,
  onRequired,
  onPermissions,
  onProperties,
  onRemove,
}: {
  field: CustomFieldDef;
  onRequired: () => void;
  onPermissions: () => void;
  onProperties: () => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy"
            aria-label={`Field actions for ${field.label}`}
            data-ff-field-menu={field.key}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44" data-ff-field-menu-items={field.key}>
        <DropdownMenuGroup>
          <DropdownMenuItem
            data-ff-field-menu-item="required"
            data-ff-field-required={field.key}
            onClick={onRequired}
          >
            Mark as required
            {field.required ? <span className="ml-auto text-[11px] text-muted-foreground">On</span> : null}
          </DropdownMenuItem>
          <DropdownMenuItem data-ff-field-menu-item="permissions" onClick={onPermissions}>
            Set permissions
          </DropdownMenuItem>
          <DropdownMenuItem data-ff-field-menu-item="properties" onClick={onProperties}>
            Edit properties
          </DropdownMenuItem>
          <DropdownMenuItem data-ff-field-menu-item="remove" variant="destructive" onClick={onRemove}>
            Remove field
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditPropertiesDialog({
  field,
  picklists,
  fields,
  onClose,
  onSave,
}: {
  field: CustomFieldDef;
  picklists: FieldPicklist[];
  fields: CustomFieldDef[];
  onClose: () => void;
  onSave: (patch: Partial<CustomFieldDef>) => void;
}) {
  const [draft, setDraft] = useState<CustomFieldDef>(field);
  const needsOptions = draft.type === "picklist" || draft.type === "multi_select";

  function patchDraft(patch: Partial<CustomFieldDef>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton data-ff-edit-properties={field.key}>
        <DialogHeader>
          <DialogTitle>Edit properties</DialogTitle>
          <DialogDescription>Field name, type, and lookup module. Save returns to the closed row.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor={`prop-label-${field.key}`} className="text-xs">
              Field name
            </Label>
            <Input
              id={`prop-label-${field.key}`}
              value={draft.label}
              className="mt-1 h-8"
              data-ff-field-label-input={field.key}
              onChange={(event) => patchDraft({ label: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`prop-type-${field.key}`} className="text-xs">
              Type
            </Label>
            <select
              id={`prop-type-${field.key}`}
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={draft.type}
              data-ff-field-type={field.key}
              onChange={(event) => {
                const type = event.target.value;
                if (!isCustomFieldType(type)) return;
                patchDraft({
                  type,
                  lookupModule: type === "lookup" ? draft.lookupModule || "contacts" : null,
                  options: type === "picklist" || type === "multi_select" ? draft.options ?? ["", ""] : draft.options,
                  formula: type === "formula" ? draft.formula ?? "" : draft.formula,
                });
              }}
            >
              {CUSTOM_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CUSTOM_FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          {draft.type === "lookup" ? (
            <div>
              <Label htmlFor={`prop-lookup-${field.key}`} className="text-xs">
                Lookup module
              </Label>
              <select
                id={`prop-lookup-${field.key}`}
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={draft.lookupModule ?? "contacts"}
                data-ff-lookup-module={field.key}
                onChange={(event) => patchDraft({ lookupModule: event.target.value })}
              >
                {LOOKUP_MODULES.map((module) => (
                  <option key={module.value} value={module.value}>
                    {module.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {draft.type !== "formula" && draft.type !== "image" && draft.type !== "checkbox" ? (
            <label className="block text-[11px] text-muted-foreground">
              Default value
              <DefaultValueInput field={draft} onPatch={patchDraft} />
            </label>
          ) : draft.type === "checkbox" ? (
            <label className="flex items-center gap-1 text-[11px] text-navy">
              <input
                type="checkbox"
                checked={draft.defaultValue === "true"}
                onChange={(event) => patchDraft({ defaultValue: event.target.checked ? "true" : "" })}
                data-ff-field-default={field.key}
              />
              Default checked
            </label>
          ) : null}
          {needsOptions ? <PicklistConfig field={draft} lists={picklists} onChange={patchDraft} /> : null}
          {draft.type === "formula" ? (
            <FormulaBuilder
              fields={fields}
              defaultValue={draft.formula ?? ""}
              onChange={(formula) => patchDraft({ formula })}
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" data-ff-save-properties={field.key} onClick={() => onSave(draft)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetPermissionsDialog({
  field,
  onClose,
  onSave,
}: {
  field: CustomFieldDef;
  onClose: () => void;
  onSave: (permissions: FieldPermissions) => void;
}) {
  const [permissions, setPermissions] = useState(() => parseFieldPermissions(field.permissions));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton data-ff-set-permissions={field.key}>
        <DialogHeader>
          <DialogTitle>Set permissions</DialogTitle>
          <DialogDescription>Who can see or edit {field.label} on a deal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {FIELD_PERMISSION_ROLES.map((role) => (
            <div key={role}>
              <Label htmlFor={`perm-${field.key}-${role}`} className="text-xs capitalize">
                {role}
              </Label>
              <select
                id={`perm-${field.key}-${role}`}
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={permissions[role]}
                data-ff-field-permission={role}
                onChange={(event) =>
                  setPermissions((current) => ({
                    ...current,
                    [role]: event.target.value as FieldPermissionLevel,
                  }))
                }
              >
                <option value="write">Can edit</option>
                <option value="read">Read only</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" data-ff-save-permissions={field.key} onClick={() => onSave(permissions)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
