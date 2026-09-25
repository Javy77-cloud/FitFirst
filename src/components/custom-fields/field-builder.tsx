"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { saveDealFieldLayout } from "@/app/actions/custom-fields";
import {
  fieldLayoutModuleLabel,
  type FieldLayoutModule,
} from "@/lib/custom-fields/modules";
import { FieldControl } from "@/components/custom-fields/field-control";
import { FieldTypeIcon } from "@/components/custom-fields/field-type-icon";
import { FormulaBuilder } from "@/components/custom-fields/formula-builder";
import { LayoutSectionFieldGrid } from "@/components/custom-fields/layout-section-field-grid";
import { LayoutSectionHeader } from "@/components/custom-fields/layout-section-header";
import { SectionDensityControl } from "@/components/custom-fields/section-density-control";
import { PicklistConfig } from "@/components/custom-fields/picklist-config";
import { ListOptionInput } from "@/components/settings/list-option-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  duplicateSection,
  insertFieldAfter,
  relabelSection,
  removeFieldFromLayout,
  removeFieldOccurrence,
  layoutContainsFieldKey,
  columnIdFromHitStack,
  resolveFieldDrop,
  resolveSectionDrop,
  setSectionDensity,
  type FieldDropSectionHit,
  type FieldDropTarget,
} from "@/lib/custom-fields/layout";
import { asList } from "@/lib/safe-list";
import { humanizeFieldKey, resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import {
  cloneFieldDef,
  sanitizePicklistOptions,
  type FieldPicklist,
  type GlobalListOptionSet,
} from "@/lib/custom-fields/picklists";
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
import {
  canonicalizeSellingAgencyLayout,
  DEAL_SELLING_AGENCY_FIELD,
  DEAL_SELLING_AGENCY_KEY,
  isSellingAgencyLabel,
  sellingAgencyKeyForNewField,
} from "@/lib/deals/selling-agency";
import {
  isDealDetailsLandlordFieldKey,
  layoutWithoutDealDetailsLandlord,
} from "@/lib/custom-fields/deal-details-landlord";
import {
  LIVED_AT_ADDRESS_5_YEARS_KEY,
  isPreviousAddressFieldKey,
  shouldShowPreviousAddressFields,
} from "@/lib/custom-fields/mailing-same";
import {
  isIndustryCascadeParent,
  occupationValueAfterIndustryChange,
} from "@/lib/custom-fields/industry-occupation";

function editorLayout(module: FieldLayoutModule, layout: FieldLayout): FieldLayout {
  const parsed = parseLayout(layout);
  return module === "deals" ? layoutWithoutDealDetailsLandlord(parsed) : parsed;
}

type DragPayload =
  | { kind: "field"; key: string }
  | { kind: "section"; id: string }
  | { kind: "type"; type: CustomFieldType }
  | { kind: "new-section" };

type DropHint = FieldDropTarget & {
  columnId: string;
  beforeSectionId?: string;
};

type FieldDialog = { kind: "properties" | "permissions"; key: string } | null;

function sectionHitsFromColumn(column: HTMLElement): FieldDropSectionHit[] {
  return [...column.querySelectorAll<HTMLElement>("[data-ff-builder-section]")].map((el) => {
    const box = el.getBoundingClientRect();
    return {
      id: el.getAttribute("data-ff-builder-section") ?? "",
      top: box.top,
      height: box.height,
      fields: [...el.querySelectorAll<HTMLElement>("[data-ff-builder-field]")].map((field) => {
        const rect = field.getBoundingClientRect();
        return {
          key: field.getAttribute("data-ff-builder-field") ?? "",
          top: rect.top,
          height: rect.height,
        };
      }),
    };
  });
}

function columnFromEvent(event: React.DragEvent): HTMLElement | null {
  return (event.currentTarget as HTMLElement).closest("[data-ff-builder-col]");
}

function columnElFromPoint(clientX: number, clientY: number): HTMLElement | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  const id = columnIdFromHitStack(stack);
  if (!id) return null;
  return document.querySelector<HTMLElement>(`[data-ff-builder-col="${id}"]`);
}

