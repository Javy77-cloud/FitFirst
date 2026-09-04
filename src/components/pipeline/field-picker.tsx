"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { saveColumnPrefs } from "@/app/actions/desk-prefs";
import {
  PIPELINE_FIELDS,
  defaultPipelineFieldIds,
  parsePipelineFields,
  type PipelineFieldId,
} from "@/lib/wire/pipeline";

const STORAGE_KEY = "ff_cols_pipeline_fields";

export function PipelineFieldPicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PipelineFieldId[]>(defaultPipelineFieldIds());

  useEffect(() => {
    setSelected(parsePipelineFields(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  useEffect(() => {
    for (const field of PIPELINE_FIELDS) {
      document.querySelectorAll<HTMLElement>(`[data-col="pipeline_fields.${field.id}"]`).forEach((el) => {
        el.style.display = selected.includes(field.id) ? "" : "none";
      });
    }
  }, [selected]);

  const label = useMemo(() => `${selected.length} details`, [selected.length]);

  function toggle(id: PipelineFieldId) {
    const def = PIPELINE_FIELDS.find((field) => field.id === id);
    if (def?.required) return;
    const next = parsePipelineFields(
      (selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]).join(","),
    );
    setSelected(next);
    window.localStorage.setItem(STORAGE_KEY, next.join(","));
    const form = new FormData();
    form.set("tableKey", "pipeline_fields");
    form.set("columns", next.join(","));
    void saveColumnPrefs(form);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-sm text-navy hover:border-primary"
      >
        Columns · {label}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-md border border-border bg-card p-2 shadow">
          <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Deal details on cards and table
          </p>
          {PIPELINE_FIELDS.map((field) => (
            <label key={field.id} className="flex items-center gap-2 px-1 py-1 text-sm text-navy">
              <input
                type="checkbox"
                checked={selected.includes(field.id)}
                disabled={field.required}
                onChange={() => toggle(field.id)}
              />
              {field.label}
              {field.required ? <span className="text-[10px] text-muted-foreground">always on</span> : null}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FieldSlot({
  id,
  children,
  className,
}: {
  id: PipelineFieldId;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-col={`pipeline_fields.${id}`} className={className}>
      {children}
    </div>
  );
}
