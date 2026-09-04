"use client";

import { useEffect, useState, type ReactNode } from "react";
import { saveColumnPrefs } from "@/app/actions/desk-prefs";
import {
  PIPELINE_FIELDS,
  defaultPipelineFieldIds,
  parsePipelineFields,
  type PipelineFieldId,
} from "@/lib/wire/pipeline";

const STORAGE_KEY = "ff_cols_pipeline_fields";

const HIDE_CSS = PIPELINE_FIELDS.filter((field) => !field.required)
  .map(
    (field) =>
      `[data-ff-pipe]:has([data-pipe-field="${field.id}"]:not(:checked)) [data-col="pipeline_fields.${field.id}"]{display:none !important}`,
  )
  .join("");

export function PipelineFieldPicker() {
  const [selected, setSelected] = useState<PipelineFieldId[]>(defaultPipelineFieldIds());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSelected(parsePipelineFields(window.localStorage.getItem(STORAGE_KEY)));
    setReady(true);
  }, []);

  function persistFromForm(form: HTMLFormElement) {
    const boxes = form.querySelectorAll<HTMLInputElement>("[data-pipe-field]");
    const ids = Array.from(boxes)
      .filter((box) => box.checked)
      .map((box) => box.dataset.pipeField)
      .filter(Boolean) as PipelineFieldId[];
    const next = parsePipelineFields(ids.join(","));
    setSelected(next);
    window.localStorage.setItem(STORAGE_KEY, next.join(","));
    const payload = new FormData();
    payload.set("tableKey", "pipeline_fields");
    payload.set("columns", next.join(","));
    void saveColumnPrefs(payload);
  }

  return (
    <>
      <style>{HIDE_CSS}</style>
      <details className="relative z-20" data-testid="pipeline-field-picker">
        <summary className="cursor-pointer list-none rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-navy hover:border-primary">
          Deal details · {selected.length} of {PIPELINE_FIELDS.length} on
        </summary>
        <form
          key={ready ? selected.join(",") : "defaults"}
          className="absolute right-0 z-40 mt-1 w-72 rounded-md border border-border bg-card p-2 shadow-md"
          onChange={(event) => persistFromForm(event.currentTarget)}
        >
          <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Show or hide fields on cards and the table
          </p>
          {PIPELINE_FIELDS.map((field) => (
            <label
              key={field.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm text-navy hover:bg-muted"
            >
              <input
                type="checkbox"
                data-pipe-field={field.id}
                defaultChecked={selected.includes(field.id)}
                disabled={field.required}
              />
              {field.label}
              {field.required ? <span className="text-[10px] text-muted-foreground">always on</span> : null}
            </label>
          ))}
        </form>
      </details>
    </>
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