function hintsEqual(left: DropHint | null, right: DropHint | null) {
  return (
    left?.columnId === right?.columnId &&
    left?.sectionId === right?.sectionId &&
    left?.beforeKey === right?.beforeKey &&
    left?.beforeSectionId === right?.beforeSectionId
  );
}

function clearPaintedHint() {
  document.querySelectorAll("[data-ff-drop-section='1']").forEach((el) => {
    el.removeAttribute("data-ff-drop-section");
    el.classList.remove("ring-2", "ring-sky-400", "ring-offset-2", "ring-offset-background");
  });
  document.querySelectorAll("[data-ff-drop-line]").forEach((el) => el.remove());
  document.querySelector("[data-ff-drag-ghost]")?.remove();
}

function paintDropHint(hint: DropHint | null) {
  document.querySelectorAll("[data-ff-drop-section='1']").forEach((el) => {
    el.removeAttribute("data-ff-drop-section");
    el.classList.remove("ring-2", "ring-sky-400", "ring-offset-2", "ring-offset-background");
  });
  document.querySelectorAll("[data-ff-drop-line]").forEach((el) => el.remove());
  if (!hint?.sectionId) return;
  const section = document.querySelector(`[data-ff-builder-section="${hint.sectionId}"]`);
  if (!section) return;
  section.setAttribute("data-ff-drop-section", "1");
  section.classList.add("ring-2", "ring-sky-400", "ring-offset-2", "ring-offset-background");
  const line = document.createElement("div");
  line.setAttribute("data-ff-drop-line", "");
  line.className = "col-span-full h-0.5 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.2)]";
  if (hint.beforeKey) {
    const field = section.querySelector(`[data-ff-builder-field="${hint.beforeKey}"]`);
    if (field?.parentElement) field.parentElement.insertBefore(line, field);
    else section.appendChild(line);
  } else {
    section.appendChild(line);
  }
}

function paintGhost(label: string, clientX: number, clientY: number) {
  let ghost = document.querySelector<HTMLDivElement>("[data-ff-drag-ghost]");
  if (!ghost) {
    ghost = document.createElement("div");
    ghost.setAttribute("data-ff-drag-ghost", "");
    ghost.className =
      "pointer-events-none fixed z-[80] rounded-md border border-sky-400 bg-background px-2 py-1 text-xs text-navy shadow-md";
    document.body.appendChild(ghost);
  }
  ghost.textContent = label;
  ghost.style.left = `${clientX + 10}px`;
  ghost.style.top = `${clientY + 10}px`;
}

