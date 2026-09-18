"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateContactField } from "@/app/actions/contacts-ops";
import { updateAccountField } from "@/app/actions/businesses-ops";
import type { FieldLayoutModule } from "@/lib/custom-fields/modules";
import { FieldControl } from "@/components/custom-fields/field-control";
import { formatCurrencyDisplay } from "@/lib/custom-fields/format";
import { evaluateFormula, formatFormulaValue } from "@/lib/custom-fields/formula";
import { resolvedFieldValue } from "@/lib/custom-fields/picklists";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { formatPhoneStandard } from "@/lib/phone/format";
import { formatDobMdy, parseDobToIso } from "@/lib/contacts/dob-sync";
import { formatDisplayDate } from "@/lib/dates/display-format";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";
import type { PipelineFamily } from "@/lib/deals/insurance-cascade";
import type { DeskLineSettings } from "@/lib/desk/line-settings";

async function persistRecordField(module: FieldLayoutModule, recordId: string, fieldKey: string, value: string) {
  if (module === "businesses") {
    return updateAccountField({ accountId: recordId, fieldKey, value });
  }
  return updateContactField({ contactId: recordId, fieldKey, value });
}

function displayText(field: CustomFieldDef, raw: string, values: Record<string, string>): string {
  const value = resolvedFieldValue(field, raw);
  if (field.type === "formula") {
    const result = evaluateFormula(field.formula ?? "", values);
    return result.ok ? formatFormulaValue(result.value) : result.error;
  }
  if (field.type === "checkbox") {
    return value === "true" || value === "on" ? "Yes" : "—";
  }
  if (field.type === "currency") {
    const formatted = formatCurrencyDisplay(value);
    return formatted ? `$${formatted}` : "—";
  }
  if (field.type === "percentage") {
    const t = value.trim();
    return t ? `${t}%` : "—";
  }
  if (field.type === "phone") {
    const formatted = formatPhoneStandard(value) || value.trim();
    return formatted || "—";
  }
  if (field.type === "dob") {
    return formatDobMdy(value);
  }
  if (field.type === "date") {
    return formatDisplayDate(value);
  }
  if (field.type === "multi_select") {
    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  if (field.type === "image") {
    return value.trim() ? "Image on file" : "—";
  }
  return value.trim() || "—";
}

function readControlValue(root: HTMLElement, field: CustomFieldDef, name: string): string {
  if (field.type === "checkbox") {
    const cb = root.querySelector<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`);
    return cb?.checked ? "true" : "";
  }
  if (field.type === "multi_select") {
    const hiddens = root.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
    return Array.from(hiddens)
      .map((el) => el.value)
      .filter(Boolean)
      .join(",");
  }
  if (field.type === "currency") {
    const hidden = root.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
    if (hidden) return hidden.value;
  }
  const el = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    `[name="${name}"]`,
  );
  if (!el) return "";
  return el.value ?? "";
}

const ALWAYS_DISPLAY = new Set(["formula", "image"]);

export function ClickToEditField({
  field,
  value,
  values,
  name,
  recordId,
  module = "contacts",
  pipelineFamily = "pc",
  quotingForm,
  policySubType,
  lifeHealthOptions = [],
  lifeOptions = [],
  healthOptions = [],
  lineSettings,
  variant = "default",
  onValueChange,
}: {
  field: CustomFieldDef;
  value: string;
  values: Record<string, string>;
  name: string;
  recordId: string;
  module?: FieldLayoutModule;
  pipelineFamily?: PipelineFamily;
  quotingForm?: string | null;
  policySubType?: string | null;
  lifeHealthOptions?: Array<{ slug?: string; label: string }>;
  lifeOptions?: Array<{ slug?: string; label: string }>;
  healthOptions?: Array<{ slug?: string; label: string }>;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  variant?: "default" | "contact";
  onValueChange?: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(value);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    setSaved(value);
  }, [value]);

  useEffect(() => {
    if (!editing) return;
    const root = rootRef.current;
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>(
      "input:not([type='hidden']), select, textarea, [role='button'][tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
  }, [editing]);

  function persist(nextRaw?: string) {
    if (cancelRef.current) {
      cancelRef.current = false;
      setEditing(false);
      return;
    }
    if (savingRef.current) return;
    const root = rootRef.current;
    const next = nextRaw !== undefined ? nextRaw : root ? readControlValue(root, field, name) : saved;
    const normalizedNext =
      field.type === "phone"
        ? formatPhoneStandard(next) || next
        : field.type === "dob"
          ? parseDobToIso(next) || next.trim()
          : next;
    const normalizedSaved =
      field.type === "phone" ? formatPhoneStandard(saved) || saved : saved;
    if (normalizedNext.trim() === normalizedSaved.trim()) {
      setEditing(false);
      return;
    }
    savingRef.current = true;
    startTransition(async () => {
      const result = await persistRecordField(module, recordId, field.key, normalizedNext);
      savingRef.current = false;
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setEditing(false);
        return;
      }
      setSaved(normalizedNext);
      onValueChange?.(normalizedNext);
      flashAction("Saved");
      setEditing(false);
    });
  }

  if (ALWAYS_DISPLAY.has(field.type)) {
    return (
      <div data-ff-click-to-edit={field.key} data-ff-click-to-edit-mode="readonly">
        <FieldControl
          field={field}
          value={saved}
          values={values}
          name={name}
          disabled
        />
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          variant === "contact"
            ? "flex min-h-[1.75rem] w-full items-center rounded-sm px-1 text-left text-sm hover:bg-muted/60"
            : "mt-1 flex min-h-8 w-full items-center rounded px-1.5 text-left text-sm hover:bg-muted",
          pending && "opacity-60",
          displayText(field, saved, values) === "—"
            ? "text-muted-foreground"
            : "text-[#002868]",
        )}
        onClick={() => setEditing(true)}
        data-ff-click-to-edit={field.key}
        data-ff-click-to-edit-mode="display"
        aria-label={`Edit ${field.label}`}
      >
        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
          {displayText(field, saved, values)}
        </span>
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", pending && "opacity-60")}
      data-ff-click-to-edit={field.key}
      data-ff-click-to-edit-mode="edit"
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        // Multi-select menu portals to body — don't save while it's open.
        if (document.querySelector(`[data-ff-multi-menu="${field.key}"]`)) return;
        // Address suggestions stay in-tree; ignore if focus moved there.
        if (document.querySelector(`[data-ff-address-suggestions]`)) {
          const box = rootRef.current?.querySelector("[data-ff-address-suggestions]");
          if (box && next && box.contains(next)) return;
        }
        // Picklist / checkbox: change handler may already be saving.
        window.setTimeout(() => {
          if (document.querySelector(`[data-ff-multi-menu="${field.key}"]`)) return;
          if (!rootRef.current) return;
          persist();
        }, 0);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelRef.current = true;
          setEditing(false);
          (event.target as HTMLElement).blur?.();
          return;
        }
        if (event.key === "Enter") {
          const target = event.target as HTMLElement;
          if (target.tagName === "TEXTAREA") return;
          if (target.tagName === "SELECT") return;
          if (target.getAttribute("role") === "button") return;
          event.preventDefault();
          (target as HTMLInputElement).blur?.();
        }
      }}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "SELECT") {
          persist((target as HTMLSelectElement).value);
          return;
        }
        if (target instanceof HTMLInputElement && target.type === "checkbox") {
          persist(target.checked ? "true" : "");
        }
      }}
    >
      <FieldControl
        field={field}
        value={saved}
        values={{ ...values, [field.key]: saved }}
        name={name}
        pipelineFamily={pipelineFamily}
        quotingForm={quotingForm}
        policySubType={policySubType}
        lifeHealthOptions={lifeHealthOptions}
        lifeOptions={lifeOptions}
        healthOptions={healthOptions}
        lineSettings={lineSettings}
        onMultiSelectChange={(joined) => {
          // Keep editing open while picking; persist each change so blur isn't required.
          const previous = saved;
          setSaved(joined);
          onValueChange?.(joined);
          if (savingRef.current) return;
          savingRef.current = true;
          startTransition(async () => {
            const result = await persistRecordField(module, recordId, field.key, joined);
            savingRef.current = false;
            if (!result.ok) {
              flashAction(result.error ?? "Could Not Save", "error");
              setSaved(previous);
              onValueChange?.(previous);
              return;
            }
            flashAction("Saved");
          });
        }}
      />
    </div>
  );
}
