"use client";

import { useMemo, useState, useTransition } from "react";
import { saveModuleRecordValues } from "@/app/actions/custom-fields";
import { CONTACT_DEPENDENT_RELATION_OPTIONS } from "@/lib/contacts/contact-field-catalog";
import type { ContactDependent } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function newRow(): ContactDependent {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `dep-${Date.now()}`,
    name: "",
    dobOrAge: "",
    relation: "Child",
  };
}

function parseDependents(raw: string | null | undefined): ContactDependent[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row, index) => ({
      id: String(row?.id ?? `dep-${index}`),
      name: String(row?.name ?? ""),
      dobOrAge: String(row?.dobOrAge ?? row?.dob_or_age ?? ""),
      relation: String(row?.relation ?? "Child"),
    }));
  } catch {
    return [];
  }
}

export function ContactDependentsEditor({
  recordId,
  value,
  form,
  onChange,
}: {
  recordId?: string;
  value: string;
  form?: string;
  onChange?: (next: string) => void;
}) {
  const initial = useMemo(() => parseDependents(value), [value]);
  const [rows, setRows] = useState<ContactDependent[]>(initial);
  const [pending, start] = useTransition();

  function emit(next: ContactDependent[]) {
    setRows(next);
    const serialized = JSON.stringify(next);
    onChange?.(serialized);
    if (recordId && !form) {
      start(async () => {
        const data = new FormData();
        data.set("module", "contacts");
        data.set("recordId", recordId);
        data.set("field_dependents", serialized);
        await saveModuleRecordValues(data);
      });
    }
  }

  return (
    <div className="col-span-full space-y-2" data-ff-contact-dependents="">

      <input type="hidden" name="field_dependents" form={form} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-2 items-end"
          data-ff-dependent-row={row.id}
        >
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
            Name
            <Input
              value={row.name}
              placeholder="Child name"
              className="h-9"
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, name: e.target.value };
                emit(next);
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
            DOB or age
            <Input
              value={row.dobOrAge}
              placeholder="—"
              className="h-9"
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, dobOrAge: e.target.value };
                emit(next);
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
            Relation
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={row.relation}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, relation: e.target.value };
                emit(next);
              }}
            >
              {CONTACT_DEPENDENT_RELATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-9 shrink-0 px-0"
            aria-label="Remove dependent"
            disabled={pending}
            onClick={() => emit(rows.filter((item) => item.id !== row.id))}
          >
            ×
          </Button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs font-semibold text-primary"
        onClick={() => emit([...rows, newRow()])}
      >
        + Add dependent
      </button>
    </div>
  );
}