export function FieldBuilder({
  line,
  module = "deals",
  initialLayout,
  fields: initialFields,
  picklists = [],
  globalLists = [],
}: {
  line: string;
  module?: FieldLayoutModule;
  initialLayout: FieldLayout;
  fields: CustomFieldDef[];
  picklists?: FieldPicklist[];
  globalLists?: GlobalListOptionSet[];
}) {
  const moduleLabel = fieldLayoutModuleLabel(module);
  const [layout, setLayout] = useState(() => editorLayout(module, initialLayout));
  const [fields, setFields] = useState(() => asList(initialFields));
  const [liveValues, setLiveValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(asList(initialFields).map((field) => [field.key, field.defaultValue ?? ""])),
  );
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [dialog, setDialog] = useState<FieldDialog>(null);
  const [preview, setPreview] = useState(false);
  const dragRef = useRef<DragPayload | null>(null);
  const dropHintRef = useRef<DropHint | null>(null);
  const pointerListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
    source: HTMLElement | null;
  } | null>(null);
  const layoutSyncKey = `${module}:${line}:${JSON.stringify(initialLayout)}`;
  useEffect(() => {
    const next = editorLayout(module, initialLayout);
    setLayout(next);
    const nextFields = resolveLayoutFields(next, asList(initialFields));
    setFields(nextFields);
    setLiveValues((prev) => {
      const updated = { ...prev };
      for (const field of nextFields) {
        if (updated[field.key] === undefined) updated[field.key] = field.defaultValue ?? "";
      }
      return updated;
    });
    // Sync when Edit Layout opens a different module/line/saved layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by layoutSyncKey
  }, [layoutSyncKey]);
  const byKey = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field])), [fields]);
  const dialogField = dialog ? byKey[dialog.key] : undefined;

  function patchPreviewValue(key: string, next: string) {
    setLiveValues((prev) => {
      const updated: Record<string, string> = { ...prev, [key]: next };
      if (isIndustryCascadeParent(key)) {
        const child = key.replace(/_industry$/, "_occupation");
        updated[child] = occupationValueAfterIndustryChange(next, updated[child]);
      }
      return updated;
    });
  }

  function onDragStart(payload: DragPayload, event: React.DragEvent) {
    event.stopPropagation();
    dragRef.current = payload;
    setDrag(payload);
    setDropHint(null);
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = payload.kind === "type" || payload.kind === "new-section" ? "copy" : "move";
  }

  function detachPointerListeners() {
    const listeners = pointerListenersRef.current;
    if (!listeners) return;
    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.up);
    window.removeEventListener("pointercancel", listeners.up);
    listeners.source?.removeEventListener("pointermove", listeners.move);
    listeners.source?.removeEventListener("pointerup", listeners.up);
    pointerListenersRef.current = null;
    document.body.style.userSelect = "";
  }

  function ghostLabelFor(payload: DragPayload) {
    if (payload.kind === "field") return byKey[payload.key]?.label ?? payload.key;
    if (payload.kind === "type") return CUSTOM_FIELD_TYPE_LABELS[payload.type];
    return "Section";
  }

  function beginPointerDrag(payload: DragPayload, event: React.PointerEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (
      target.closest(
        "input, textarea, select, [data-ff-field-actions], [data-ff-field-menu], [data-ff-field-remove], [data-slot='dropdown-menu-trigger'], [data-slot='dropdown-menu-content'], [data-slot='dropdown-menu-item']",
      ) &&
      !target.closest("[data-ff-field-handle], [data-ff-section-handle]")
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    let armed = false;
    dragRef.current = payload;
    dropHintRef.current = null;
    setDrag(payload);
    setDropHint(null);
    detachPointerListeners();
    document.body.style.userSelect = "none";
    const source = event.currentTarget as HTMLElement;
    try {
      source.setPointerCapture(event.pointerId);
    } catch {
      /* capture is best-effort */
    }
    const move = (moveEvent: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!armed) {
        if (dx * dx + dy * dy < 36) return; // ~6px threshold — clicks are not drops
        armed = true;
      }
      const next = dropHintFromPoint(moveEvent.clientX, moveEvent.clientY, current);
      dropHintRef.current = next;
      paintDropHint(next);
      paintGhost(ghostLabelFor(current), moveEvent.clientX, moveEvent.clientY);
    };
    const up = (upEvent: PointerEvent) => {
      const current = dragRef.current;
      if (!current || !armed) {
        clearPaintedHint();
        detachPointerListeners();
        dragRef.current = null;
        dropHintRef.current = null;
        setDrag(null);
        setDropHint(null);
        return;
      }
      const hint = dropHintFromPoint(upEvent.clientX, upEvent.clientY, current) ?? dropHintRef.current;
      applyLayoutDrop(current, hint);
    };
    pointerListenersRef.current = { move, up, source };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    source.addEventListener("pointermove", move);
    source.addEventListener("pointerup", up);
  }

  function endDrag() {
    detachPointerListeners();
    clearPaintedHint();
    dragRef.current = null;
    dropHintRef.current = null;
    setDrag(null);
    setDropHint(null);
  }

  function placeNewField(type: CustomFieldType, columnId: string, sectionId?: string, beforeKey?: string) {
    const baseLabel = type === "dob" ? "Date of birth" : CUSTOM_FIELD_TYPE_LABELS[type];
    let key = sellingAgencyKeyForNewField({ label: baseLabel }) || slugifyFieldKey(baseLabel);
    if (key !== DEAL_SELLING_AGENCY_KEY && fields.some((field) => field.key === key)) {
      key = `${key}_${Date.now().toString(36).slice(-4)}`;
    }
    const field: CustomFieldDef = {
      key,
      label: baseLabel,
      type: key === DEAL_SELLING_AGENCY_KEY ? "picklist" : type,
      options: type === "picklist" || type === "multi_select" ? ["", ""] : [],
      formula: type === "formula" ? "" : null,
      lookupModule: type === "lookup" ? "contacts" : null,
      required: key === DEAL_SELLING_AGENCY_KEY,
      defaultValue: "",
      picklistId: null,
      globalListKey: key === DEAL_SELLING_AGENCY_KEY ? "selling_agency" : null,
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

  function dropHintFromPoint(clientX: number, clientY: number, payload: DragPayload): DropHint | null {
    const column = columnElFromPoint(clientX, clientY);
    const columnId = column?.getAttribute("data-ff-builder-col") ?? "";
    if (!column || !columnId) return null;
    const hits = sectionHitsFromColumn(column);
    const y = clientY;
    if (!hits.length) {
      return { columnId, beforeKey: insertIndexFromClientY(y, []).beforeKey };
    }
    if (payload.kind === "section" || payload.kind === "new-section") {
      const sectionTarget = resolveSectionDrop(y, hits, {
        draggingId: payload.kind === "section" ? payload.id : undefined,
      });
      return { columnId, ...sectionTarget, sectionId: sectionTarget.beforeSectionId };
    }
    return {
      columnId,
      ...resolveFieldDrop(y, hits, {
        draggingKey: payload.kind === "field" ? payload.key : undefined,
      }),
    };
  }

  function dropPointFromEvent(event: React.DragEvent, columnId: string): DropHint {
    const payload = dragRef.current ?? drag;
    if (!payload) return { columnId };
    return dropHintFromPoint(event.clientX, event.clientY, payload) ?? { columnId };
  }

  function updateDropHint(columnId: string, event: React.DragEvent) {
    const payload = dragRef.current ?? drag;
    if (!payload) return;
    void columnId;
    const next = dropPointFromEvent(event, columnId);
    dropHintRef.current = next;
    setDropHint((current) => (hintsEqual(current, next) ? current : next));
  }

  function applyLayoutDrop(payload: DragPayload, target: DropHint | null) {
    if (!target) {
      endDrag();
      return;
    }
    const { columnId } = target;
    if (payload.kind === "new-section") {
      setLayout((current) => {
        const next = addSection(current, columnId, "New section");
        const added = next.columns.find((col) => col.id === columnId)?.sections.at(-1);
        if (!added || !target.beforeSectionId) return next;
        return moveSection(next, added.id, { columnId, beforeSectionId: target.beforeSectionId });
      });
    } else if (payload.kind === "type") {
      placeNewField(payload.type, columnId, target.sectionId, target.beforeKey);
    } else if (payload.kind === "field") {
      setLayout((current) =>
        moveField(current, payload.key, { columnId, sectionId: target.sectionId, beforeKey: target.beforeKey }),
      );
    } else {
      setLayout((current) => moveSection(current, payload.id, { columnId, beforeSectionId: target.beforeSectionId }));
    }
    endDrag();
  }

  function handleDrop(columnId: string, event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const payload = dragRef.current ?? drag;
    if (!payload) return;
    applyLayoutDrop(payload, dropPointFromEvent(event, columnId));
  }

  useEffect(() => () => detachPointerListeners(), []);

  function patchField(key: string, patch: Partial<CustomFieldDef>) {
    setFields((current) => current.map((field) => (field.key === key ? { ...field, ...patch } : field)));
  }

  function remapLayoutKey(from: string, to: string) {
    setLayout((current) => {
      const replaced = {
        ...current,
        columns: current.columns.map((column) => ({
          ...column,
          sections: column.sections.map((section) => ({
            ...section,
            fieldKeys: section.fieldKeys.map((item) => (item === from ? to : item)),
          })),
        })),
      };
      return canonicalizeSellingAgencyLayout(replaced, [
        ...fields.map((field) => (field.key === from ? { ...field, key: to } : field)),
        DEAL_SELLING_AGENCY_FIELD,
      ]);
    });
  }

  function renameField(key: string, label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (isSellingAgencyLabel(trimmed) && key !== DEAL_SELLING_AGENCY_KEY) {
      setFields((current) => {
        const source = current.find((field) => field.key === key);
        const without = current.filter((field) => field.key !== key && field.key !== DEAL_SELLING_AGENCY_KEY);
        const canonical: CustomFieldDef = {
          ...(source ?? DEAL_SELLING_AGENCY_FIELD),
          ...DEAL_SELLING_AGENCY_FIELD,
          options: source?.options?.length ? source.options : DEAL_SELLING_AGENCY_FIELD.options,
          optionColors: source?.optionColors,
        };
        return [...without, canonical];
      });
      remapLayoutKey(key, DEAL_SELLING_AGENCY_KEY);
      if (dialog?.key === key) setDialog({ kind: "properties", key: DEAL_SELLING_AGENCY_KEY });
      return;
    }
    patchField(key, { label: trimmed });
  }

  function removeField(key: string, sectionId?: string) {
    let nextLayout: FieldLayout | null = null;
    setLayout((current) => {
      nextLayout = sectionId
        ? removeFieldOccurrence(current, sectionId, key)
        : removeFieldFromLayout(current, key);
      return nextLayout;
    });
    // Field catalog stays if another slot still uses the key (duplicate sections).
    if (nextLayout && !layoutContainsFieldKey(nextLayout, key)) {
      setFields((fieldsCurrent) => fieldsCurrent.filter((field) => field.key !== key));
      if (dialog?.key === key) setDialog(null);
    }
  }

  function duplicateField(key: string) {
    const source = fields.find((field) => field.key === key);
    if (!source) return;
    const copy = cloneFieldDef(
      source,
      fields.map((field) => field.key),
    );
    setFields((current) => {
      const at = current.findIndex((field) => field.key === key);
      if (at < 0) return [...current, copy];
      const next = [...current];
      next.splice(at + 1, 0, copy);
      return next;
    });
    setLayout((current) => insertFieldAfter(current, key, copy.key));
  }

  return (
    <div
      className="space-y-4"
      data-ff-field-builder
      data-ff-existing-layout
      data-ff-builder-module={module}
      data-ff-builder-preview={preview ? "on" : "off"}
      data-ff-page-layout
      data-ff-dragging-kind={drag?.kind ?? undefined}
    >
      <form action={saveDealFieldLayout}>
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="module" value={module} />
        <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />
        <div className="flex flex-wrap items-center justify-between gap-2">

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
        <aside className="w-max min-w-0 space-y-2" data-ff-builder-palette data-ff-palette-equal-width>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field types</p>
          <div className="grid w-max grid-cols-1 gap-1 rounded-md border border-dashed border-border p-1.5">
            {asList([...PALETTE_ITEMS]).map((type) => (
              <div
                key={type}
                draggable
                onDragStart={(event) =>
                  onDragStart(type === "section" ? { kind: "new-section" } : { kind: "type", type }, event)
                }
                onPointerDown={(event) =>
                  beginPointerDrag(type === "section" ? { kind: "new-section" } : { kind: "type", type }, event)
                }
                className="flex w-full cursor-grab items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-1.5 py-1 text-xs text-navy"
                data-ff-palette-type={type}
                data-ff-palette-chip="compact"
                data-ff-palette-chip-width="longest"
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
            onDragOver={(event) => {
              event.preventDefault();
              updateDropHint(column.id, event);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDropHint((current) => (current?.columnId === column.id ? null : current));
              }
            }}
            onDrop={(event) => handleDrop(column.id, event)}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {column.id === "left" ? "Left column" : "Right column"}
            </p>
            {(() => {
              const sectionDrag =
                drag?.kind === "section" || drag?.kind === "new-section";
              const insertBeforeSectionId = sectionDrag
                ? (dropHint?.columnId === column.id
                    ? (dropHint.beforeSectionId ?? dropHint.sectionId)
                    : undefined)
                : undefined;
              const appendSection =
                sectionDrag &&
                dropHint?.columnId === column.id &&
                !insertBeforeSectionId;
              return (
                <>
            {asList(column.sections).map((section, sectionIndex) => {
              const sectionActive =
                !sectionDrag &&
                dropHint?.columnId === column.id &&
                dropHint.sectionId === section.id;
              const showSectionInsertLine =
                sectionDrag && insertBeforeSectionId === section.id;
              return (
                <div
                  key={`${column.id}:${section.id}:${sectionIndex}`}
                  className="space-y-2"
                  data-ff-section-slot={section.id}
                >
                  {showSectionInsertLine ? <DropLine /> : null}
                <div
                  className={cn(
                    "ff-card space-y-2 p-3",
                    sectionActive && "ring-2 ring-sky-400 ring-offset-2 ring-offset-background",
                    showSectionInsertLine && "ring-1 ring-sky-300",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    updateDropHint(column.id, event);
                  }}
                  onDrop={(event) => handleDrop(column.id, event)}
                  data-ff-builder-section={section.id}
                  data-ff-drop-section={sectionActive || showSectionInsertLine ? "1" : undefined}
                >
                  {preview ? (
                    <LayoutSectionHeader title={section.label} />
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button
                          type="button"
                          draggable
                          aria-label={`Drag ${section.label} section`}
                          className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy"
                          data-ff-section-handle={section.id}
                          onDragStart={(event) => onDragStart({ kind: "section", id: section.id }, event)}
                          onPointerDown={(event) => beginPointerDrag({ kind: "section", id: section.id }, event)}
                        >
                          <GripVertical className="size-3.5" />
                        </button>
                        <FieldTypeIcon type="section" />
                        <ListOptionInput
                          committedValue={section.label}
                          aria-label="Section label"
                          className="h-8"
                          onCommit={(next) => {
                            setLayout((current) =>
                              relabelSection(current, section.id, next.trim() || "Section"),
                            );
                          }}
                          data-ff-section-label={section.id}
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <SectionDensityControl
                          sectionId={section.id}
                          density={section.density}
                          onChange={(density) =>
                            setLayout((current) => setSectionDensity(current, section.id, density))
                          }
                        />
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          title="Duplicate section"
                          aria-label={`Duplicate ${section.label || "section"}`}
                          onClick={() =>
                            setLayout((current) => duplicateSection(current, section.id))
                          }
                          data-ff-section-duplicate={section.id}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => setLayout((current) => deleteSection(current, section.id))}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                  {asList(section.fieldKeys).length === 0 ? (
                    <div
                      className={cn(
                        "rounded-md border border-dashed px-2 py-4 text-center text-[11px] text-muted-foreground",
                        sectionActive && !dropHint?.beforeKey && "border-sky-400 bg-sky-50 text-sky-700",
                      )}
                      data-ff-section-empty={section.id}
                    >
                      Drop a field here
                    </div>
                  ) : (
                    <LayoutSectionFieldGrid
                      density={section}
                      keys={asList(section.fieldKeys).filter((key) => {
                        if (module === "deals" && isDealDetailsLandlordFieldKey(key)) return false;
                        if (
                          preview &&
                          isPreviousAddressFieldKey(key) &&
                          !shouldShowPreviousAddressFields(liveValues)
                        ) {
                          return false;
                        }
                        return true;
                      })}
                      fieldOf={(key) => byKey[key]}
                      collapse={false}
                      renderField={(key) => {
                        const field = byKey[key] ?? {
                          key,
                          label: humanizeFieldKey(key),
                          type: "single_line" as const,
                        };
                        const showLine = sectionActive && dropHint?.beforeKey === key;
                        return (
                          <div data-ff-builder-field-wrap={key}>
                            {showLine ? <DropLine /> : null}
                            <BuilderFieldRow
                              field={field}
                              preview={preview}
                              dragging={drag?.kind === "field" && drag.key === key}
                              values={liveValues}
                              onValueChange={(next) => patchPreviewValue(key, next)}
                              onDragStart={(event) => onDragStart({ kind: "field", key }, event)}
                              onPointerDown={(event) => beginPointerDrag({ kind: "field", key }, event)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                updateDropHint(column.id, event);
                              }}
                              onDrop={(event) => handleDrop(column.id, event)}
                              onRequired={() => patchField(key, { required: !field.required })}
                              onPermissions={() => setDialog({ kind: "permissions", key })}
                              onProperties={() => setDialog({ kind: "properties", key })}
                              onDuplicate={() => duplicateField(key)}
                              onRemove={() => removeField(key, section.id)}
                            />
                          </div>
                        );
                      }}
                    />
                  )}
                  {/* Field-drop append line stays inside the section; section-drop line is above slots. */}
                  {sectionActive && !dropHint?.beforeKey && asList(section.fieldKeys).length > 0 ? (
                    <DropLine />
                  ) : null}
                </div>
                </div>
              );
            })}
            {appendSection ? <DropLine /> : null}
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {dialog?.kind === "properties" && dialogField ? (
        <EditPropertiesDialog
          field={dialogField}
          picklists={picklists}
          globalLists={globalLists}
          fields={fields}
          onClose={() => setDialog(null)}
          onSave={(patch) => {
            if (patch.label) renameField(dialogField.key, patch.label);
            const { label: _label, ...rest } = patch;
            void _label;
            const targetKey =
              patch.label && isSellingAgencyLabel(patch.label)
                ? DEAL_SELLING_AGENCY_KEY
                : dialogField.key;
            if (Object.keys(rest).length) {
              patchField(targetKey, {
                ...rest,
                ...(targetKey === DEAL_SELLING_AGENCY_KEY
                  ? { required: true, globalListKey: "selling_agency", type: "picklist" }
                  : {}),
              });
            }
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

function DropLine() {
  return (
    <div
      className="col-span-full h-0.5 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.2)]"
      data-ff-drop-line
      aria-hidden
    />
  );
}

function fieldVisibilityHint(fieldKey: string): string | null {
  if (fieldKey === LIVED_AT_ADDRESS_5_YEARS_KEY) {
    return "No reveals previous address";
  }
  if (isPreviousAddressFieldKey(fieldKey)) {
    return "Shown when lived here is No";
  }
  return null;
}

function BuilderFieldRow({
  field,
  preview,
  dragging,
  values,
  onValueChange,
  onDragStart,
  onPointerDown,
  onDragOver,
  onDrop,
  onRequired,
  onPermissions,
  onProperties,
  onDuplicate,
  onRemove,
}: {
  field: CustomFieldDef;
  preview: boolean;
  dragging?: boolean;
  values: Record<string, string>;
  onValueChange?: (value: string) => void;
  onDragStart: (event: React.DragEvent) => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onRequired: () => void;
  onPermissions: () => void;
  onProperties: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const hint = fieldVisibilityHint(field.key);
  if (preview) {
    return (
      <div
        onDragStart={onDragStart}
        onPointerDown={onPointerDown}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn("cursor-grab space-y-1", dragging && "pointer-events-none opacity-40")}
        data-ff-builder-field={field.key}
        data-ff-preview-field={field.key}
        data-ff-dragging={dragging ? "1" : undefined}
      >
        <label className="flex items-center gap-1.5 text-xs font-medium text-navy">
          <FieldTypeIcon type={field.type} />
          {field.label}
          {field.required ? <span className="text-destructive">*</span> : null}
        </label>
        <FieldControl
          field={field}
          value={values[field.key] ?? field.defaultValue ?? ""}
          values={values}
          name={`preview_${field.key}`}
          onValueChange={onValueChange}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5",
        dragging && "pointer-events-none opacity-40",
      )}
      data-ff-builder-field={field.key}
      data-ff-field-row="collapsed"
      data-ff-dragging={dragging ? "1" : undefined}
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-navy">
        <button
          type="button"
          draggable
          aria-label={`Drag ${field.label}`}
          className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy"
          data-ff-field-handle={field.key}
          onDragStart={onDragStart}
          onPointerDown={onPointerDown}
        >
          <GripVertical className="size-3.5" />
        </button>
        <FieldTypeIcon type={field.type} />
        <span className="truncate" data-ff-field-label={field.key}>
          {field.label}
        </span>
        {field.required ? <span className="text-destructive">*</span> : null}
        {hint ? (
          <span
            className="truncate text-[10px] font-medium text-muted-foreground"
            data-ff-field-visibility-hint={field.key}
          >
            {hint}
          </span>
        ) : null}
      </span>
      <div
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <FieldRowMenu
          field={field}
          onRequired={onRequired}
          onPermissions={onPermissions}
          onProperties={onProperties}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

function FieldRowMenu({
  field,
  onRequired,
  onPermissions,
  onProperties,
  onDuplicate,
  onRemove,
}: {
  field: CustomFieldDef;
  onRequired: () => void;
  onPermissions: () => void;
  onProperties: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" data-ff-field-actions={field.key}>
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
        aria-label={`Remove ${field.label}`}
        data-ff-field-remove={field.key}
        title="Remove field"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="size-3.5" />
      </button>
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
            <DropdownMenuItem data-ff-field-menu-item="duplicate" onClick={onDuplicate}>
              Duplicate field
            </DropdownMenuItem>
            <DropdownMenuItem
              data-ff-field-menu-item="remove"
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                onRemove();
              }}
            >
              Remove field
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function EditPropertiesDialog({
  field,
  picklists,
  globalLists,
  fields,
  onClose,
  onSave,
}: {
  field: CustomFieldDef;
  picklists: FieldPicklist[];
  globalLists: GlobalListOptionSet[];
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
      <DialogContent
        className="flex max-h-[min(90vh,42rem)] flex-col overflow-hidden sm:max-w-md"
        showCloseButton
        data-ff-edit-properties={field.key}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit properties</DialogTitle>
          <DialogDescription>Name, type, and lookup.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5" data-ff-edit-properties-body>
          <div>
            <Label htmlFor={`prop-label-${field.key}`} className="text-xs">
              Field name
            </Label>
            <ListOptionInput
              id={`prop-label-${field.key}`}
              committedValue={draft.label}
              className="mt-1 h-8"
              data-ff-field-label-input={field.key}
              onCommit={(label) => patchDraft({ label })}
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
          {needsOptions ? (
            <PicklistConfig field={draft} lists={picklists} globalLists={globalLists} onChange={patchDraft} />
          ) : null}
          {draft.type === "formula" ? (
            <FormulaBuilder
              fields={fields}
              defaultValue={draft.formula ?? ""}
              onChange={(formula) => patchDraft({ formula })}
            />
          ) : null}
        </div>
        <DialogFooter className="shrink-0">
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
          <DialogDescription>Who can see or edit {field.label} on this record.</DialogDescription>
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
        {sanitizePicklistOptions(field.options ?? []).map((option, index) => (
          <option key={`${field.key}:${index}:${option}`} value={option}>
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
